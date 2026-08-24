/**
 * AI provider layer.
 *
 * The CV extraction works with either Anthropic (Claude) or Google (Gemini).
 * Both are asked for the same structured shape defined in `cv-schema.js`, so
 * the rest of the code never needs to know which one produced the result.
 *
 * Which one runs is decided by `pickProvider()`:
 *   CV_PROVIDER=gemini | anthropic   explicit choice, wins if set
 *   otherwise whichever API key is present (Gemini first, since it is free)
 *
 * Gemini has a free tier, which is why it is preferred when both keys exist.
 * Note that Google states free-tier content may be used to improve its
 * products; use Anthropic, or Gemini's paid tier, if that matters for the
 * documents you upload.
 */

import {
  CV_SCHEMA,
  CV_SCHEMA_SINGLE,
  SYSTEM_PROMPT,
  SYSTEM_PROMPT_SINGLE,
  applyLocalized,
  collectLocalized,
  expandSingleLanguage,
} from "./cv-schema.js";

/**
 * Default models.
 *
 * The Gemini default is the "-latest" alias rather than a pinned version:
 * Google keeps retired versions visible in the models list long after they
 * stop answering generateContent, so a pinned name silently rots. The alias
 * always resolves to the current Flash model.
 *
 * Flash rather than Pro is deliberate. This is structured extraction, not
 * reasoning: Flash is as accurate here, several times faster (which matters
 * against the 60-second serverless limit) and far more generous on the free
 * tier. Override with CV_MODEL if you want to compare.
 */
export const DEFAULT_MODELS = {
  anthropic: "claude-sonnet-4-5",
  gemini: "gemini-flash-latest",
};

/**
 * Models to fall back to when the preferred one stays busy.
 *
 * Gemini's free tier is served at lower priority, so a popular model can
 * return 503 for minutes at a time while a less popular one answers
 * immediately. Trying the next model is far more likely to succeed than
 * waiting longer on the first.
 *
 * Ordered by how close each is to the preferred choice.
 */
export const FALLBACK_MODELS = {
  // Measured, not guessed: the "-latest" aliases carry the most traffic and
  // are the first to return 503, while the explicitly versioned Flash models
  // stayed available through the same congestion. So the alias is tried first
  // (it tracks the newest model) but the versioned ones are the safety net.
  gemini: [
    "gemini-flash-latest",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-flash-lite-latest",
    "gemini-pro-latest",
  ],
  anthropic: [],
};

const LANGUAGE_NAMES = { en: "ENGLISH", el: "GREEK" };

/**
 * Three ways to run, decided by what the caller supplied.
 *
 *   "match"     two documents — one per language. Nothing is translated: each
 *               language's text comes from that language's own file.
 *   "translate" one document, both languages wanted. The model writes the
 *               other language itself. Costs roughly double the output of
 *               "verbatim", which is what makes long CVs slow.
 *   "verbatim"  one document, one language published. One string per field
 *               instead of an {en, el} pair — half the output, half the wait.
 */
function modeFor(documents, translate) {
  if (documents.length > 1) return "match";
  return translate ? "translate" : "verbatim";
}

/*
 * "translate" reads the document exactly like "verbatim" — one string per
 * field, in the document's own language. The second language is produced
 * afterwards by `translateInto`, not by this call.
 */
const schemaFor = (mode) => (mode === "match" ? CV_SCHEMA : CV_SCHEMA_SINGLE);
const systemFor = (mode) => (mode === "match" ? SYSTEM_PROMPT : SYSTEM_PROMPT_SINGLE);

/** Closing instruction, matched to the mode. */
function buildInstruction(documents, mode) {
  if (mode === "match") {
    return (
      "You have been given the SAME CV in two languages, labelled above.\n" +
      "The labels say which upload slot each file came from and may be WRONG. " +
      "Work out each document's real language yourself and report it in " +
      "documentLanguages, in the order the documents appear.\n" +
      "Do NOT translate anything. For every localized field, take the English " +
      "text from whichever document is in English and the Greek text from " +
      "whichever is in Greek, matching the entries to each other. Keep the " +
      "author's exact wording in both languages. If one document contains an " +
      "entry the other omits, translate only that entry and keep everything " +
      "else verbatim."
    );
  }
  /*
   * One document.
   *
   * The upload is deliberately NOT described as English or Greek. Telling the
   * model "this is the English CV" makes it report English even when the file
   * is plainly Greek, and the whole site then comes up in the wrong language.
   * What the document is written in is something it can see for itself.
   */
  return (
    "Extract this CV. Read which language it is written in and report that in " +
    "sourceLanguage — decide from the text itself.\n" +
    "Do NOT translate: copy every field exactly as written in the document."
  );
}

/** An error caused by the caller's input rather than by the server. */
export function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

/**
 * Normalise an uploaded file into a provider-neutral document.
 * Returns either { kind: "pdf", base64 } or { kind: "text", text }.
 */
export async function readDocument(filename, buffer) {
  const extension = filename.toLowerCase().slice(filename.lastIndexOf("."));

  if (extension === ".pdf") {
    // Both providers read PDFs natively, which preserves layout cues.
    return { kind: "pdf", base64: buffer.toString("base64") };
  }

  if (extension === ".docx") {
    const { default: mammoth } = await import("mammoth");
    let text;
    try {
      ({ value: text } = await mammoth.extractRawText({ buffer }));
    } catch {
      // A .docx is a zip; a corrupt or mislabelled file fails here with an
      // unhelpful zip error. Report it as the caller's problem instead.
      throw badRequest(`"${filename}" is not a readable Word file. Try saving it again, or export a PDF.`);
    }
    if (!text.trim()) throw badRequest(`No text could be extracted from "${filename}".`);
    return { kind: "text", text };
  }

  if (extension === ".txt" || extension === ".md") {
    return { kind: "text", text: buffer.toString("utf8") };
  }

  throw badRequest(`Unsupported file type "${extension}". Use .pdf, .docx, .txt or .md.`);
}

/** Decide which provider to use from the environment. */
export function pickProvider(env = process.env) {
  const explicit = (env.CV_PROVIDER || "").toLowerCase();
  if (explicit === "gemini" || explicit === "anthropic") {
    const key = explicit === "gemini" ? env.GEMINI_API_KEY : env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error(
        `CV_PROVIDER is set to "${explicit}" but ${
          explicit === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY"
        } is missing.`,
      );
    }
    return { provider: explicit, apiKey: key };
  }

  // Gemini first: it has a free tier, so it is the friendlier default.
  if (env.GEMINI_API_KEY) return { provider: "gemini", apiKey: env.GEMINI_API_KEY };
  if (env.ANTHROPIC_API_KEY) return { provider: "anthropic", apiKey: env.ANTHROPIC_API_KEY };

  throw new Error(
    "No AI key found. Set GEMINI_API_KEY (free, https://aistudio.google.com/apikey) " +
      "or ANTHROPIC_API_KEY (paid, https://console.anthropic.com).",
  );
}

// ----------------------------------------------------------------- Anthropic

async function extractWithAnthropic({ apiKey, model, documents }) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const blocks = [];
  for (const [index, entry] of documents.entries()) {
    // Only label when there are two: with one document the label would just be
    // a hint about the upload slot, which the author may well have got wrong.
    if (entry.lang && documents.length > 1) {
      blocks.push({ type: "text", text: `=== DOCUMENT ${index + 1} (uploaded as ${LANGUAGE_NAMES[entry.lang]}) ===` });
    }
    blocks.push(
      entry.doc.kind === "pdf"
        ? {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: entry.doc.base64 },
          }
        : { type: "text", text: entry.doc.text },
    );
  }

  // Streaming keeps the connection active through a long extraction.
  const stream = client.messages.stream({
    model,
    max_tokens: 16000,
    system: systemFor(mode),
    tools: [
      {
        name: "save_cv",
        description: "Save the extracted CV in structured form.",
        input_schema: schemaFor(mode),
      },
    ],
    tool_choice: { type: "tool", name: "save_cv" },
    messages: [
      { role: "user", content: [...blocks, { type: "text", text: buildInstruction(documents, mode) }] },
    ],
  });

  const message = await stream.finalMessage();
  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse) throw new Error("The model did not return structured data. Try again.");

  return { parsed: toolUse.input, usage: message.usage ?? null };
}

// -------------------------------------------------------------------- Gemini

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Statuses worth retrying: transient congestion and rate limiting.
 * 503 in particular is common on the Gemini free tier, which is served at a
 * lower priority than paid traffic — it means "busy", not "broken".
 */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Retry with exponential backoff and jitter.
 *
 * Jitter matters: without it, every client that failed at the same moment
 * retries at the same moment and the congestion repeats.
 */
async function withRetry(run, { attempts, onRetry }) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const isLast = attempt === attempts;
      if (isLast || !RETRYABLE_STATUSES.has(error.status)) throw error;
      const waitMs = Math.round(2000 * 2 ** (attempt - 1) + Math.random() * 500);
      onRetry?.({ attempt, attempts, waitMs, status: error.status });
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}

async function callGemini({ apiKey, model, parts, useSchema, schema, system }) {
  const generationConfig = {
    responseMimeType: "application/json",
    maxOutputTokens: 16000,
    ...(useSchema ? { responseSchema: schema } : {}),
  };

  const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts }],
      generationConfig,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(detail.slice(0, 400));
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function extractWithGemini({ apiKey, model, documents, mode, attempts, onRetry }) {
  const parts = [];
  for (const [index, entry] of documents.entries()) {
    if (entry.lang && documents.length > 1) {
      parts.push({ text: `=== DOCUMENT ${index + 1} (uploaded as ${LANGUAGE_NAMES[entry.lang]}) ===` });
    }
    parts.push(
      entry.doc.kind === "pdf"
        ? { inline_data: { mime_type: "application/pdf", data: entry.doc.base64 } }
        : { text: entry.doc.text },
    );
  }
  parts.push({ text: buildInstruction(documents, mode) });

  const schema = schemaFor(mode);
  const system = systemFor(mode);
  const call = (useSchema) =>
    withRetry(() => callGemini({ apiKey, model, parts, useSchema, schema, system }), {
      attempts,
      onRetry,
    });

  let body;
  try {
    body = await call(true);
  } catch (error) {
    // Gemini supports only a subset of JSON Schema and rejects schemas it
    // considers too large or deeply nested. When that happens, retry in plain
    // JSON mode — the system prompt already describes the shape, and the
    // result is validated by the caller either way.
    if (error.status === 400) {
      body = await call(false);
    } else {
      throw error;
    }
  }

  const candidate = body.candidates?.[0];
  if (!candidate) {
    const blocked = body.promptFeedback?.blockReason;
    throw new Error(blocked ? `Gemini refused the request (${blocked}).` : "Gemini returned no result.");
  }
  if (candidate.finishReason === "MAX_TOKENS") {
    throw new Error("The CV was too long for one response. Try a shorter document.");
  }

  const text = (candidate.content?.parts ?? []).map((part) => part.text ?? "").join("");
  if (!text.trim()) throw new Error("Gemini returned an empty response.");

  try {
    return { parsed: JSON.parse(text), usage: body.usageMetadata ?? null };
  } catch {
    // Some responses wrap the JSON in a ```json fence despite the MIME type.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) return { parsed: JSON.parse(fenced[1]), usage: body.usageMetadata ?? null };
    throw new Error("Gemini did not return valid JSON. Try running the import again.");
  }
}

// --------------------------------------------------------- translation pass

/**
 * Schema for the translation call: a plain list of strings.
 *
 * Asking one call to both read a PDF and produce two languages reliably
 * produced only one — the model treats extraction as the task and quietly
 * copies the source text into the second slot. Splitting the work fixes that:
 * this second call has nothing to do except translate, and it never sees the
 * document, so it cannot drift back into extracting.
 *
 * Sending a flat list rather than the whole CV also makes misalignment
 * impossible to miss: the reply must have exactly as many strings as were
 * sent, in the same order, and that is checked before anything is used.
 */
const TRANSLATION_SCHEMA = { type: "array", items: { type: "string" } };

const TRANSLATION_SYSTEM = `You are translating the fields of a CV.

Rules:
- Return a JSON array of strings: exactly one translation per input string, in the SAME order. Never merge, split, reorder or drop entries.
- Translate naturally, the way a native speaker would write a CV — not word for word.
- Keep unchanged: people's names, company and university names, product and tool names (Python, Wireshark, Metasploit), certification titles (CompTIA Security+), e-mail addresses, URLs and numbers.
- Keep dates in the same format. When translating into Greek, use the Greek month abbreviations (Ιαν, Φεβ, Μάρ, Απρ, Μάι, Ιούν, Ιούλ, Αύγ, Σεπ, Οκτ, Νοε, Δεκ) if the source abbreviates them.
- A string that is already in the target language, or that is only a name, a number or a URL, comes back unchanged.
- Never return an empty string.`;

/** Longest run of strings sent in one request. */
const TRANSLATION_BATCH = 120;

async function translateBatchWithGemini({ apiKey, model, strings, targetLang, attempts, onRetry }) {
  const parts = [
    {
      text:
        `Translate the following ${strings.length} CV fields into ` +
        `${LANGUAGE_NAMES[targetLang]}.\n` +
        `Return a JSON array of exactly ${strings.length} strings, in the same order.\n\n` +
        JSON.stringify(strings, null, 0),
    },
  ];

  const body = await withRetry(
    () =>
      callGemini({
        apiKey,
        model,
        parts,
        useSchema: true,
        schema: TRANSLATION_SCHEMA,
        system: TRANSLATION_SYSTEM,
      }),
    { attempts, onRetry },
  );

  const text = (body.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
  return JSON.parse(text);
}

async function translateBatchWithAnthropic({ apiKey, model, strings, targetLang }) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model,
    max_tokens: 16000,
    system: TRANSLATION_SYSTEM,
    tools: [
      {
        name: "save_translations",
        description: "Return one translation per input string, in order.",
        input_schema: {
          type: "object",
          properties: { translations: TRANSLATION_SCHEMA },
          required: ["translations"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "save_translations" },
    messages: [
      {
        role: "user",
        content:
          `Translate the following ${strings.length} CV fields into ` +
          `${LANGUAGE_NAMES[targetLang]}. Return exactly ${strings.length} ` +
          `translations, in the same order.\n\n${JSON.stringify(strings)}`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  return toolUse?.input?.translations ?? [];
}

/**
 * Fill the empty language of an already-extracted CV.
 *
 * Batched, because one oversized request is the easiest way to hit an output
 * limit and get a truncated array back. Any batch whose reply has the wrong
 * length is discarded rather than applied: the source text stays, which is
 * wrong-language but readable, instead of sentences landing under the wrong
 * headings.
 */
async function translateInto({ parsed, targetLang, provider, apiKey, model, attempts, onRetry, onProgress }) {
  const sourceLang = targetLang === "el" ? "en" : "el";
  const strings = collectLocalized(parsed, sourceLang);
  if (!strings.length) return 0;

  const run = provider === "gemini" ? translateBatchWithGemini : translateBatchWithAnthropic;
  const translated = [];

  for (let start = 0; start < strings.length; start += TRANSLATION_BATCH) {
    const batch = strings.slice(start, start + TRANSLATION_BATCH);
    onProgress?.({ done: start, total: strings.length });
    let reply;
    try {
      reply = await run({ apiKey, model, strings: batch, targetLang, attempts, onRetry });
    } catch {
      reply = null;
    }
    const usable = Array.isArray(reply) && reply.length === batch.length ? reply : batch.map(() => null);
    translated.push(...usable);
  }

  return applyLocalized(parsed, translated, targetLang);
}

// ------------------------------------------------------------------ dispatch

const REQUIRED_KEYS = ["person", "summary", "education", "experience", "skills"];

/**
 * Run the extraction with whichever provider is configured.
 *
 * `attempts` bounds the retries on transient failures. The command line can
 * afford several; the serverless endpoint has a 60-second budget, so it passes
 * a smaller number.
 *
 * `documents` is an array of { lang: "en" | "el" | null, doc } — one entry per
 * uploaded file. Supplying both language versions of the same CV gives the
 * best result, because nothing has to be translated.
 *
 * `translate` only applies to a single document: true asks the model to write
 * the other language as well, false publishes the one language it read.
 *
 * Returns { parsed, usage, provider, model, mode }.
 */
export async function extractCv({
  documents,
  translate = false,
  env = process.env,
  attempts = 4,
  onRetry,
  onModelSwitch,
  onProgress,
}) {
  if (!documents?.length) throw badRequest("No document to read.");
  const mode = modeFor(documents, translate);
  const { provider, apiKey } = pickProvider(env);

  // Preferred model first, then the fallbacks, with duplicates removed.
  const preferred = env.CV_MODEL || DEFAULT_MODELS[provider];
  const candidates = [...new Set([preferred, ...(FALLBACK_MODELS[provider] ?? [])])];

  // The Anthropic SDK retries internally, so only the Gemini path needs this.
  const run = provider === "gemini" ? extractWithGemini : extractWithAnthropic;

  let parsed;
  let usage;
  let model;
  let lastError;

  for (const [index, candidate] of candidates.entries()) {
    try {
      ({ parsed, usage } = await run({ apiKey, model: candidate, documents, mode, attempts, onRetry }));
      model = candidate;
      break;
    } catch (error) {
      lastError = error;
      const worthSwitching = RETRYABLE_STATUSES.has(error.status) || error.status === 404;
      const nextCandidate = candidates[index + 1];
      if (!worthSwitching || !nextCandidate) throw error;
      onModelSwitch?.({ from: candidate, to: nextCandidate, status: error.status });
    }
  }

  if (!model) throw lastError;

  // Compact runs come back as plain strings; widen them to {en, el} before
  // anything downstream looks at the shape.
  if (mode !== "match") parsed = expandSingleLanguage(parsed);

  // Both providers can in principle return something malformed; fail loudly
  // rather than writing a broken cv.json.
  const missing = REQUIRED_KEYS.filter((key) => !parsed?.[key]);
  if (missing.length) {
    throw new Error(`The extracted data is missing: ${missing.join(", ")}. Try the import again.`);
  }

  // Second pass: the other language, from the extracted text rather than the
  // document. See TRANSLATION_SYSTEM above for why this is a separate call.
  let translatedFields = 0;
  if (mode === "translate") {
    const targetLang = parsed.sourceLanguage === "el" ? "en" : "el";
    translatedFields = await translateInto({
      parsed,
      targetLang,
      provider,
      apiKey,
      model,
      attempts,
      onRetry,
      onProgress,
    });
  }

  return { parsed, usage, provider, model, mode, translatedFields };
}

/** Turn a provider error into a message worth showing a human. */
export function describeProviderError(error, provider, model) {
  const status = error?.status;
  const text = String(error?.message ?? error);

  if (status === 401 || status === 403 || /API key not valid|API_KEY_INVALID/i.test(text)) {
    return provider === "gemini"
      ? "The Gemini API key was rejected. Check GEMINI_API_KEY."
      : "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.";
  }
  if (status === 404) {
    // Do not claim to know why: a 404 here usually means the model name is
    // wrong or retired, but the API's own message is more reliable than a
    // guess, so show it.
    return (
      `The API returned 404 for model "${model}".\n` +
      (provider === "gemini"
        ? '  Try CV_MODEL=gemini-flash-latest — pinned versions are often listed\n' +
          "  but no longer served. Model names: https://ai.google.dev/gemini-api/docs/models\n"
        : "  Model names: https://docs.claude.com/en/docs/about-claude/models\n") +
      `  API said: ${text.slice(0, 200)}`
    );
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(text)) {
    return provider === "gemini"
      ? "The Gemini free-tier quota is used up for now. Wait a minute and try again."
      : "Rate limited by the API. Wait a minute and try again.";
  }
  if (status === 503 || /UNAVAILABLE|high demand/i.test(text)) {
    return (
      "The model is busy right now and did not free up after several retries.\n" +
      "  This is congestion on the provider's side, not a problem with your setup.\n" +
      "  Wait a few minutes and run the same command again."
    );
  }
  return text;
}
