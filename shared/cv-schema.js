/**
 * CV extraction contract, shared by the local CLI (`scripts/import-cv.mjs`)
 * and the serverless import endpoint (`api/import-cv.js`).
 *
 * Keeping one copy means the two paths can never drift apart and produce
 * differently-shaped cv.json files.
 */

/**
 * The schema is built twice from the same description.
 *
 * Bilingual mode asks for an {en, el} pair per field, which is what two
 * uploaded documents deserve. Single mode asks for one plain string per field
 * instead: the site will publish that one language anyway, so making the model
 * emit every sentence twice doubles the output tokens — and therefore the
 * response time — for text that is then thrown away. On a long CV that is the
 * difference between finishing inside the serverless time limit and timing out.
 * `expandSingleLanguage` puts the result back into the {en, el} shape the rest
 * of the code expects.
 */
function buildCvSchema(single) {
  const localized = (description) =>
    single
      ? { type: "string", description }
      : {
          type: "object",
          description,
          properties: {
            en: { type: "string", description: "English text" },
            el: { type: "string", description: "Greek text" },
          },
          required: ["en", "el"],
        };

  return {
  type: "object",
  properties: {
    looksLikeCv: {
      type: "boolean",
      description:
        "False if this document is not a CV/resume at all (lecture notes, an invoice, an article). Judge the document, not its quality: a thin CV is still a CV.",
    },
    ...(single
      ? {}
      : {
          documentLanguages: {
            type: "array",
            description:
              "For each document supplied, in the order given, the language it is ACTUALLY written in — ignore the label above it, which can be wrong.",
            items: { type: "string", enum: ["en", "el"] },
          },
        }),
    sourceLanguage: {
      type: "string",
      enum: ["en", "el"],
      description:
        "The language the source CV document is actually written in. Used to file the PDF as the English or the Greek download.",
    },
    person: {
      type: "object",
      properties: {
        firstName: localized("Given name"),
        lastName: localized("Family name"),
        headline: localized("One-line professional headline, e.g. current role or field of study"),
      },
      required: ["firstName", "lastName", "headline"],
    },
    contact: {
      type: "array",
      description: "Contact methods found in the CV: email, phone, LinkedIn, GitHub, personal site.",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Short slug: email, phone, linkedin, github, website",
          },
          label: localized("Display label for this contact method"),
          value: { type: "string", description: "Human-readable value shown on screen" },
          href: {
            type: "string",
            description: "Full href: mailto:…, tel:… (no spaces), or https://…",
          },
        },
        required: ["id", "label", "value", "href"],
      },
    },
    personalInfo: {
      type: "array",
      description:
        "Personal details table: name, surname, date of birth, birth place, nationality, languages, driver's licence, military service. Include only what the CV actually states.",
      items: {
        type: "object",
        properties: { label: localized("Field name"), value: localized("Field value") },
        required: ["label", "value"],
      },
    },
    summary: localized("The professional summary / profile paragraph"),
    education: {
      type: "array",
      description: "Degrees, most recent first.",
      items: {
        type: "object",
        properties: {
          degree: localized("Degree title, e.g. 'MSc, Cybersecurity'"),
          institution: localized("University or school name"),
          period: localized("Dates or expected graduation, e.g. 'Graduated July 2025'"),
          highlights: {
            type: "array",
            description: "Thesis, honours, rank, exchanges, certifications tied to this degree.",
            items: localized("One highlight"),
          },
        },
        required: ["degree", "institution", "period", "highlights"],
      },
    },
    skills: {
      type: "array",
      description: "Skill groups such as Programming, Security Tools, Frameworks, Operating Systems, Languages.",
      items: {
        type: "object",
        properties: {
          label: localized("Group name"),
          items: {
            type: "array",
            description:
              "Individual skills. Keep proper nouns (Python, Wireshark) untranslated and identical in both languages.",
            items: { type: "string" },
          },
        },
        required: ["label", "items"],
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: localized("Certification name"),
          issuer: localized("Issuing body and date or status"),
        },
        required: ["name", "issuer"],
      },
    },
    experience: {
      type: "array",
      description: "Professional and military experience, most recent first.",
      items: {
        type: "object",
        properties: {
          role: localized("Job title"),
          organization: localized("Employer name"),
          location: localized("City, country"),
          period: localized("Date range, e.g. 'Jan 2026 – May 2026'"),
          bullets: { type: "array", items: localized("One responsibility or achievement") },
        },
        required: ["role", "organization", "location", "period", "bullets"],
      },
    },
    projects: {
      type: "array",
      description: "Project groups, e.g. academic projects per degree.",
      items: {
        type: "object",
        properties: {
          title: localized("Group title"),
          period: localized("Date range"),
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: localized("Project name"),
                description: localized("What was built or done"),
              },
              required: ["name", "description"],
            },
          },
        },
        required: ["title", "period", "items"],
      },
    },
    activities: {
      type: "array",
      description: "Volunteering, societies, extracurricular activities.",
      items: {
        type: "object",
        properties: {
          title: localized("Activity name"),
          description: localized("What it involves"),
        },
        required: ["title", "description"],
      },
    },
  },
  required: [
    "looksLikeCv",
    "sourceLanguage",
    "person",
    "contact",
    "personalInfo",
    "summary",
    "education",
    "skills",
    "certifications",
    "experience",
    "projects",
    "activities",
  ],
  };
}

export const CV_SCHEMA = buildCvSchema(false);
export const CV_SCHEMA_SINGLE = buildCvSchema(true);

/** Localized leaves, by the shape of the object that holds them. */
const LOCALIZED_FIELDS = {
  person: ["firstName", "lastName", "headline"],
  contact: ["label"],
  personalInfo: ["label", "value"],
  education: ["degree", "institution", "period"],
  skills: ["label"],
  certifications: ["name", "issuer"],
  experience: ["role", "organization", "location", "period"],
  projects: ["title", "period"],
  projectItem: ["name", "description"],
  activities: ["title", "description"],
};

/** Turn one string into the {en, el} pair the site renders from. */
const pair = (text) => ({ en: String(text ?? ""), el: String(text ?? "") });

/** Copy an object, converting the named keys from string to {en, el}. */
function pairFields(node, keys) {
  const out = { ...node };
  for (const key of keys) out[key] = pair(node?.[key]);
  return out;
}

/**
 * Expand a single-language extraction into the bilingual shape.
 *
 * Both slots get the author's own text verbatim. Nothing is translated here —
 * the site publishes only the language that was actually uploaded, and the
 * unused slot simply never reaches a visitor.
 */
export function expandSingleLanguage(parsed) {
  const list = (value) => (Array.isArray(value) ? value : []);

  return {
    looksLikeCv: parsed.looksLikeCv,
    sourceLanguage: parsed.sourceLanguage,
    person: pairFields(parsed.person ?? {}, LOCALIZED_FIELDS.person),
    contact: list(parsed.contact).map((c) => pairFields(c, LOCALIZED_FIELDS.contact)),
    personalInfo: list(parsed.personalInfo).map((i) => pairFields(i, LOCALIZED_FIELDS.personalInfo)),
    summary: pair(parsed.summary),
    education: list(parsed.education).map((e) => ({
      ...pairFields(e, LOCALIZED_FIELDS.education),
      highlights: list(e.highlights).map(pair),
    })),
    skills: list(parsed.skills).map((s) => ({
      ...pairFields(s, LOCALIZED_FIELDS.skills),
      items: list(s.items),
    })),
    certifications: list(parsed.certifications).map((c) =>
      pairFields(c, LOCALIZED_FIELDS.certifications),
    ),
    experience: list(parsed.experience).map((x) => ({
      ...pairFields(x, LOCALIZED_FIELDS.experience),
      bullets: list(x.bullets).map(pair),
    })),
    projects: list(parsed.projects).map((p) => ({
      ...pairFields(p, LOCALIZED_FIELDS.projects),
      items: list(p.items).map((i) => pairFields(i, LOCALIZED_FIELDS.projectItem)),
    })),
    activities: list(parsed.activities).map((a) => pairFields(a, LOCALIZED_FIELDS.activities)),
  };
}

export const SYSTEM_PROMPT = `You extract CVs into structured bilingual data for a personal website.

Rules:
- Produce BOTH English and Greek for every localized field. The source CV is written in one language; translate faithfully into the other. Never leave a field empty and never copy the English text into the Greek slot (or vice versa) as a placeholder.
- Greek translations must read naturally to a native speaker, not word-for-word. Keep technical terms, tool names, company names, university names and certification titles in their original form (e.g. "Metasploit", "Netcompany", "CompTIA Security+"). Job titles and descriptions SHOULD be translated.
- Preserve the CV's own ordering and wording. Do not invent, embellish, summarise away detail, or add achievements that are not stated.
- Dates: keep the format used in the CV. Abbreviate Greek months (Ιαν, Φεβ, Μάρ, Απρ, Μάι, Ιούν, Ιούλ, Αύγ, Σεπ, Οκτ, Νοε, Δεκ) when the English uses abbreviations.
- For phone hrefs strip all spaces and keep the country code, e.g. "+30 694 123 4567" becomes tel:+306941234567.
- If a section is absent from the CV, return an empty array for it rather than inventing content.`;

/**
 * Prompt used when exactly one document was supplied.
 *
 * The site will publish that language only, so translation is not just
 * unnecessary — it would put words in the author's mouth.
 */
export const SYSTEM_PROMPT_SINGLE = `You extract CVs into structured data for a personal website.

Rules:
- Copy the author's own words. Do NOT translate anything, and do not switch language for any field.
- Report the document's language in sourceLanguage.
- Preserve the CV's own ordering and wording. Do not invent, embellish, summarise away detail, or add achievements that are not stated.
- Keep dates in the format used in the CV.
- For phone hrefs strip all spaces and keep the country code, e.g. "+30 694 123 4567" becomes tel:+306941234567.
- If a section is absent from the CV, return an empty array for it rather than inventing content.`;


/** Compare hrefs ignoring case and a trailing slash. */
function normaliseHref(href) {
  return String(href).trim().toLowerCase().replace(/\/+$/, "");
}

/**
 * Clean a freshly parsed contact list.
 *
 * Everything the CV lists is published, phone number included — it is the
 * author's document and their decision. Nothing from a previous import
 * survives, so publishing someone else's CV never leaves a trace of the last
 * person's links. Entries are deduplicated by destination because the model
 * often reports the same URL twice under different labels.
 */
/** A href that carries no actual destination, e.g. "tel:" or "mailto:". */
function isEmptyHref(href) {
  const [, rest = ""] = String(href).split(/^(mailto:|tel:)/i).slice(-2);
  return rest.trim() === "" || /^(https?:\/\/)?$/i.test(String(href).trim());
}

export function cleanContacts(parsed) {
  const seen = new Set();
  return parsed.filter((contact) => {
    if (!contact?.href) return false;
    /*
     * A CV that lists no phone number must not produce a "Phone" row with
     * nothing after it. The model sometimes emits the empty shell of a field
     * it expected to find, so anything without a real destination or a
     * visible value is dropped.
     */
    if (isEmptyHref(contact.href)) return false;
    if (!String(contact.value ?? "").trim()) return false;
    const key = normaliseHref(contact.href);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Assemble the final cv.json payload from a tool-use result.
 */
export function buildCvJson(parsed, sourceName, suppliedLanguages = [], options = {}) {
  const sourceLanguage = parsed.sourceLanguage === "el" ? "el" : "en";

  /*
   * Which languages the site can actually offer.
   *
   * One document in means one language out: the visitor gets that language
   * only, and the language switcher disappears rather than showing a
   * machine-translated copy the author never approved. Two documents in means
   * both, each in the author's own words.
   */
  const languages = suppliedLanguages.filter((lang) => lang === "en" || lang === "el");
  const uploaded = languages.length ? [...new Set(languages)] : [sourceLanguage];

  /*
   * Reading languages vs downloadable ones.
   *
   * With `translated`, one uploaded document produces text in both languages,
   * so the site reads in both — but only one PDF exists, and the Resume window
   * must not offer a download that was never uploaded. `resumeLanguages`
   * records which PDFs actually exist.
   */
  const availableLanguages = options.translated ? ["en", "el"] : uploaded;
  const resumeLanguages = uploaded;

  return {
    data: {
      meta: {
        generatedAt: new Date().toISOString(),
        source: sourceName,
        sourceLanguage,
        availableLanguages,
        resumeLanguages,
      },
      person: parsed.person,
      contact: cleanContacts(parsed.contact ?? []),
      personalInfo: parsed.personalInfo ?? [],
      summary: parsed.summary,
      education: parsed.education ?? [],
      skills: parsed.skills ?? [],
      certifications: parsed.certifications ?? [],
      experience: parsed.experience ?? [],
      projects: parsed.projects ?? [],
      activities: parsed.activities ?? [],
    },
    sourceLanguage,
    availableLanguages,
    resumeLanguages,
  };
}

/** Warn about localized pairs whose Greek side looks untranslated. */
export function findUntranslated(node, path = "", problems = []) {
  if (node && typeof node === "object") {
    if (typeof node.en === "string" && typeof node.el === "string") {
      const hasGreek = /[\u0370-\u03ff\u1f00-\u1fff]/.test(node.el);
      if (!hasGreek && node.el === node.en && node.en.split(/\s+/).length > 3) {
        problems.push(`${path}: Greek text looks untranslated ("${node.en.slice(0, 50)}...")`);
      }
      return problems;
    }
    for (const [key, value] of Object.entries(node)) {
      findUntranslated(value, path ? `${path}.${key}` : key, problems);
    }
  }
  return problems;
}


// ------------------------------------------------------- translation helpers

/**
 * Walk every {en, el} leaf in a parsed CV, in a fixed order.
 *
 * The order is whatever `expandSingleLanguage` built, which is deterministic,
 * so the same walk can be used to read the strings out and to write the
 * translations back in. That is what makes the translation pass safe: the two
 * sides are matched by position in one traversal, never by guessing which
 * entry corresponds to which.
 */
function walkLocalized(node, visit) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walkLocalized(item, visit);
    return;
  }
  if (typeof node.en === "string" && typeof node.el === "string") {
    visit(node);
    return;
  }
  for (const value of Object.values(node)) walkLocalized(value, visit);
}

/** Every localized string in traversal order, taken from `from`. */
export function collectLocalized(parsed, from) {
  const out = [];
  walkLocalized(parsed, (leaf) => out.push(leaf[from]));
  return out;
}

/**
 * Write translations back into the `to` slot, in the same traversal order.
 *
 * A missing or empty translation leaves the original text in place: half a
 * Greek CV with English gaps is better than blanks where sentences were.
 * Returns how many leaves actually changed.
 */
export function applyLocalized(parsed, translations, to) {
  let index = 0;
  let applied = 0;
  walkLocalized(parsed, (leaf) => {
    const value = translations[index];
    index += 1;
    if (typeof value === "string" && value.trim()) {
      leaf[to] = value;
      applied += 1;
    }
  });
  return applied;
}
