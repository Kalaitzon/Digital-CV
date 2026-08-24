/**
 * "Update CV" window — the admin panel.
 *
 * Takes a password and a CV file, posts both to /api/import-cv, and reports
 * what the server extracted. The password is never stored anywhere; it is
 * held in component state for the duration of the request only.
 */

import { useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";

const ACCEPTED = ".pdf";
const MAX_BYTES = 3 * 1024 * 1024;

interface ImportResult {
  sourceLanguage: "en" | "el";
  availableLanguages: ("en" | "el")[];
  translated: boolean;
  /** How many fields the second pass actually wrote. */
  translatedFields: number;
  provider: string;
  model: string;
  pdfCommitted: string[];
  counts: Record<string, number>;
  warnings: string[];
}

/** Read a File into a base64 string without the data: prefix. */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

/** Eye glyph for the reveal button; a slash is added when the value is visible. */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <path
        d="M1 8s2.6-4.5 7-4.5S15 8 15 8s-2.6 4.5-7 4.5S1 8 1 8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
      {off && <path d="M2.5 13.5 13.5 2.5" stroke="currentColor" strokeWidth="1.3" />}
    </svg>
  );
}

export function AdminWindow() {
  const { ui } = useLanguage();
  const [password, setPassword] = useState("");
  // Lets the author check a long password before submitting it.
  const [showPassword, setShowPassword] = useState(false);
  /*
   * One file, either language.
   *
   * Keeping a separate CV in each language is work most people never do, so
   * the server writes the other language from this one. The language it is in
   * does not need declaring — the model reads it from the document.
   */
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const canSubmit = password.length > 0 && file !== null && !busy;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || busy) return;

    if (file.size > MAX_BYTES) {
      setError(ui("adminTooLarge"));
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const files = [{ filename: file.name, base64: await toBase64(file), lang: null }];
      const response = await fetch("/api/import-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, files }),
      });

      /*
       * A host with no /api route (the Vite dev server, GitHub Pages) returns
       * the HTML shell instead of JSON. The status code and the host are
       * appended because they are what actually tells the two cases apart when
       * something goes wrong later: 404 on localhost is expected, 404 on the
       * deployed site means the function did not ship.
       */
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          `${ui("adminNoBackend")} [HTTP ${response.status} @ ${window.location.host}]`,
        );
      }

      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);

      setResult(body as ImportResult);
      setPassword("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin">
      <p className="admin__intro">{ui("adminIntro")}</p>

      <form className="admin__form" onSubmit={handleSubmit}>
        <div className="admin__field">
          <label htmlFor="admin-password">{ui("adminPassword")}</label>
          <div className="admin__password">
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              className="xp-input"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
            />
            <button
              type="button"
              className="admin__eye"
              onClick={() => setShowPassword((prev) => !prev)}
              title={ui(showPassword ? "adminHidePassword" : "adminShowPassword")}
              aria-label={ui(showPassword ? "adminHidePassword" : "adminShowPassword")}
              aria-pressed={showPassword}
              disabled={busy}
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
        </div>

        <label className="admin__field">
          <span>{ui("adminFile")}</span>
          <input
            type="file"
            className="xp-input"
            ref={fileInput}
            accept={ACCEPTED}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={busy}
          />
        </label>

        <p className="admin__hint">{ui("adminEitherLanguage")}</p>
        <p className="admin__hint">{ui("adminFormats")}</p>

        <button type="submit" className="xp-button xp-button--primary" disabled={!canSubmit}>
          {busy ? ui("adminWorking") : ui("adminSubmit")}
        </button>
      </form>

      {busy && <p className="admin__status">{ui("adminPatience")}</p>}

      {error && (
        <p className="admin__error" role="alert">
          {ui("adminFailed")}: {error}
        </p>
      )}

      {result && (
        <div className="admin__result" role="status">
          <p className="admin__ok">{ui("adminDone")}</p>
          <ul className="admin__counts">
            <li>
              {ui("education")}: <b>{result.counts.education}</b>
            </li>
            <li>
              {ui("experience")}: <b>{result.counts.experience}</b>
            </li>
            <li>
              {ui("projects")}: <b>{result.counts.projects}</b>
            </li>
            <li>
              {ui("skills")}: <b>{result.counts.skills}</b>
            </li>
          </ul>
          <p className="admin__note">
            {ui("adminSiteLangs")}:{" "}
            <b>
              {(result.availableLanguages ?? [result.sourceLanguage])
                .map((code) => (code === "en" ? "English" : "Ελληνικά"))
                .join(" + ")}
            </b>
          </p>
          {/*
            * Worth surfacing: a translated import that translated nothing
            * still publishes, but both languages would read the same, and the
            * author should know to run it again rather than discover it later.
            */}
          {result.translated && result.translatedFields === 0 && (
            <p className="admin__warn">{ui("adminNoTranslation")}</p>
          )}
          {result.pdfCommitted.length > 0 && (
            <p className="admin__note">
              {ui("adminPdfSaved")}: <b>{result.pdfCommitted.join(", ")}</b>
            </p>
          )}
          <p className="admin__note">{ui("adminRedeploy")}</p>
          <p className="admin__meta">
            {result.provider} · {result.model}
          </p>
          {result.warnings.length > 0 && (
            <ul className="admin__warnings">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
