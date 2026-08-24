/**
 * A single desktop icon.
 *
 * Behaves like the real thing: one click selects, double click opens.
 * A single click is also treated as "open" on touch devices, where double
 * tapping is awkward.
 */

import { useRef, type ReactNode } from "react";

interface DesktopIconProps {
  label: string;
  icon: ReactNode;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

export function DesktopIcon({ label, icon, selected, onSelect, onOpen }: DesktopIconProps) {
  const isTouch = useRef(false);

  return (
    <button
      type="button"
      className={`desktop-icon${selected ? " is-selected" : ""}`}
      onPointerDown={(e) => {
        isTouch.current = e.pointerType !== "mouse";
      }}
      onClick={() => {
        onSelect();
        if (isTouch.current) onOpen();
      }}
      onDoubleClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={label}
    >
      <span className="desktop-icon__glyph">{icon}</span>
      <span className="desktop-icon__label">{label}</span>
    </button>
  );
}
