import { WaffleShapes } from "./Logo";

export type StroopwafelSpinnerProps = {
  className?: string;
  /** Pixel size (width = height). Default 32. */
  size?: number;
  /** Screen-reader label. Default "Loading…". */
  title?: string;
};

const css =
  ".sw-spin{transform-origin:32px 31px;animation:sw-spin 1.2s linear infinite}" +
  "@keyframes sw-spin{to{transform:rotate(360deg)}}" +
  "@media (prefers-reduced-motion:reduce){.sw-spin{animation:sw-pulse 2s ease-in-out infinite}}" +
  "@keyframes sw-pulse{50%{opacity:.55}}";

const srOnly = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

/** A slowly rotating stroopwafel. Falls back to a gentle pulse under prefers-reduced-motion. */
export function StroopwafelSpinner({ className, size = 32, title = "Loading…" }: StroopwafelSpinnerProps) {
  return (
    <span role="status" className={className} style={{ display: "inline-flex", lineHeight: 0 }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
        <style>{css}</style>
        <g className="sw-spin">
          <WaffleShapes />
        </g>
      </svg>
      <span style={srOnly}>{title}</span>
    </span>
  );
}
