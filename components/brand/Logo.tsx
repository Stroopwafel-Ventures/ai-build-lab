import type { SVGProps } from "react";

/* Stroopwafel Ventures brand mark — original artwork.
   Colors come from theme tokens defined in app/globals.css
   (--waffle, --caramel, --cream, --ink) with hex fallbacks. */

export type BrandSvgProps = {
  className?: string;
  /** Accessible name. Omit (or pass "") to render the graphic as decorative. */
  title?: string;
};

/** 30 shallow ridges around the waffle edge (viewBox 0 0 64 64, centre 32,31, r 27). */
export const WAFFLE_EDGE =
  "M59 31A4.23 4.23 0 0 1 58.41 36.61A4.23 4.23 0 0 1 56.67 41.98A4.23 4.23 0 0 1 53.84 46.87A4.23 4.23 0 0 1 50.07 51.06A4.23 4.23 0 0 1 45.5 54.38A4.23 4.23 0 0 1 40.34 56.68A4.23 4.23 0 0 1 34.82 57.85A4.23 4.23 0 0 1 29.18 57.85A4.23 4.23 0 0 1 23.66 56.68A4.23 4.23 0 0 1 18.5 54.38A4.23 4.23 0 0 1 13.93 51.06A4.23 4.23 0 0 1 10.16 46.87A4.23 4.23 0 0 1 7.33 41.98A4.23 4.23 0 0 1 5.59 36.61A4.23 4.23 0 0 1 5 31A4.23 4.23 0 0 1 5.59 25.39A4.23 4.23 0 0 1 7.33 20.02A4.23 4.23 0 0 1 10.16 15.13A4.23 4.23 0 0 1 13.93 10.94A4.23 4.23 0 0 1 18.5 7.62A4.23 4.23 0 0 1 23.66 5.32A4.23 4.23 0 0 1 29.18 4.15A4.23 4.23 0 0 1 34.82 4.15A4.23 4.23 0 0 1 40.34 5.32A4.23 4.23 0 0 1 45.5 7.62A4.23 4.23 0 0 1 50.07 10.94A4.23 4.23 0 0 1 53.84 15.13A4.23 4.23 0 0 1 56.67 20.02A4.23 4.23 0 0 1 58.41 25.39A4.23 4.23 0 0 1 59 31Z";

/** Diamond grid, pre-clipped to a circle of r 21 (no clipPath ids needed). */
export const WAFFLE_GRID =
  "M11.62 36.08L26.92 51.38M11.33 27.3L35.7 51.67M13.53 21.01L41.99 49.47M17.15 16.15L46.85 45.85M22.01 12.53L50.47 40.99M28.3 10.33L52.67 34.7M37.08 10.62L52.38 25.92M37.08 51.38L52.38 36.08M28.3 51.67L52.67 27.3M22.01 49.47L50.47 21.01M17.15 45.85L46.85 16.15M13.53 40.99L41.99 12.53M11.33 34.7L35.7 10.33M11.62 25.92L26.92 10.62";

/** Caramel peeking out under the wafer, with two drips. */
export const CARAMEL_OOZE =
  "M5 32.4a27.6 27.6 0 1 0 55.2 0a27.6 27.6 0 1 0-55.2 0ZM22 55v6a2.7 2.7 0 0 0 5.4 0v-6ZM40 55v3.4a2.1 2.1 0 0 0 4.2 0V55Z";

/** The stroopwafel drawn into a 64×64 box. Reused by the logo, spinner and illustrations. */
export function WaffleShapes({ mono = false }: { mono?: boolean }) {
  if (mono) {
    return (
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 57v4a2.7 2.7 0 0 0 5.4 0v-4ZM40 57v1.4a2.1 2.1 0 0 0 4.2 0V57Z" fill="currentColor" stroke="none" />
        <path d={WAFFLE_EDGE} strokeWidth={2.6} />
        <circle cx={32} cy={31} r={22.5} strokeWidth={1.5} />
        <path d={WAFFLE_GRID} strokeWidth={1.8} />
      </g>
    );
  }
  return (
    <g strokeLinecap="round">
      <path d={CARAMEL_OOZE} fill="var(--caramel, #9A5B1E)" />
      <path d={WAFFLE_EDGE} fill="var(--waffle, #C8893B)" />
      <circle
        cx={32}
        cy={31}
        r={22.5}
        fill="none"
        stroke="var(--caramel, #9A5B1E)"
        strokeOpacity={0.55}
        strokeWidth={1.4}
      />
      <path d={WAFFLE_GRID} fill="none" stroke="var(--caramel, #9A5B1E)" strokeOpacity={0.9} strokeWidth={1.8} />
      <path
        d="M12.6 22.4a22 22 0 0 1 9-10"
        fill="none"
        stroke="#FFF6E2"
        strokeOpacity={0.55}
        strokeWidth={2}
      />
    </g>
  );
}

function a11y(title?: string): SVGProps<SVGSVGElement> {
  return title ? { role: "img", "aria-label": title } : { "aria-hidden": true, focusable: "false" };
}

/** Icon-only stroopwafel mark (square). */
export function StroopwafelMark({ className, title = "Stroopwafel Ventures" }: BrandSvgProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...a11y(title)}>
      {title ? <title>{title}</title> : null}
      <WaffleShapes />
    </svg>
  );
}

/** Single-colour mark using currentColor (for footers, print, overlays). */
export function StroopwafelMarkMono({ className, title = "Stroopwafel Ventures" }: BrandSvgProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...a11y(title)}>
      {title ? <title>{title}</title> : null}
      <WaffleShapes mono />
    </svg>
  );
}

export type LogoProps = BrandSvgProps & {
  /** Classes for the mark (default size is 1.75em, scaling with font-size). */
  markClassName?: string;
  /** Hide the "Ventures" second word, e.g. on very narrow screens. */
  compact?: boolean;
};

function Wordmark({ compact, mono }: { compact?: boolean; mono?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        color: mono ? "currentColor" : "var(--ink, #3B2614)",
      }}
    >
      Stroopwafel
      {compact ? null : (
        <span
          style={{
            fontWeight: 500,
            marginLeft: "0.3em",
            color: mono ? "currentColor" : "var(--caramel, #9A5B1E)",
          }}
        >
          Ventures
        </span>
      )}
    </span>
  );
}

const rowStyle = { display: "inline-flex", alignItems: "center", gap: "0.5em" } as const;
const markStyle = { width: "1.75em", height: "1.75em", flex: "none" } as const;

/** Mark + HTML wordmark "Stroopwafel Ventures". Size it with a text-* class. */
export function Logo({ className, title = "Stroopwafel Ventures", markClassName, compact }: LogoProps) {
  return (
    <span className={className} style={rowStyle} role="img" aria-label={title || undefined}>
      <svg viewBox="0 0 64 64" className={markClassName} style={markClassName ? undefined : markStyle} aria-hidden="true">
        <WaffleShapes />
      </svg>
      <Wordmark compact={compact} />
    </span>
  );
}

/** Single-colour logo (mark + wordmark) in currentColor. */
export function LogoMono({ className, title = "Stroopwafel Ventures", markClassName, compact }: LogoProps) {
  return (
    <span className={className} style={rowStyle} role="img" aria-label={title || undefined}>
      <svg viewBox="0 0 64 64" className={markClassName} style={markClassName ? undefined : markStyle} aria-hidden="true">
        <WaffleShapes mono />
      </svg>
      <Wordmark compact={compact} mono />
    </span>
  );
}
