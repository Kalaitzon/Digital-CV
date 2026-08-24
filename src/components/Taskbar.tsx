/**
 * Taskbar: Start button, one button per open window, quick language toggle
 * and a live clock in the system tray.
 */

import { useEffect, useState } from "react";
import { APP_BY_ID } from "../data/apps";
import type { WindowState } from "../hooks/useWindowManager";
import { useLanguage } from "../i18n/LanguageContext";
import { FlagIcon } from "./Icons";

interface TaskbarProps {
  windows: WindowState[];
  activeId: string | null;
  startOpen: boolean;
  onToggleStart: () => void;
  onTaskClick: (id: string) => void;
}

/**
 * Clock that stays in step with the system clock.
 *
 * A plain `setInterval` drifts: it starts whenever the component mounts, so
 * the displayed minute can lag the real one by almost a full interval. This
 * instead schedules the next tick for the exact moment the minute rolls over,
 * then re-aligns after every tick, so the shown time is never behind.
 */
function useClock(locale: string) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: number;

    const scheduleNextTick = () => {
      const current = new Date();
      setNow(current);
      const msUntilNextMinute = 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds());
      timer = window.setTimeout(scheduleNextTick, msUntilNextMinute + 50);
    };

    scheduleNextTick();
    // Waking from sleep or returning to a background tab re-syncs immediately.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        scheduleNextTick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function Taskbar({
  windows,
  activeId,
  startOpen,
  onToggleStart,
  onTaskClick,
}: TaskbarProps) {
  const { ui, lang, toggleLang, available } = useLanguage();
  const clock = useClock(lang === "el" ? "el-GR" : "en-GB");

  return (
    <footer className="taskbar">
      <button
        type="button"
        className={`start-button${startOpen ? " is-open" : ""}`}
        onClick={onToggleStart}
        aria-expanded={startOpen}
      >
        <FlagIcon className="start-button__flag" />
        <span>{ui("start")}</span>
      </button>

      <div className="taskbar__tasks" aria-label={ui("allWindows")}>
        {windows.map((w) => {
          const app = APP_BY_ID.get(w.id);
          if (!app) return null;
          const Icon = app.icon;
          return (
            <button
              type="button"
              key={w.id}
              className={`taskbar__task${w.id === activeId && !w.minimized ? " is-active" : ""}`}
              onClick={() => onTaskClick(w.id)}
            >
              <Icon className="taskbar__icon" />
              <span>{ui(app.titleKey)}</span>
            </button>
          );
        })}
      </div>

      <div className="taskbar__tray">
        {/*
         * The credit lives in the tray rather than on the wallpaper because a
         * maximized window covers the desktop entirely — this is the one strip
         * that is always on screen, whatever is open.
         */}
        <span className="taskbar__credit">{ui("copyright")}</span>
        {/* One published language means nothing to switch between. */}
        {available.length > 1 && (
          <button
            type="button"
            className="taskbar__lang"
            onClick={toggleLang}
            title={ui("language")}
            aria-label={ui("language")}
          >
            {lang === "en" ? "EN" : "ΕΛ"}
          </button>
        )}
        <time className="taskbar__clock">{clock}</time>
      </div>
    </footer>
  );
}
