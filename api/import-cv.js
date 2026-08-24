/**
 * POST /api/import-cv — password-protected CV import.
 *
 * Flow:
 *   browser sends { password, files: [{ filename, base64, lang }] }
 *     -> one file per language; supplying both avoids machine translation
 *     -> password is checked in constant time against ADMIN_PASSWORD
 *     -> the document goes to Gemini or Claude for structured extraction
 *     -> the result is committed to GitHub as src/data/cv.json
 *     -> Vercel sees the commit and redeploys, so every visitor gets it
 *
 * Nothing secret ever reaches the browser: the AI key, the GitHub
 * token and the password all live in Vercel environment variables and are
 * only read here, on the server.
 *
 * Required environment variables (Vercel -> Settings -> Environment Variables):
 *   GEMINI_API_KEY      Google AI Studio key (free tier available)
 *                       -- or --
 *   ANTHROPIC_API_KEY   Anthropic key (paid)
 *   ADMIN_PASSWORD      the password you will type in the site
 *   GITHUB_TOKEN        fine-grained token with Contents: Read and write
 *   GITHUB_REPO         e.g. Kalaitzon/Digital-CV
 * Optional:
 *   GITHUB_BRANCH       defaults to "main"
 *   CV_PROVIDER         "gemini" or "anthropic"; otherwise inferred from keys
 *   CV_MODEL            defaults to the provider's standard model
 */

import { timingSafeEqual } from "node:crypto";
import { buildCvJson, findUntranslated } from "../shared/cv-schema.js";
import { describeProviderError, extractCv, pickProvider, readDocument } from "../shared/providers.js";

export const config = {
  /*
   * Five minutes, the Hobby maximum on Vercel's Fluid compute.
   *
   * The old ceiling was 60 seconds, which is what a translated import kept
   * hitting: writing the CV out in two languages takes roughly twice as long
   * as reading it once. Waiting costs nothing here — Fluid bills active CPU
   * time, and time spent waiting on the model is not active CPU.
   */
  maxDuration: 300,
};

/** Leaves enough of the budget to answer before the platform gives up. */
const EXTRACTION_DEADLINE_MS = 280_000;

const CV_JSON_PATH = "src/data/cv.json";
const PDF_PATHS = { en: "public/CV_EN.pdf", el: "public/CV_EL.pdf" };
/** Vercel caps request bodies at ~4.5 MB; base64 inflates by a third. */
const MAX_FILE_BYTES = 3 * 1024 * 1024;

/**
 * Page cap.
 *
 * A guard rail rather than a tight budget: with five minutes to work in,
 * length is rarely the problem. It exists so that a 200-page thesis uploaded
 * by mistake is refused immediately with an explanation, instead of running
 * for minutes and then failing.
 */
const MAX_PAGES = 15;

/**
 * Approximate page count from the raw PDF bytes.
 *
 * Counting `/Type /Page` markers avoids pulling in a PDF parser for what is
 * only a guard rail. It can overcount a little on unusual producers, so the
 * error text says "about" and the cap is set with room to spare.
 */
function countPdfPages(buffer) {
  const text = buffer.toString("latin1");
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 1;
}

/**
 * Per-instance brute-force guard. Serverless instances are short-lived, so
 * this is a speed bump rather than a wall — the constant-time compare and the
 * fixed delay below are what actually make guessing impractical.
 */
const failures = new Map();
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded || "").split(",")[0].trim() || "unknown";
}

/** Compare two strings without leaking their contents through timing. */
function passwordMatches(supplied, expected) {
  const a = Buffer.from(String(supplied));
  const b = Buffer.from(String(expected));
  // timingSafeEqual throws on length mismatch, so equalise first.
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ------------------------------------------------------------------ GitHub

const githubHeaders = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "cv-site-importer",
});

const repoUrl = (path) =>
  `https://api.github.com/repos/${process.env.GITHUB_REPO}/contents/${path}`;

/** Current blob SHA for a file, or null when the file does not exist yet. */
async function fileSha(path, branch) {
  const response = await fetch(`${repoUrl(path)}?ref=${branch}`, { headers: githubHeaders() });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub read failed (${response.status}) for ${path}`);
  const body = await response.json();
  return body.sha;
}

async function commitFile(path, contentBase64, message, branch) {
  const sha = await fileSha(path, branch);
  const response = await fetch(repoUrl(path), {
    method: "PUT",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: contentBase64, branch, ...(sha ? { sha } : {}) }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub write failed (${response.status}) for ${path}: ${detail.slice(0, 200)}`);
  }
}

// -------------------------------------------------------------- extraction

// ------------------------------------------------------------------ handler

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const missing = ["ADMIN_PASSWORD", "GITHUB_TOKEN", "GITHUB_REPO"].filter(
    (name) => !process.env[name],
  );
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    missing.push("GEMINI_API_KEY or ANTHROPIC_API_KEY");
  }
  if (missing.length) {
    return res.status(500).json({
      error: `The server is not configured yet. Missing environment variables: ${missing.join(", ")}.`,
    });
  }

  const ip = clientIp(req);
  const record = failures.get(ip);
  if (record && record.count >= MAX_FAILURES && Date.now() - record.at < LOCKOUT_MS) {
    return res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
  }

  const { password, files, filename, fileBase64 } = req.body ?? {};

  if (!passwordMatches(password ?? "", process.env.ADMIN_PASSWORD)) {
    // A fixed delay makes online guessing slow regardless of instance reuse.
    await sleep(700);
    const next = record && Date.now() - record.at < LOCKOUT_MS ? record.count + 1 : 1;
    failures.set(ip, { count: next, at: Date.now() });
    return res.status(401).json({ error: "Wrong password." });
  }
  failures.delete(ip);

  // Accept the multi-file shape, and the older single-file shape for safety.
  const uploads = Array.isArray(files) && files.length
    ? files
    : filename && fileBase64
      ? [{ filename, base64: fileBase64, lang: null }]
      : [];

  if (!uploads.length) return res.status(400).json({ error: "No file received." });
  if (uploads.length > 2) return res.status(400).json({ error: "At most two files (one per language)." });

  let total = 0;
  for (const upload of uploads) {
    if (!upload?.filename || !upload?.base64) {
      return res.status(400).json({ error: "A file was sent without a name or contents." });
    }
    /*
     * PDF only, deliberately.
     *
     * A PDF goes to the model as the actual page, so headings, columns and
     * bullet nesting survive; a Word file has to be flattened to plain text
     * first, which loses that structure and reads slower. It is also the file
     * the Resume window offers for download, so accepting anything else would
     * publish a CV whose download does not match what the site shows.
     */
    if (!/\.pdf$/i.test(upload.filename)) {
      return res.status(400).json({
        error: `"${upload.filename}" is not a PDF. Save your CV as PDF and upload that.`,
      });
    }
    upload.buffer = Buffer.from(upload.base64, "base64");
    if (upload.buffer.byteLength === 0) {
      return res.status(400).json({ error: `"${upload.filename}" is empty.` });
    }
    const pages = countPdfPages(upload.buffer);
    if (pages > MAX_PAGES) {
      return res.status(413).json({
        error:
          `"${upload.filename}" has about ${pages} pages. The limit is ${MAX_PAGES}, ` +
          "because a longer CV takes more than the minute this import is allowed.",
      });
    }
    total += upload.buffer.byteLength;
  }
  if (total > MAX_FILE_BYTES) {
    return res.status(413).json({
      error: `The files total ${(total / 1e6).toFixed(1)} MB. The limit is 3 MB.`,
    });
  }

  const branch = process.env.GITHUB_BRANCH || "main";
  let chosen;
  try {
    chosen = pickProvider();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  try {
    const documents = [];
    for (const upload of uploads) {
      documents.push({ lang: upload.lang ?? null, doc: await readDocument(upload.filename, upload.buffer) });
    }
    /*
     * The race is what turns a hung extraction into an explanation. Without
     * it the platform kills the function at 60 seconds and the browser gets a
     * bare 504 with no clue what went wrong; with it, the caller is told the
     * model was too slow and what to do about it.
     */
    /*
     * One document in, both languages out.
     *
     * Keeping a separate CV in each language is work most people will not do,
     * so a single upload is translated into the other language. Two uploads
     * still skip translation entirely and match the author's own wording.
     */
    const translate = documents.length === 1;
    const { parsed, usage, provider, model, translatedFields } = await Promise.race([
      // With five minutes available there is room to sit out a busy free tier.
      extractCv({ documents, translate, attempts: 4 }),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "The AI did not answer within five minutes. This is usually " +
                  "the free tier being busy rather than a problem with your " +
                  "CV — wait a minute and try again.",
              ),
            ),
          EXTRACTION_DEADLINE_MS,
        ),
      ),
    ]);
    /*
     * Refuse anything that is not a CV.
     *
     * Two independent checks, because either alone is fallible: the model's
     * own judgement, and the objective fact that a CV without a single degree,
     * job, skill or project is not a CV. Rejecting here means nothing is
     * committed and the published site is left untouched.
     */
    const sections = ["education", "experience", "skills", "projects", "certifications", "activities"];
    const empty = sections.every((key) => !(parsed[key] ?? []).length);
    if (parsed.looksLikeCv === false || empty) {
      return res.status(422).json({
        error:
          "That document does not look like a CV — nothing was published. " +
          "Upload a CV or resume with education, experience or skills in it.",
      });
    }

    const names = uploads.map((upload) => upload.filename).join(" + ");
    /*
     * Which slot the file was dropped into only decides anything when there
     * are two of them. With one document the language the model actually read
     * wins, so dropping a Greek CV into the English box still publishes a
     * Greek site instead of mislabelling it.
     */
    const suppliedLanguages =
      uploads.length > 1 ? uploads.map((upload) => upload.lang).filter(Boolean) : [];
    const { data, sourceLanguage, availableLanguages } = buildCvJson(
      parsed,
      names,
      suppliedLanguages,
      { translated: translate },
    );

    const commitMessage = `Update CV from ${names}`;
    await commitFile(
      CV_JSON_PATH,
      Buffer.from(JSON.stringify(data, null, 2) + "\n").toString("base64"),
      commitMessage,
      branch,
    );

    // Keep the downloads in sync. With two labelled uploads each PDF goes to
    // its own language slot; with one, the language the model detected decides.
    /*
     * File each PDF under the language it is really written in.
     *
     * With two uploads the model reports what it actually read in
     * `documentLanguages`, so a Greek CV dropped into the English box still
     * ends up as the Greek download. The upload slot is only the fallback.
     */
    const detected = Array.isArray(parsed.documentLanguages) ? parsed.documentLanguages : [];
    const pdfCommitted = [];
    for (const [index, upload] of uploads.entries()) {
      const language =
        uploads.length > 1 ? (detected[index] ?? upload.lang ?? sourceLanguage) : sourceLanguage;
      const target = PDF_PATHS[language];
      await commitFile(target, upload.base64, `${commitMessage} (PDF)`, branch);
      pdfCommitted.push(target);
    }

    return res.status(200).json({
      ok: true,
      sourceLanguage,
      availableLanguages,
      pdfCommitted,
      counts: {
        education: data.education.length,
        experience: data.experience.length,
        skills: data.skills.length,
        projects: data.projects.length,
        certifications: data.certifications.length,
        activities: data.activities.length,
      },
      /*
       * The untranslated-text check only means anything when two documents
       * were supplied. With one, both language slots hold the same text on
       * purpose, so running it would report every field as a problem.
       */
      warnings: availableLanguages.length > 1 ? findUntranslated(data).slice(0, 5) : [],
      translated: translate,
      translatedFields: translatedFields ?? 0,
      provider,
      model,
      usage,
    });
  } catch (error) {
    // Caller mistakes (wrong file type, unreadable document) are 4xx, not 5xx.
    if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
    const message = describeProviderError(error, chosen.provider, process.env.CV_MODEL ?? "");
    const status = error?.status === 429 ? 429 : 500;
    return res.status(status).json({ error: message });
  }
}
