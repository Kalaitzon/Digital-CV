#!/usr/bin/env node
/**
 * Import a CV file and regenerate `src/data/cv.json`.
 *
 *   npm run import-cv -- path/to/CV.pdf
 *   npm run import-cv -- --en CV_EN.pdf --el CV_GR.pdf
 *
 * Supplying both language versions is strongly preferred: the model then
 * matches them to each other instead of translating, so your own wording is
 * kept in both languages.
 *
 * The files are sent to Gemini or Claude (whichever key is in .env), which
 * extracts the CV into the structured shape the site expects, in BOTH English
 * and Greek.
 *
 * This runs on your own machine only. The API key lives in a local `.env`
 * file that is never committed, so nothing about it reaches the published
 * site and no visitor can trigger a parse or change your content.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { buildCvJson, findUntranslated } from "../shared/cv-schema.js";
import {
  DEFAULT_MODELS,
  describeProviderError,
  extractCv,
  pickProvider,
  readDocument,
} from "../shared/providers.js";

const OUTPUT_PATH = "src/data/cv.json";
/** One downloadable PDF per language; the Resume window links to both. */
const PUBLIC_PDF_PATHS = { en: "public/CV_EN.pdf", el: "public/CV_EL.pdf" };
/** Both providers reject very large documents; fail early with a clear message. */
const MAX_FILE_BYTES = 30 * 1024 * 1024;



// --------------------------------------------------------------- environment

/**
 * Minimal .env reader — avoids a dependency for a five-line job.
 * Values may be quoted; everything after the first "=" is the value.
 */
function loadEnvFile(path = ".env") {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}



// -------------------------------------------------------------------- helpers

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

// ----------------------------------------------------------------------- main

const args = process.argv.slice(2);
/**
 * --dry-run reads the file and prints what would be sent, without calling the
 * API and without writing anything. Useful for checking that a .docx is
 * readable, or that a path is correct, before spending tokens.
 */
const dryRun = args.includes("--dry-run");

/**
 * --translate publishes both languages from a single document, the way the
 * in-site upload window does. Off by default here: from the command line you
 * are usually curating the content, and a verbatim import is both faster and
 * entirely in the author's own words.
 */
const translate = args.includes("--translate");

/** Read "--en <path>" / "--el <path>" plus any bare paths. */
function collectInputs(argv) {
  const inputs = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--en" || arg === "--el") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) fail(`${arg} needs a file path after it.`);
      inputs.push({ lang: arg.slice(2), path: value });
      i += 1;
    } else if (!arg.startsWith("--")) {
      inputs.push({ lang: null, path: arg });
    }
  }
  return inputs;
}

const inputs = collectInputs(args);
if (!inputs.length) {
  console.log(`
Usage:  npm run import-cv -- <path-to-cv>

Examples:
  npm run import-cv -- ./CV_EN.pdf
  npm run import-cv -- --en ./CV_EN.pdf --el ./CV_GR.pdf

Giving both languages is better: the model matches them to each other instead
of translating, so your own wording is preserved in both. With one file the
site publishes that language only, unless you pass --translate.

Options:
  --en <file>   the English version
  --el <file>   the Greek version
  --translate   with one file, also write the other language (translated)
  --dry-run     check the files are readable without calling the API
`);
  process.exit(0);
}

loadEnvFile();

let chosen = { provider: "gemini" };
if (!dryRun) {
  try {
    chosen = pickProvider();
  } catch (error) {
    fail(`${error.message}\n  Put the key in a file named .env — see .env.example.`);
  }
}

if (inputs.length > 2) fail("At most two files: one per language.");
for (const input of inputs) {
  input.path = resolve(input.path);
  if (!existsSync(input.path)) fail(`File not found: ${input.path}`);
}

const model = process.env.CV_MODEL || DEFAULT_MODELS[chosen.provider];
console.log(`\n→ Provider  ${chosen.provider}`);
console.log(`→ Model     ${model}`);

const documents = [];
for (const input of inputs) {
  const name = basename(input.path);
  const bytes = readFileSync(input.path);
  if (bytes.byteLength > MAX_FILE_BYTES) {
    fail(`${name} is too large (${(bytes.byteLength / 1e6).toFixed(1)} MB). Maximum is 30 MB.`);
  }
  let doc;
  try {
    doc = await readDocument(name, bytes);
  } catch (error) {
    fail(error.message);
  }
  const size =
    doc.kind === "text"
      ? `${doc.text.length} characters of text`
      : `${(doc.base64.length / 1e3).toFixed(0)} KB of base64 PDF`;
  console.log(`→ Reading   ${name}${input.lang ? ` [${input.lang}]` : ""} — ${size}`);
  documents.push({ lang: input.lang, doc });
}

if (documents.length === 1 && !documents[0].lang) {
  console.log("\n  Tip: pass --en and --el with both versions of your CV to avoid");
  console.log("  machine translation and keep your own wording in both languages.");
}

if (dryRun) {
  console.log("\n✓ Files are readable. Dry run — nothing sent, nothing written.\n");
  process.exit(0);
}

console.log("→ Parsing… (this usually takes 30–90 seconds)\n");

let parsed;
let usage;
let usedModel;
try {
  ({ parsed, usage, model: usedModel } = await extractCv({
    documents,
    translate,
    attempts: 5,
    onRetry: ({ attempt, attempts, waitMs, status }) =>
      console.log(
        `  ${status} from the provider — retry ${attempt}/${attempts - 1} in ${Math.round(waitMs / 1000)}s…`,
      ),
    onModelSwitch: ({ from, to, status }) =>
      console.log(`  "${from}" stayed unavailable (${status}) — switching to "${to}"…\n`),
    onProgress: ({ done, total }) => console.log(`  translating ${done}/${total} fields…`),
  }));
} catch (error) {
  fail(describeProviderError(error, chosen.provider, model));
}

const sourceName = inputs.map((input) => basename(input.path)).join(" + ");
// One document means the model's own detection decides the language, not
// which flag the file was passed under.
const suppliedLanguages =
  inputs.length > 1 ? inputs.map((input) => input.lang).filter(Boolean) : [];
const { data: output, sourceLanguage, availableLanguages } = buildCvJson(
  parsed,
  sourceName,
  suppliedLanguages,
  { translated: translate },
);

writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");

// Keep the downloadable PDFs in sync when the source was itself a PDF. The
// file is stored under the language it is written in, so importing an English
// CV and later a Greek one leaves both downloads available.
for (const input of inputs) {
  if (extname(input.path).toLowerCase() !== ".pdf") continue;
  const target = PUBLIC_PDF_PATHS[input.lang ?? sourceLanguage];
  copyFileSync(input.path, target);
  console.log(`✓ Copied ${basename(input.path)} to ${target}`);
}

for (const lang of ["en", "el"]) {
  if (!existsSync(PUBLIC_PDF_PATHS[lang])) {
    console.log(
      `⚠ ${PUBLIC_PDF_PATHS[lang]} does not exist yet — the Resume window will` +
        `\n  offer it once you import a ${lang === "el" ? "Greek" : "English"} PDF.`,
    );
  }
}

console.log(`✓ Wrote ${OUTPUT_PATH}`);
console.log(`
  Education entries    ${output.education.length}
  Experience entries   ${output.experience.length}
  Skill groups         ${output.skills.length}
  Project groups       ${output.projects.length}
  Certifications       ${output.certifications.length}
  Activities           ${output.activities.length}
  Site languages       ${availableLanguages.join(", ")}
  Model used           ${usedModel}
  Tokens in / out      ${usage?.input_tokens ?? usage?.promptTokenCount ?? "?"} / ${usage?.output_tokens ?? usage?.candidatesTokenCount ?? "?"}
`);

// Only meaningful for a two-document import; see the note in api/import-cv.js.
const problems = availableLanguages.length > 1 ? findUntranslated(output) : [];
if (problems.length) {
  console.log("⚠ Possible translation problems — check these in the browser:");
  for (const problem of problems.slice(0, 10)) console.log(`    ${problem}`);
  console.log("");
}

console.log(`Next:
  npm run dev     → check both languages at http://localhost:5173
  git add . && git commit -m "Update CV" && git push
`);
