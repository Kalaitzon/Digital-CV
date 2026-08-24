/**
 * XP-style boot / welcome screen.
 *
 * Shows a short progress animation, then a "log on" panel. It is skipped
 * automatically for visitors who prefer reduced motion, and can be dismissed
 * at any time by clicking or pressing a key.
 */

import { useEffect, useState } from "react";
import { PERSON } from "../data/cv";
import { useLanguage } from "../i18n/LanguageContext";
import { FlagIcon, RetroFlagIcon } from "./Icons";
import { useTheme } from "../theme/ThemeContext";

const BOOT_DURATION_MS = 1800;

export function BootScreen({ onDone }: { onDone: () => void }) {
  const { t, ui } = useLanguage();
  const { theme } = useTheme();
  const [phase, setPhase] = useState<"boot" | "welcome">("boot");
  // The 98 theme starts up under the era's own emblem; the rest keep the XP one.
  const Emblem = theme === "win98" ? RetroFlagIcon : FlagIcon;

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      onDone();
      return;
    }
    const timer = window.setTimeout(() => setPhase("welcome"), BOOT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  // Any interaction skips ahead.
  useEffect(() => {
    const skip = () => onDone();
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [onDone]);

  return (
    <div
      className={`boot boot--${phase}`}
      onClick={onDone}
      role="presentation"
    >
      {phase === "boot" ? (
        <div className="boot__inner">
          <Emblem className="boot__flag" />
          <p className="boot__brand">
            {t(PERSON.firstName)} {t(PERSON.lastName)}
          </p>
          <div className="boot__bar" aria-hidden="true">
            <span />
          </div>
          <p className="boot__status">{ui("booting")}</p>
        </div>
      ) : (
        <div className="boot__logon">
          <p className="boot__welcome">{ui("welcome")}</p>
          <div className="boot__user">
            <span className="boot__avatar" aria-hidden="true">
              {t(PERSON.firstName).charAt(0)}
              {t(PERSON.lastName).charAt(0)}
            </span>
            <div>
              <p className="boot__username">
                {t(PERSON.firstName)} {t(PERSON.lastName)}
              </p>
              <p className="boot__hint">{ui("clickToEnter")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
