/**
 * Root component: the desktop shell.
 *
 * Composes the boot screen, the desktop icon grid, all open windows,
 * the Start menu and the taskbar.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { BootScreen } from "./components/BootScreen";
import { DesktopIcon } from "./components/DesktopIcon";
import { StartMenu } from "./components/StartMenu";
import { Taskbar } from "./components/Taskbar";
import { Window } from "./components/Window";
import { APPS, APP_BY_ID } from "./data/apps";
import { PERSON } from "./data/cv";
import { useWindowManager } from "./hooks/useWindowManager";
import { useLanguage } from "./i18n/LanguageContext";

export default function App() {
  const { t, ui } = useLanguage();
  const wm = useWindowManager();
  const [booted, setBooted] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  // Browser-tab title: whose CV this is, and what the page is. Nothing more —
  // a headline in a tab is truncated to noise.
  useEffect(() => {
    document.title = `${t(PERSON.firstName)} ${t(PERSON.lastName)} — ${ui("siteTitleSuffix")}`;
  }, [t, ui]);

  // Open a first window once the user is "logged on", so the desktop is not empty.
  const handleBootDone = useCallback(() => {
    setBooted(true);
    wm.open("about", { width: 600, height: 420 });
  }, [wm]);

  const launch = useCallback(
    (appId: string) => {
      const app = APP_BY_ID.get(appId);
      wm.open(appId, app?.size);
    },
    [wm],
  );

  const activeId = useMemo(() => {
    const visible = wm.windows.filter((w) => !w.minimized);
    if (visible.length === 0) return null;
    return visible.reduce((top, w) => (w.z > top.z ? w : top)).id;
  }, [wm.windows]);

  const desktopApps = useMemo(() => APPS.filter((a) => a.onDesktop), []);

  if (!booted) return <BootScreen onDone={handleBootDone} />;

  return (
    <div className="desktop">
      <div
        className="desktop__surface"
        onPointerDown={(event) => {
          // Clicking empty desktop clears the icon selection.
          if (event.target === event.currentTarget) setSelectedIcon(null);
        }}
      >
        <div className="desktop__icons">
          {desktopApps.map((app) => {
            const Icon = app.icon;
            return (
              <DesktopIcon
                key={app.id}
                label={ui(app.titleKey)}
                icon={<Icon />}
                selected={selectedIcon === app.id}
                onSelect={() => setSelectedIcon(app.id)}
                onOpen={() => launch(app.id)}
              />
            );
          })}
        </div>

        {/* The credit moved to the taskbar tray, where nothing can cover it. */}
        <p className="desktop__hint">{ui("desktopHint")}</p>

        {wm.windows.map((state) => {
          const app = APP_BY_ID.get(state.id);
          if (!app) return null;
          const Icon = app.icon;
          return (
            <Window
              key={state.id}
              state={state}
              title={ui(app.titleKey)}
              icon={<Icon />}
              isActive={state.id === activeId}
              onFocus={() => wm.focus(state.id)}
              onClose={() => wm.close(state.id)}
              onMinimize={() => wm.toggleMinimize(state.id)}
              onMaximize={() => wm.toggleMaximize(state.id)}
              onMove={(x, y) => wm.move(state.id, x, y)}
              onResize={(w, h) => wm.resize(state.id, w, h)}
            >
              {app.render()}
            </Window>
          );
        })}
      </div>

      <StartMenu
        open={startOpen}
        onClose={() => setStartOpen(false)}
        onLaunch={launch}
        onCloseAll={wm.closeAll}
      />

      <Taskbar
        windows={wm.windows}
        activeId={activeId}
        startOpen={startOpen}
        onToggleStart={() => setStartOpen((v) => !v)}
        onTaskClick={(id) => {
          const target = wm.windows.find((w) => w.id === id);
          if (target && target.id === activeId && !target.minimized) {
            wm.toggleMinimize(id);
          } else {
            wm.focus(id);
          }
        }}
      />
    </div>
  );
}
