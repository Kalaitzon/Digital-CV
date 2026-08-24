/**
 * Theme registry.
 *
 * The actual colours live in `src/styles/themes.css` as CSS custom properties,
 * keyed by the `id` below via a `[data-theme="…"]` selector on <html>.
 * This file only holds the metadata the UI needs (label, swatch, order).
 */

import type { Localized } from "./cv";

export interface ThemeDef {
  id: string;
  label: Localized;
  /** Two colours used to render the small preview swatch in the theme picker. */
  swatch: [string, string];
}

export const DEFAULT_THEME = "win98";

export const THEMES: ThemeDef[] = [
  {
    id: "win98",
    label: { en: "Windows 98 — Classic Grey", el: "Windows 98 — Κλασικό Γκρι" },
    swatch: ["#000080", "#c0c0c0"],
  },
  {
    id: "xp-blue",
    label: { en: "Windows XP — Luna Blue", el: "Windows XP — Luna Blue" },
    swatch: ["#0058ee", "#3a93ff"],
  },
  {
    id: "xp-silver",
    label: { en: "Windows XP — Silver", el: "Windows XP — Silver" },
    swatch: ["#8189a5", "#c3c8d6"],
  },
  {
    id: "royale-noir",
    label: { en: "Royale Noir — Dark", el: "Royale Noir — Σκούρο" },
    swatch: ["#1c1c1c", "#3d4c5c"],
  },
  {
    id: "matrix",
    label: { en: "Hacker Terminal", el: "Hacker Terminal" },
    swatch: ["#00ff41", "#001a06"],
  },
];
