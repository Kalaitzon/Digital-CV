/**
 * Site-wide settings that a CV document cannot contain.
 *
 * Everything here survives every import, because no PDF can tell the site
 * about a companion website. This is the one file to edit when reusing the
 * template for someone else.
 */

import { CONTACT, META, type Lang } from "./cv";

/**
 * The two downloadable PDFs, resolved against Vite's BASE_URL so the links
 * keep working under a sub-path as well as at a domain root. Both the import
 * endpoint and `npm run import-cv` write them here automatically, filed by the
 * language each document is actually written in.
 */
export const RESUME_FILES: Record<Lang, string> = {
  en: `${import.meta.env.BASE_URL}CV_EN.pdf`,
  el: `${import.meta.env.BASE_URL}CV_EL.pdf`,
};

/**
 * Languages that have a downloadable PDF.
 *
 * Every published language does: the one the author uploaded, plus any other
 * typeset at build time by `scripts/make-resume-pdf.mjs` from the same
 * cv.json. `meta.resumeLanguages` still records which one was the real
 * upload — that is what stops the generator overwriting it.
 */
export const RESUME_LANGS: Lang[] = (() => {
  const declared = (META.availableLanguages ?? ["en", "el"]).filter(
    (lang): lang is Lang => lang === "en" || lang === "el",
  );
  return declared.length ? declared : ["en", "el"];
})();

/**
 * Companion site, if you have one.
 *
 * Set this to "" and the Portfolio icon disappears from the desktop and the
 * Start menu entirely — most people have no second site to link to.
 */
const PORTFOLIO_SITE = "https://msc-portfolio-theta.vercel.app/";

/**
 * Who the portfolio above belongs to, by e-mail address.
 *
 * A portfolio is personal in a way the rest of the site is not: publish
 * someone else's CV here and their page would still advertise the previous
 * owner's work as if it were theirs. Matching on the e-mail in the published
 * CV — not the name, which two people can share — makes the icon appear for
 * its owner and quietly disappear for everyone else.
 *
 * Set it to "" to skip the check and always show the portfolio.
 */
const PORTFOLIO_OWNER_EMAIL = "john.kalaitzidis.2002@gmail.com";

/** The e-mail addresses the currently published CV lists. */
const CV_EMAILS = CONTACT.filter((c) => c.href.startsWith("mailto:")).map((c) =>
  c.href.slice("mailto:".length).trim().toLowerCase(),
);

const ownsPortfolio =
  PORTFOLIO_OWNER_EMAIL.trim() === "" ||
  CV_EMAILS.includes(PORTFOLIO_OWNER_EMAIL.trim().toLowerCase());

/** Empty unless this build publishes the portfolio owner's own CV. */
export const PORTFOLIO_URL = ownsPortfolio ? PORTFOLIO_SITE : "";
