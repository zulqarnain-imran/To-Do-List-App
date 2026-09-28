import type { ReactNode, SVGProps } from "react";

/**
 * Inline icon set.
 *
 * Hand-rolled rather than pulled from a library: the app needs roughly thirty
 * glyphs, and an icon package would add more weight to the bundle than the
 * entire data layer.
 *
 * All glyphs are drawn on a 24x24 grid and inherit `currentColor`, so an icon
 * always matches the text beside it.
 */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const ICONS: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M3.5 11 12 4l8.5 7" {...stroke} />
      <path d="M5.5 10v9a1 1 0 0 0 1 1h3.5v-5.5h4v5.5h3.5a1 1 0 0 0 1-1v-9" {...stroke} />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" {...stroke} />,
  circle: <circle cx="12" cy="12" r="8.5" {...stroke} />,
  "circle-check": (
    <>
      <circle cx="12" cy="12" r="8.5" {...stroke} />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.9" {...stroke} />
    </>
  ),
  plus: <path d="M12 5.5v13M5.5 12h13" {...stroke} />,
  close: <path d="m6.5 6.5 11 11m0-11-11 11" {...stroke} />,
  "chevron-left": <path d="m14.5 5.5-6.5 6.5 6.5 6.5" {...stroke} />,
  "chevron-right": <path d="m9.5 5.5 6.5 6.5-6.5 6.5" {...stroke} />,
  "chevron-down": <path d="m5.5 9.5 6.5 6 6.5-6" {...stroke} />,
  "arrow-left": <path d="M19 12H5m0 0 5.5-5.5M5 12l5.5 5.5" {...stroke} />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" {...stroke} />
      <path d="m15.6 15.6 4 4" {...stroke} />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="3" {...stroke} />
      <path d="M3.5 10h17M8.5 3.5v4M15.5 3.5v4" {...stroke} />
    </>
  ),
  tag: (
    <>
      <path d="M4 10.5V5.5a1 1 0 0 1 1-1h5l9.5 9.5a1 1 0 0 1 0 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L4 10.5Z" {...stroke} />
      <circle cx="8.3" cy="8.3" r="1.2" {...stroke} />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10.5M10 20V4.5M16 20v-7M21 20H3" {...stroke} />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7.5h8M16 7.5h4M4 16.5h4M12 16.5h8" {...stroke} />
      <circle cx="14" cy="7.5" r="2.2" {...stroke} />
      <circle cx="10" cy="16.5" r="2.2" {...stroke} />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" {...stroke} />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" {...stroke} />
    </>
  ),
  bell: (
    <>
      <path d="M6 10a6 6 0 1 1 12 0c0 4.5 1.7 5.8 1.7 5.8H4.3S6 14.5 6 10Z" {...stroke} />
      <path d="M10 19.2a2.2 2.2 0 0 0 4 0" {...stroke} />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" {...stroke} />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" {...stroke} />
    </>
  ),
  moon: (
    <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z" {...stroke} />
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V4.8h5V7M6.8 7l.9 12.2a1 1 0 0 0 1 .8h6.6a1 1 0 0 0 1-.8L17.2 7" {...stroke} />
      <path d="M10.5 11v5.5M13.5 11v5.5" {...stroke} />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20l4.3-1.1L19 8.2a1.6 1.6 0 0 0 0-2.3l-.9-.9a1.6 1.6 0 0 0-2.3 0L5.1 15.7 4 20Z" {...stroke} />
      <path d="m14.8 6.4 2.8 2.8" {...stroke} />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" {...stroke} />
      <path d="M15.5 5.5A2 2 0 0 0 13.5 4h-7a2.5 2.5 0 0 0-2.5 2.5v7a2 2 0 0 0 1.5 2" {...stroke} />
    </>
  ),
  archive: (
    <>
      <rect x="3.5" y="4.5" width="17" height="4.5" rx="1.5" {...stroke} />
      <path d="M5.5 9v9.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9" {...stroke} />
      <path d="M10 13h4" {...stroke} />
    </>
  ),
  flag: (
    <>
      <path d="M6 21V4M6 4.5h10.5l-1.8 4 1.8 4H6" {...stroke} />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" {...stroke} />
      <path d="M12 7.5V12l3 1.8" {...stroke} />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" {...stroke} />,
  sparkle: (
    <path d="M12 3.5l1.7 4.4 4.4 1.7-4.4 1.7L12 15.7l-1.7-4.4-4.4-1.7 4.4-1.7L12 3.5Zm6.5 9.5.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" {...stroke} />
  ),
  PaintBrush: (
    <>
      <path d="M4 20.5s1.8-4.2 4.8-4.2 3.7 2 3.7 2" {...stroke} />
      <path d="m9.2 15.8 8.4-8.4a2.2 2.2 0 0 1 3.1 3.1l-8.4 8.4" {...stroke} />
      <path d="M8.4 18.4c-.9.9-1.1 2.1-1.1 2.1s1.2-.2 2.1-1.1" {...stroke} />
    </>
  ),
  GroupDiscussion: (
    <>
      <circle cx="9" cy="8" r="3" {...stroke} />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" {...stroke} />
      <path d="M15.5 5.6a3 3 0 0 1 0 4.8M17 13.6a5.5 5.5 0 0 1 3.5 5.4" {...stroke} />
    </>
  ),
  MachineLearning: (
    <>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" {...stroke} />
      <path d="M10 3.5v3M14 3.5v3M10 17.5v3M14 17.5v3M3.5 10h3M3.5 14h3M17.5 10h3M17.5 14h3" {...stroke} />
      <path d="M10 10.5h4v3h-4z" {...stroke} />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5h5.5a2.5 2.5 0 0 1 2.5 2.5v12a2 2 0 0 0-2-2H5v-12Z" {...stroke} />
      <path d="M19 4.5h-3.5A2.5 2.5 0 0 0 13 7v12a2 2 0 0 1 2-2h4v-12Z" {...stroke} />
    </>
  ),
  rocket: (
    <>
      <path d="M12 3.5c2.8 2.2 4.3 5.6 4.3 9l-2.4 2.6h-3.8L7.7 12.5c0-3.4 1.5-6.8 4.3-9Z" {...stroke} />
      <circle cx="12" cy="10" r="1.8" {...stroke} />
      <path d="M9.5 15.5 8 20l3-1.2M14.5 15.5 16 20l-3-1.2" {...stroke} />
    </>
  ),
  heart: (
    <path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6c0 5-7.5 9.4-7.5 9.4Z" {...stroke} />
  ),
  download: (
    <>
      <path d="M12 4v10.5M8 11l4 4 4-4" {...stroke} />
      <path d="M4.5 18.5v1a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-1" {...stroke} />
    </>
  ),
  logout: (
    <>
      <path d="M14.5 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h8.5" {...stroke} />
      <path d="M18.5 12H10m0 0 3-3m-3 3 3 3" {...stroke} />
    </>
  ),
  eye: (
    <>
      <path d="M2.8 12S6.2 6 12 6s9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6Z" {...stroke} />
      <circle cx="12" cy="12" r="2.7" {...stroke} />
    </>
  ),
  "eye-off": (
    <>
      <path d="M9.5 6.4A8.9 8.9 0 0 1 12 6c5.8 0 9.2 6 9.2 6a17 17 0 0 1-3 3.5M6.6 7.8A17 17 0 0 0 2.8 12S6.2 18 12 18a9.3 9.3 0 0 0 3.6-.7" {...stroke} />
      <path d="M10 10a2.7 2.7 0 0 0 3.8 3.8M4 4l16 16" {...stroke} />
    </>
  ),
  inbox: (
    <>
      <path d="M4 12.5 6.6 5.5h10.8L20 12.5v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6Z" {...stroke} />
      <path d="M4 12.5h4l1 2.5h6l1-2.5h4" {...stroke} />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" {...stroke} />
      <path d="M12 11v5.5" {...stroke} />
      <circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4.5 21 19.5H3L12 4.5Z" {...stroke} />
      <path d="M12 10v4" {...stroke} />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" {...stroke} />
      <path d="M19.5 4.5V9h-4.5" {...stroke} />
    </>
  ),
  "sort": (
    <>
      <path d="M4 7h11M4 12h8M4 17h5" {...stroke} />
      <path d="M17.5 10.5 20 8l2.5 2.5M20 8v10" {...stroke} />
    </>
  ),
  "cloud-off": (
    <>
      <path d="M7 18.5h10a3.5 3.5 0 0 0 .8-6.9A5.5 5.5 0 0 0 8 9.8" {...stroke} />
      <path d="M4 4l16 16" {...stroke} />
    </>
  ),
  wifi: (
    <>
      <path d="M4.5 9.5a11 11 0 0 1 15 0M7.5 13a7 7 0 0 1 9 0" {...stroke} />
      <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
};

export type IconName = keyof typeof ICONS | string;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className, ...rest }: IconProps) {
  const glyph = ICONS[name] ?? ICONS.circle;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {glyph}
    </svg>
  );
}
