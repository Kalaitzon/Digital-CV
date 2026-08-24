/**
 * Minimal window manager.
 *
 * Tracks which windows are open, their geometry, stacking order and
 * minimized/maximized state. Geometry is stored in pixels relative to the
 * desktop area (the viewport minus the taskbar).
 */

import { useCallback, useState } from "react";

export interface WindowState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** Geometry remembered while maximized so Restore can put it back. */
  restore?: { x: number; y: number; width: number; height: number };
}

export interface WindowSpawnHint {
  width?: number;
  height?: number;
}

/** Windows open slightly offset from each other so they never stack perfectly. */
const CASCADE_STEP = 28;
const MAX_CASCADE = 6;

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [topZ, setTopZ] = useState(10);
  const [openCount, setOpenCount] = useState(0);

  const focus = useCallback((id: string) => {
    setTopZ((z) => {
      const next = z + 1;
      setWindows((ws) =>
        ws.map((w) => (w.id === id ? { ...w, z: next, minimized: false } : w)),
      );
      return next;
    });
  }, []);

  const open = useCallback(
    (id: string, hint: WindowSpawnHint = {}) => {
      setWindows((ws) => {
        const existing = ws.find((w) => w.id === id);
        if (existing) return ws; // Focus is handled separately below.

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const isSmall = vw < 760;

        const width = Math.min(hint.width ?? 620, vw - 24);
        const height = Math.min(hint.height ?? 460, vh - 100);
        const step = (openCount % MAX_CASCADE) * CASCADE_STEP;

        const x = isSmall
          ? Math.max(8, (vw - width) / 2)
          : Math.max(12, Math.min((vw - width) / 2 - 60 + step, vw - width - 12));
        const y = isSmall ? 12 : Math.max(12, 48 + step);

        return [
          ...ws,
          {
            id,
            x,
            y,
            width,
            height,
            z: topZ + 1,
            minimized: false,
            maximized: isSmall, // Phones get full-screen windows by default.
          },
        ];
      });
      setOpenCount((c) => c + 1);
      setTopZ((z) => z + 1);
      focus(id);
    },
    [focus, openCount, topZ],
  );

  const close = useCallback((id: string) => {
    setWindows((ws) => ws.filter((w) => w.id !== id));
  }, []);

  const closeAll = useCallback(() => setWindows([]), []);

  const toggleMinimize = useCallback((id: string) => {
    setWindows((ws) =>
      ws.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w)),
    );
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows((ws) =>
      ws.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) {
          const r = w.restore ?? { x: w.x, y: w.y, width: w.width, height: w.height };
          return { ...w, ...r, maximized: false, restore: undefined };
        }
        return {
          ...w,
          maximized: true,
          restore: { x: w.x, y: w.y, width: w.width, height: w.height },
        };
      }),
    );
  }, []);

  const move = useCallback((id: string, x: number, y: number) => {
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, x, y } : w)));
  }, []);

  const resize = useCallback((id: string, width: number, height: number) => {
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, width, height } : w)));
  }, []);

  /** Open if closed, otherwise focus (or un-minimize) an existing window. */
  const toggleOpen = useCallback(
    (id: string, hint?: WindowSpawnHint) => {
      setWindows((ws) => {
        if (ws.some((w) => w.id === id)) {
          focus(id);
          return ws;
        }
        return ws;
      });
      open(id, hint);
    },
    [focus, open],
  );

  return {
    windows,
    open: toggleOpen,
    close,
    closeAll,
    focus,
    toggleMinimize,
    toggleMaximize,
    move,
    resize,
    topZ,
  };
}
