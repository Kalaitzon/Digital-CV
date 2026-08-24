#!/usr/bin/env node
/**
 * Build-time PDF generator for languages that were never uploaded.
 *
 * A single upload publishes the site in both languages, but only one PDF ever
 * exists — the file the author supplied. Without this, the Resume window in
 * the other language would either link to a missing file or hand the visitor
 * a CV in a language they did not ask for.
 *
 * So the missing language is typeset here, from the same `cv.json` the site
 * renders. It runs as `prebuild`, which means every deploy regenerates it and
 * it can never drift from the published content.
 *
 * What it is not: a copy of the author's own layout. It is a clean, plain
 * document carrying the same words. The uploaded PDF is always preferred and
 * is never overwritten.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CV_JSON = resolve(root, "src/data/cv.json");
const OUT_DIR = resolve(root, "public");
const FONTS = {
  regular: resolve(root, "assets/fonts/cv-regular.ttf"),
  bold: resolve(root, "assets/fonts/cv-bold.ttf"),
};

/** A4 in points, with generous margins so the text block stays readable. */
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = { top: 56, bottom: 56, left: 56, right: 56 };
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;

const INK = rgb(0.09, 0.11, 0.16);
const MUTED = rgb(0.38, 0.42, 0.5);
const ACCENT = rgb(0.05, 0.31, 0.65);
const RULE = rgb(0.78, 0.81, 0.86);

const UI = {
  en: {
    summary: "Summary",
    details: "Personal details",
    education: "Education",
    certifications: "Certifications",
    skills: "Skills",
    experience: "Experience",
    projects: "Projects",
    activities: "Activities",
    contact: "Contact",
    generated: "Generated from the published CV",
  },
  el: {
    summary: "Περίληψη",
    details: "Προσωπικά στοιχεία",
    education: "Εκπαίδευση",
    certifications: "Πιστοποιήσεις",
    skills: "Δεξιότητες",
    experience: "Εμπειρία",
    projects: "Projects",
    activities: "Δραστηριότητες",
    contact: "Επικοινωνία",
    generated: "Δημιουργήθηκε από το δημοσιευμένο βιογραφικό",
  },
};

/**
 * A cursor that lays text down the page and starts a new one when it runs out.
 *
 * Everything below draws through this, so page breaks are handled in exactly
 * one place instead of at every call site.
 */
function createWriter(pdf, fonts) {
  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN.top;

  const space = (amount) => {
    y -= amount;
  };

  const ensure = (needed) => {
    if (y - needed >= MARGIN.bottom) return;
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - MARGIN.top;
  };

  /** Split `text` into lines that fit `width` at `size`, breaking on spaces. */
  const wrap = (text, font, size, width) => {
    const lines = [];
    for (const paragraph of String(text ?? "").split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) {
          line = candidate;
          continue;
        }
        if (line) lines.push(line);
        line = word;
      }
      lines.push(line);
    }
    return lines.length ? lines : [""];
  };

  const text = (value, options = {}) => {
    const {
      font = fonts.regular,
      size = 10,
      color = INK,
      indent = 0,
      lineHeight = 1.38,
      gapAfter = 0,
    } = options;
    const width = CONTENT_WIDTH - indent;
    const step = size * lineHeight;
    for (const line of wrap(value, font, size, width)) {
      ensure(step);
      page.drawText(line, { x: MARGIN.left + indent, y: y - size, size, font, color });
      y -= step;
    }
    y -= gapAfter;
  };

  /**
   * Upper-case a heading the way Greek typography expects.
   *
   * Greek drops the tonos when a word is set in capitals — "Περίληψη" becomes
   * "ΠΕΡΙΛΗΨΗ", not "ΠΕΡΊΛΗΨΗ", which is what a plain toUpperCase() produces.
   * The diaeresis is kept, because that one does survive capitalisation.
   */
  const capitalise = (label) =>
    String(label)
      .toUpperCase()
      .normalize("NFD")
      .replace(/\u0301/g, "")
      .normalize("NFC");

  /** Section heading with a rule under it. */
  const heading = (label) => {
    // Keep a heading with at least a line of its section, never alone at the foot.
    ensure(46);
    y -= 10;
    page.drawText(capitalise(label), {
      x: MARGIN.left,
      y: y - 11,
      size: 11,
      font: fonts.bold,
      color: ACCENT,
    });
    y -= 17;
    page.drawLine({
      start: { x: MARGIN.left, y },
      end: { x: PAGE.width - MARGIN.right, y },
      thickness: 0.7,
      color: RULE,
    });
    y -= 10;
  };

  /** Title on the left, dates flush right on the same baseline. */
  const titleWithPeriod = (title, period) => {
    const size = 10.5;
    ensure(size * 1.5);
    const periodText = String(period ?? "");
    const periodWidth = periodText ? fonts.regular.widthOfTextAtSize(periodText, 9) : 0;
    const titleWidth = CONTENT_WIDTH - periodWidth - 12;
    const lines = wrap(title, fonts.bold, size, titleWidth);

    page.drawText(lines[0], { x: MARGIN.left, y: y - size, size, font: fonts.bold, color: INK });
    if (periodText) {
      page.drawText(periodText, {
        x: PAGE.width - MARGIN.right - periodWidth,
        y: y - size,
        size: 9,
        font: fonts.regular,
        color: MUTED,
      });
    }
    y -= size * 1.45;
    for (const line of lines.slice(1)) {
      ensure(size * 1.45);
      page.drawText(line, { x: MARGIN.left, y: y - size, size, font: fonts.bold, color: INK });
      y -= size * 1.45;
    }
  };

  const bullet = (value) => {
    ensure(14);
    page.drawText("•", { x: MARGIN.left + 4, y: y - 10, size: 10, font: fonts.regular, color: MUTED });
    text(value, { indent: 16, size: 9.5, gapAfter: 1 });
  };

  return { text, heading, titleWithPeriod, bullet, space, get y() { return y; } };
}

/** Pick one language out of a {en, el} pair. */
const pick = (value, lang) =>
  value && typeof value === "object" ? String(value[lang] ?? value.en ?? "") : String(value ?? "");

function buildPdfBytes(cv, lang) {
  return PDFDocument.create().then(async (pdf) => {
    pdf.registerFontkit(fontkit);
    const fonts = {
      regular: await pdf.embedFont(readFileSync(FONTS.regular), { subset: true }),
      bold: await pdf.embedFont(readFileSync(FONTS.bold), { subset: true }),
    };
    const t = UI[lang];
    const w = createWriter(pdf, fonts);
    const say = (value) => pick(value, lang);

    const name = `${say(cv.person?.firstName)} ${say(cv.person?.lastName)}`.trim();
    pdf.setTitle(`${name} — CV`);
    pdf.setAuthor(name);
    pdf.setCreator("Digital CV");

    w.text(name, { font: fonts.bold, size: 20 });
    if (cv.person?.headline) w.text(say(cv.person.headline), { size: 11, color: MUTED });

    const contacts = (cv.contact ?? []).map((c) => c.value).filter(Boolean);
    if (contacts.length) w.text(contacts.join("  ·  "), { size: 9, color: MUTED, gapAfter: 2 });

    if (cv.summary) {
      w.heading(t.summary);
      w.text(say(cv.summary), { size: 10 });
    }

    if (cv.personalInfo?.length) {
      w.heading(t.details);
      for (const row of cv.personalInfo) {
        w.text(`${say(row.label)}: ${say(row.value)}`, { size: 9.5 });
      }
    }

    if (cv.education?.length) {
      w.heading(t.education);
      for (const entry of cv.education) {
        w.titleWithPeriod(say(entry.degree), say(entry.period));
        w.text(say(entry.institution), { size: 9.5, color: MUTED });
        for (const highlight of entry.highlights ?? []) w.bullet(say(highlight));
        w.space(6);
      }
    }

    if (cv.certifications?.length) {
      w.heading(t.certifications);
      for (const c of cv.certifications) w.bullet(`${say(c.name)} — ${say(c.issuer)}`);
    }

    if (cv.skills?.length) {
      w.heading(t.skills);
      for (const group of cv.skills) {
        w.text(`${say(group.label)}: ${(group.items ?? []).join(", ")}`, { size: 9.5, gapAfter: 3 });
      }
    }

    if (cv.experience?.length) {
      w.heading(t.experience);
      for (const entry of cv.experience) {
        w.titleWithPeriod(say(entry.role), say(entry.period));
        const org = [say(entry.organization), say(entry.location)].filter(Boolean).join(" — ");
        if (org) w.text(org, { size: 9.5, color: MUTED });
        for (const line of entry.bullets ?? []) w.bullet(say(line));
        w.space(6);
      }
    }

    if (cv.projects?.length) {
      w.heading(t.projects);
      for (const group of cv.projects) {
        w.titleWithPeriod(say(group.title), say(group.period));
        for (const item of group.items ?? []) w.bullet(`${say(item.name)}: ${say(item.description)}`);
        w.space(6);
      }
    }

    if (cv.activities?.length) {
      w.heading(t.activities);
      for (const a of cv.activities) {
        w.text(say(a.title), { font: fonts.bold, size: 10 });
        w.text(say(a.description), { size: 9.5, gapAfter: 4 });
      }
    }

    if (cv.contact?.length) {
      w.heading(t.contact);
      for (const c of cv.contact) w.text(`${say(c.label)}: ${c.value}`, { size: 9.5 });
    }

    return pdf.save();
  });
}

// ----------------------------------------------------------------------- run

if (!existsSync(CV_JSON)) {
  console.log("make-resume-pdf: no cv.json yet — nothing to do.");
  process.exit(0);
}

const cv = JSON.parse(readFileSync(CV_JSON, "utf8"));
const meta = cv.meta ?? {};
const published = (meta.availableLanguages ?? ["en", "el"]).filter((l) => l === "en" || l === "el");
/* Languages whose PDF the author actually uploaded — never regenerate those. */
const uploaded = new Set((meta.resumeLanguages ?? published).filter((l) => l === "en" || l === "el"));
const missing = published.filter((lang) => !uploaded.has(lang));

if (!missing.length) {
  console.log("make-resume-pdf: every published language already has an uploaded PDF.");
  process.exit(0);
}

if (!existsSync(FONTS.regular) || !existsSync(FONTS.bold)) {
  console.warn("make-resume-pdf: fonts missing under assets/fonts — skipping PDF generation.");
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });

for (const lang of missing) {
  const bytes = await buildPdfBytes(cv, lang);
  const target = resolve(OUT_DIR, `CV_${lang.toUpperCase()}.pdf`);
  writeFileSync(target, bytes);
  console.log(`make-resume-pdf: wrote ${target} (${Math.round(bytes.length / 1024)} kB)`);
}
