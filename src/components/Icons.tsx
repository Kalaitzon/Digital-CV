/**
 * Hand-drawn SVG icon set in a chunky, early-2000s desktop style.
 *
 * Icons are pure SVG (no image assets) so they stay crisp at any size and add
 * nothing to the network payload. Each icon renders inside a 48x48 viewBox.
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** My Computer — used for the "Personal Info" window. */
export function ComputerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="7" width="38" height="27" rx="2" fill="#d7dce6" stroke="#4a5568" strokeWidth="2" />
      <rect x="9" y="11" width="30" height="19" fill="#2f6fd0" />
      <path d="M9 11h30v8l-30 6z" fill="#5a9df5" opacity="0.55" />
      <rect x="19" y="34" width="10" height="5" fill="#a7b0c0" stroke="#4a5568" strokeWidth="2" />
      <rect x="10" y="39" width="28" height="4" rx="1.5" fill="#c3cad6" stroke="#4a5568" strokeWidth="2" />
    </Svg>
  );
}

/** Graduation cap — Education. */
export function EducationIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M24 8 4 17l20 9 20-9z" fill="#2f4f8f" stroke="#16294f" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 21v10c0 3 5.5 6 12 6s12-3 12-6V21l-12 5.4z" fill="#3f6cc0" stroke="#16294f" strokeWidth="2" strokeLinejoin="round" />
      <path d="M42 18v11" stroke="#e0b74a" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="42" cy="31" r="2.6" fill="#e0b74a" />
    </Svg>
  );
}

/** Toolbox / wrench — Skills. */
export function SkillsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M31 6a10 10 0 0 0-9.3 13.7L6.6 34.8a3.6 3.6 0 0 0 5.1 5.1l15.1-15.1A10 10 0 1 0 31 6z"
        fill="#b8c0cc"
        stroke="#3f4756"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="31" cy="16" r="4.4" fill="#eef1f5" stroke="#3f4756" strokeWidth="2" />
      <path d="M14 33.5 9.5 38" stroke="#3f4756" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/** Briefcase — Experience. */
export function ExperienceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 13V9.5A2.5 2.5 0 0 1 20.5 7h7A2.5 2.5 0 0 1 30 9.5V13" fill="none" stroke="#5a4326" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="5" y="13" width="38" height="26" rx="3" fill="#a9752f" stroke="#5a4326" strokeWidth="2" />
      <rect x="5" y="22" width="38" height="5" fill="#7d5522" />
      <rect x="20" y="20" width="8" height="9" rx="1.5" fill="#e2c88c" stroke="#5a4326" strokeWidth="1.8" />
    </Svg>
  );
}

/** Folder — Projects. */
export function ProjectsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h13l4 5h21v22a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="#f0bb4a" stroke="#8a6212" strokeWidth="2" strokeLinejoin="round" />
      <path d="M5 20h38v19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="#ffd776" stroke="#8a6212" strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  );
}

/** Heart — Activities / volunteering. */
export function ActivitiesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M24 40S7 29.6 7 19.6A9.6 9.6 0 0 1 24 13.4 9.6 9.6 0 0 1 41 19.6C41 29.6 24 40 24 40z"
        fill="#d9453c"
        stroke="#7d211c"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M13 19.6a6 6 0 0 1 6-6" stroke="#ff9a94" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Envelope — Contact. */
export function ContactIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="11" width="40" height="26" rx="2.5" fill="#f2f4f8" stroke="#3f4756" strokeWidth="2" />
      <path d="M4.5 13 24 26.5 43.5 13" fill="none" stroke="#3f4756" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4.5 35.5 18 24M43.5 35.5 30 24" fill="none" stroke="#8891a1" strokeWidth="1.8" />
    </Svg>
  );
}

/** Text document — About / summary. */
export function AboutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 5h17l9 9v29H11z" fill="#fbfcfe" stroke="#3f4756" strokeWidth="2" strokeLinejoin="round" />
      <path d="M28 5v9h9" fill="#cfd6e2" stroke="#3f4756" strokeWidth="2" strokeLinejoin="round" />
      <g stroke="#7a879b" strokeWidth="2" strokeLinecap="round">
        <path d="M16 21h16M16 26h16M16 31h11" />
      </g>
    </Svg>
  );
}

/** Document with a download arrow — Resume/PDF. */
export function ResumeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 5h18l10 10v28H9z" fill="#fbfcfe" stroke="#3f4756" strokeWidth="2" strokeLinejoin="round" />
      <path d="M27 5v10h10" fill="#cfd6e2" stroke="#3f4756" strokeWidth="2" strokeLinejoin="round" />
      <rect x="12" y="25" width="22" height="10" rx="2" fill="#c8342b" />
      <text x="23" y="33" textAnchor="middle" fontSize="8" fontFamily="Tahoma, sans-serif" fill="#fff" fontWeight="bold">
        PDF
      </text>
    </Svg>
  );
}

/** Monitor with a palette — Display Properties / theme picker. */
export function DisplayIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="8" width="40" height="27" rx="2.5" fill="#d7dce6" stroke="#4a5568" strokeWidth="2" />
      <rect x="8" y="12" width="32" height="19" fill="#2f6fd0" />
      <circle cx="17" cy="21" r="3.2" fill="#e0574a" />
      <circle cx="25" cy="18" r="3.2" fill="#ffd23f" />
      <circle cx="31" cy="24" r="3.2" fill="#4caf50" />
      <rect x="19" y="35" width="10" height="4" fill="#a7b0c0" stroke="#4a5568" strokeWidth="2" />
      <rect x="11" y="39" width="26" height="4" rx="1.5" fill="#c3cad6" stroke="#4a5568" strokeWidth="2" />
    </Svg>
  );
}

/** Small four-pane flag used on the Start button. */
export function FlagIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <path d="M3 5.4 10.6 4v8.4H3z" fill="#f25022" />
      <path d="M11.9 3.8 21 2.4v10H11.9z" fill="#7fba00" />
      <path d="M3 13.6h7.6V22L3 20.6z" fill="#00a4ef" />
      <path d="M11.9 13.6H21v10l-9.1-1.4z" fill="#ffb900" />
    </svg>
  );
}

/**
 * Waving four-pane flag with a trailing pixel wake — the 1990s treatment of
 * the same emblem, used on the boot screen under the Windows 98 theme.
 *
 * Drawn here rather than shipped as an image file: it stays crisp at any size,
 * needs no download, and is our own rendering rather than a copy of anyone's
 * artwork.
 */
export function RetroFlagIcon(props: IconProps) {
  // Squares of the dissolving trail: x, y, size, opacity.
  const trail: [number, number, number, number][] = [
    [2, 30, 5, 0.9],
    [10, 22, 5, 0.75],
    [10, 40, 5, 0.75],
    [18, 14, 5, 0.6],
    [18, 48, 5, 0.6],
    [2, 46, 4, 0.5],
    [26, 8, 4, 0.4],
    [26, 56, 4, 0.4],
  ];

  return (
    <svg viewBox="0 0 100 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      {trail.map(([x, y, size, opacity]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={size} height={size} fill="#111111" opacity={opacity} />
      ))}
      {/* Dark backing plate: the panes sit on it with a gap, as they did then. */}
      <path d="M40 10 L96 2 L96 66 L40 74 Z" fill="#111111" />
      <path d="M46 17 L66 14 L66 36 L46 38 Z" fill="#f25022" />
      <path d="M70 13 L91 10 L91 33 L70 36 Z" fill="#7fba00" />
      <path d="M46 41 L66 39 L66 61 L46 63 Z" fill="#00a4ef" />
      <path d="M70 39 L91 36 L91 59 L70 62 Z" fill="#ffb900" />
    </svg>
  );
}

/** Document with an upload arrow — the "Update CV" admin window. */
export function UploadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 5h17l10 10v28H10z" fill="#fbfcfe" stroke="#3f4756" strokeWidth="2" strokeLinejoin="round" />
      <path d="M27 5v10h10" fill="#cfd6e2" stroke="#3f4756" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="33" cy="33" r="11" fill="#2f80c8" stroke="#14508a" strokeWidth="2" />
      <path
        d="M33 39V27m0 0-4.5 4.5M33 27l4.5 4.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Globe — language switcher. */
export function LanguageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="24" r="17" fill="#2f80c8" stroke="#154a80" strokeWidth="2" />
      <path d="M7 24h34M24 7c5 5 5 29 0 34M24 7c-5 5-5 29 0 34" fill="none" stroke="#cfe6ff" strokeWidth="2" />
      <path d="M11 14c7 4 19 4 26 0M11 34c7-4 19-4 26 0" fill="none" stroke="#cfe6ff" strokeWidth="2" />
    </Svg>
  );
}
