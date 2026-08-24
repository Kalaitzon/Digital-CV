/**
 * Window body contents — one component per CV section.
 * All of them read from `src/data/cv.ts` through the language context.
 */

import {
  ACTIVITIES,
  CERTIFICATIONS,
  CONTACT,
  EDUCATION,
  EXPERIENCE,
  META,
  PERSON,
  PERSONAL_INFO,
  PROJECTS,
  SKILLS,
  SUMMARY,
} from "../../data/cv";
import { THEMES } from "../../data/themes";
import { useLanguage } from "../../i18n/LanguageContext";
import { useTheme } from "../../theme/ThemeContext";
import { PORTFOLIO_URL, RESUME_FILES, RESUME_LANGS } from "../../data/config";

export function PersonalInfoWindow() {
  const { t } = useLanguage();
  return (
    <dl className="info-grid">
      {PERSONAL_INFO.map((row) => (
        <div className="info-grid__row" key={row.label.en}>
          <dt>{t(row.label)}:</dt>
          <dd>{t(row.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AboutWindow() {
  const { t, ui, lang } = useLanguage();
  // Stamped by `npm run import-cv`; absent when the content is hand-written.
  const updated = META.generatedAt
    ? new Date(META.generatedAt).toLocaleDateString(lang === "el" ? "el-GR" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="prose">
      <h3 className="prose__name">
        {t(PERSON.firstName)} {t(PERSON.lastName)}
      </h3>
      <p className="prose__headline">{t(PERSON.headline)}</p>
      <h4>{ui("summary")}</h4>
      <p>{t(SUMMARY)}</p>
      {updated && (
        <p className="prose__stamp">
          {ui("lastUpdated")}: {updated}
        </p>
      )}
    </div>
  );
}

export function EducationWindow() {
  const { t, ui } = useLanguage();
  return (
    <div className="prose">
      {EDUCATION.map((entry) => (
        <article className="entry" key={entry.degree.en}>
          <header className="entry__head">
            <h4>{t(entry.degree)}</h4>
            <span className="entry__period">{t(entry.period)}</span>
          </header>
          <p className="entry__org">{t(entry.institution)}</p>
          <ul>
            {entry.highlights.map((h) => (
              <li key={h.en}>{t(h)}</li>
            ))}
          </ul>
        </article>
      ))}

      {/* No certifications means no heading, rather than an empty list. */}
      {CERTIFICATIONS.length > 0 && (
        <>
          <h4 className="prose__subhead">{ui("certifications")}</h4>
          <ul>
            {CERTIFICATIONS.map((c) => (
              <li key={c.name.en}>
                <strong>{t(c.name)}</strong> — {t(c.issuer)}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function SkillsWindow() {
  const { t } = useLanguage();
  return (
    <div className="prose">
      {SKILLS.map((group) => (
        <section className="skill-group" key={group.label.en}>
          <h4>{t(group.label)}</h4>
          <ul className="chips">
            {group.items.map((item) => (
              <li className="chip" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ExperienceWindow() {
  const { t } = useLanguage();
  return (
    <div className="prose">
      {EXPERIENCE.map((entry) => (
        <article className="entry" key={entry.role.en + entry.period.en}>
          <header className="entry__head">
            <h4>{t(entry.role)}</h4>
            <span className="entry__period">{t(entry.period)}</span>
          </header>
          <p className="entry__org">
            {t(entry.organization)} — {t(entry.location)}
          </p>
          <ul>
            {entry.bullets.map((b) => (
              <li key={b.en}>{t(b)}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

export function ProjectsWindow() {
  const { t } = useLanguage();
  return (
    <div className="prose">
      {PROJECTS.map((group) => (
        <article className="entry" key={group.title.en}>
          <header className="entry__head">
            <h4>{t(group.title)}</h4>
            <span className="entry__period">{t(group.period)}</span>
          </header>
          <ul>
            {group.items.map((item) => (
              <li key={item.name.en}>
                <strong>{t(item.name)}:</strong> {t(item.description)}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

export function ActivitiesWindow() {
  const { t } = useLanguage();
  return (
    <div className="prose">
      {ACTIVITIES.map((a) => (
        <article className="entry" key={a.title.en}>
          <h4>{t(a.title)}</h4>
          <p>{t(a.description)}</p>
        </article>
      ))}
    </div>
  );
}

/** Compare two URLs ignoring case and any trailing slash. */
function sameLink(a: string, b: string) {
  return a.trim().toLowerCase().replace(/\/+$/, "") === b.trim().toLowerCase().replace(/\/+$/, "");
}

export function ContactWindow() {
  const { t } = useLanguage();
  /*
   * The portfolio already has its own desktop icon, so repeating its link here
   * is noise. Any contact pointing at the same URL is dropped.
   */
  const contacts = CONTACT.filter((c) => !sameLink(c.href, PORTFOLIO_URL));
  return (
    <ul className="contact-list">
      {contacts.map((c) => (
        <li key={c.id}>
          <span className="contact-list__label">{t(c.label)}</span>
          <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
            {c.value}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ResumeWindow() {
  const { ui, lang } = useLanguage();
  /*
   * The download follows the interface language only where that PDF exists.
   * A translated import publishes two languages from one document, so the
   * button falls back to the language that was actually uploaded rather than
   * linking to a missing file.
   */
  const file = RESUME_LANGS.includes(lang) ? lang : RESUME_LANGS[0];
  return (
    <div className="prose resume-pane">
      <p>{ui("openCvHint")}</p>
      <a
        className="xp-button xp-button--primary"
        href={RESUME_FILES[file]}
        target="_blank"
        rel="noreferrer"
      >
        {file === "en" ? ui("downloadCvEn") : ui("downloadCvEl")}
      </a>
      {/* Only worth saying when both PDFs exist and the button can change. */}
      {RESUME_LANGS.length > 1 && <p className="resume-pane__note">{ui("resumeLangNote")}</p>}
    </div>
  );
}

/** Shortcut window linking out to the separate MSc portfolio site. */
export function PortfolioWindow() {
  const { ui } = useLanguage();
  return (
    <div className="prose resume-pane">
      <p>{ui("portfolioBlurb")}</p>
      <a className="xp-button xp-button--primary" href={PORTFOLIO_URL} target="_blank" rel="noreferrer">
        {ui("openPortfolio")}
      </a>
    </div>
  );
}

/** Display Properties — theme picker, styled like the XP appearance dialog. */
export function SettingsWindow() {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-picker">
      {THEMES.map((option) => (
        <button
          type="button"
          key={option.id}
          className={`theme-card${option.id === theme ? " is-selected" : ""}`}
          onClick={() => setTheme(option.id)}
          aria-pressed={option.id === theme}
        >
          <span
            className="theme-card__swatch"
            style={{
              background: `linear-gradient(135deg, ${option.swatch[0]} 0%, ${option.swatch[1]} 100%)`,
            }}
          />
          <span className="theme-card__label">{t(option.label)}</span>
        </button>
      ))}
    </div>
  );
}
