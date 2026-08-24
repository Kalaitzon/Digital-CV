/**
 * XP-style Start menu.
 *
 * Left column: the CV "programs". Right column: language and theme switching
 * plus a shortcut to close everything.
 */

import { useEffect, useRef } from "react";
import { APPS } from "../data/apps";
import { THEMES } from "../data/themes";
import { PERSON } from "../data/cv";
import { useLanguage } from "../i18n/LanguageContext";
import { useTheme } from "../theme/ThemeContext";
import { LanguageIcon } from "./Icons";

interface StartMenuProps {
  open: boolean;
  onClose: () => void;
  onLaunch: (appId: string) => void;
  onCloseAll: () => void;
}

export function StartMenu({ open, onClose, onLaunch, onCloseAll }: StartMenuProps) {
  const { t, ui, lang, setLang, available } = useLanguage();
  const { theme, setTheme } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape, like the real Start menu.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (panelRef.current?.contains(target)) return;
      if (target.closest(".start-button")) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="start-menu" ref={panelRef} role="menu">
      <header className="start-menu__header">
        <span className="start-menu__avatar" aria-hidden="true">
          {t(PERSON.firstName).charAt(0)}
          {t(PERSON.lastName).charAt(0)}
        </span>
        <span className="start-menu__user">
          {t(PERSON.firstName)} {t(PERSON.lastName)}
        </span>
      </header>

      <div className="start-menu__columns">
        <ul className="start-menu__column start-menu__column--left">
          {APPS.map((app) => {
            const Icon = app.icon;
            return (
              <li key={app.id}>
                <button
                  type="button"
                  role="menuitem"
                  className="start-menu__item"
                  onClick={() => {
                    onLaunch(app.id);
                    onClose();
                  }}
                >
                  <Icon className="start-menu__icon" />
                  <span>{ui(app.titleKey)}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="start-menu__column start-menu__column--right">
          {/* Only shown when the CV was published in more than one language. */}
          {available.length > 1 && (
            <>
              <p className="start-menu__group-title">
                <LanguageIcon className="start-menu__icon" /> {ui("language")}
              </p>
              <div className="start-menu__toggle">
                {available.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`xp-button${lang === code ? " is-active" : ""}`}
                    onClick={() => setLang(code)}
                    aria-pressed={lang === code}
                  >
                    {code === "en" ? "English" : "Ελληνικά"}
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="start-menu__group-title">{ui("theme")}</p>
          <ul className="start-menu__themes">
            {THEMES.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="menuitem"
                  className={`start-menu__item start-menu__item--theme${
                    option.id === theme ? " is-active" : ""
                  }`}
                  onClick={() => setTheme(option.id)}
                  aria-pressed={option.id === theme}
                >
                  <span
                    className="start-menu__swatch"
                    style={{
                      background: `linear-gradient(135deg, ${option.swatch[0]} 0%, ${option.swatch[1]} 100%)`,
                    }}
                  />
                  <span>{t(option.label)}</span>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            role="menuitem"
            className="start-menu__item start-menu__item--danger"
            onClick={() => {
              onCloseAll();
              onClose();
            }}
          >
            {ui("closeAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
