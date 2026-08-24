/**
 * A draggable, resizable XP-style window.
 *
 * Pointer Events are used for drag/resize so mouse, touch and pen all work
 * through the same code path. Dragging is disabled while maximized.
 */

import { useCallback, useRef, type ReactNode } from "react";
import type { WindowState } from "../hooks/useWindowManager";
import { useLanguage } from "../i18n/LanguageContext";

const MIN_WIDTH = 280;
const MIN_HEIGHT = 180;
/** Height of the taskbar, kept in sync with `--taskbar-height` in app.css. */
const TASKBAR_HEIGHT = 40;

interface WindowProps {
  state: WindowState;
  title: string;
  icon: ReactNode;
  isActive: boolean;
  children: ReactNode;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
}

export function Window({
  state,
  title,
  icon,
  isActive,
  children,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onMove,
  onResize,
}: WindowProps) {
  const { ui } = useLanguage();
  const dragOrigin = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });
  const resizeOrigin = useRef({ pointerX: 0, pointerY: 0, width: 0, height: 0 });

  const handleDragStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (state.maximized) return;
      // Ignore drags that start on the window buttons.
      if ((event.target as HTMLElement).closest("button")) return;

      onFocus();
      dragOrigin.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        x: state.x,
        y: state.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [onFocus, state.maximized, state.x, state.y],
  );

  const handleDragMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const o = dragOrigin.current;
      const nextX = o.x + (event.clientX - o.pointerX);
      const nextY = o.y + (event.clientY - o.pointerY);
      // Keep at least a sliver of the title bar reachable on every edge.
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - TASKBAR_HEIGHT - 32;
      onMove(
        Math.min(Math.max(nextX, 40 - state.width), maxX),
        Math.min(Math.max(nextY, 0), maxY),
      );
    },
    [onMove, state.width],
  );

  const endPointer = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onFocus();
      resizeOrigin.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        width: state.width,
        height: state.height,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [onFocus, state.height, state.width],
  );

  const handleResizeMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const o = resizeOrigin.current;
      onResize(
        Math.max(MIN_WIDTH, o.width + (event.clientX - o.pointerX)),
        Math.max(MIN_HEIGHT, o.height + (event.clientY - o.pointerY)),
      );
    },
    [onResize],
  );

  if (state.minimized) return null;

  /*
   * Maximized fills the whole desktop surface.
   *
   * The surface is already the area above the taskbar — it is a flex child
   * sitting next to it — so subtracting the taskbar height here as well left a
   * strip of empty wallpaper along the bottom of every maximized window.
   */
  const geometry = state.maximized
    ? { left: 0, top: 0, width: "100%", height: "100%" }
    : { left: state.x, top: state.y, width: state.width, height: state.height };

  return (
    <section
      className={`xp-window${isActive ? " is-active" : ""}${state.maximized ? " is-maximized" : ""}`}
      style={{ ...geometry, zIndex: state.z }}
      onPointerDown={onFocus}
      aria-label={title}
    >
      <div
        className="xp-window__titlebar"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDoubleClick={onMaximize}
      >
        <span className="xp-window__titleicon">{icon}</span>
        <h2 className="xp-window__title">{title}</h2>
        <div className="xp-window__buttons">
          <button type="button" className="xp-winbtn" onClick={onMinimize} title={ui("minimize")} aria-label={ui("minimize")}>
            <svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1.5" y="6.5" width="7" height="2" /></svg>
          </button>
          <button
            type="button"
            className="xp-winbtn"
            onClick={onMaximize}
            title={state.maximized ? ui("restore") : ui("maximize")}
            aria-label={state.maximized ? ui("restore") : ui("maximize")}
          >
            {state.maximized ? (
              <svg viewBox="0 0 10 10" aria-hidden="true">
                <rect x="0.5" y="2.5" width="6" height="6" fill="none" strokeWidth="1.6" stroke="currentColor" />
                <path d="M3 2.5V1h6v6H7.5" fill="none" strokeWidth="1.6" stroke="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 10 10" aria-hidden="true">
                <rect x="1" y="1.5" width="8" height="7" fill="none" strokeWidth="1.6" stroke="currentColor" />
                <rect x="1" y="1.5" width="8" height="2" />
              </svg>
            )}
          </button>
          <button type="button" className="xp-winbtn xp-winbtn--close" onClick={onClose} title={ui("close")} aria-label={ui("close")}>
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1.5 1.5 8.5 8.5M8.5 1.5 1.5 8.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="xp-window__body">{children}</div>

      {!state.maximized && (
        <button
          type="button"
          className="xp-window__resizer"
          aria-label="Resize window"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        />
      )}
    </section>
  );
}
