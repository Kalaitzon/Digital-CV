/**
 * Language context.
 *
 * English is the default language. The user's choice is persisted in
 * localStorage so a returning visitor keeps their preference.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { META, type Lang, type Localized } from "../data/cv";
import { UI, type UiKey } from "./strings";

const STORAGE_KEY = "cv-site:lang";
const DEFAULT_LANG: Lang = "en";

/**
 * Languages this build can actually show, in menu order.
 *
 * Older cv.json files have no `availableLanguages`, so both are assumed —
 * that matches how those files were produced.
 */
export const AVAILABLE_LANGS: Lang[] = (() => {
  const declared = META.availableLanguages;
  const valid = (declared ?? ["en", "el"]).filter((lang): lang is Lang => lang === "en" || lang === "el");
  return valid.length ? valid : ["en", "el"];
})();

/** English when the CV has it, otherwise whatever single language it has. */
const INITIAL_LANG: Lang = AVAILABLE_LANGS.includes(DEFAULT_LANG) ? DEFAULT_LANG : AVAILABLE_LANGS[0];

interface LanguageContextValue {
  lang: Lang;
  /** Languages this build publishes; length 1 means no switcher. */
  available: Lang[];
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  /** Resolve a `Localized` object into the active language. */
  t: (value: Localized) => string;
  /** Resolve a UI chrome string by key. */
  ui: (key: UiKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang {
  if (typeof window === "undefined") return INITIAL_LANG;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  // A stored choice is honoured only while that language is still published.
  return stored === "el" || stored === "en"
    ? AVAILABLE_LANGS.includes(stored)
      ? stored
      : INITIAL_LANG
    : INITIAL_LANG;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  // Keep <html lang> in sync for screen readers and SEO.
  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    if (AVAILABLE_LANGS.includes(next)) setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const index = AVAILABLE_LANGS.indexOf(prev);
      return AVAILABLE_LANGS[(index + 1) % AVAILABLE_LANGS.length];
    });
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      available: AVAILABLE_LANGS,
      setLang,
      toggleLang,
      t: (value: Localized) => value[lang],
      ui: (key: UiKey) => UI[key][lang],
    }),
    [lang, setLang, toggleLang],
  );

  return <LanguageContext value={value}>{children}</LanguageContext>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
