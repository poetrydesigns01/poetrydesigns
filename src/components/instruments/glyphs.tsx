// The only brass on a staff screen. A standing peg: the client still has to speak. A flat
// seal with an engraved tick: the client has agreed. Both are decoration; the words beside
// them say the same thing.

const BRASS = "var(--color-brass-light)";
const DEEP = "var(--color-brass-deep)";

/** A brass peg driven into the ground, with its hard contact shadow. */
export function PegGlyph({ size = 12, className = "" }: { size?: 12 | 16; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className={`inline-block shrink-0 overflow-visible align-[-0.1em] ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="8" cy="15" rx="4.5" ry="1.1" style={{ fill: "rgb(0 0 0 / 0.42)" }} />
      <rect x="7.1" y="7" width="1.8" height="8.2" style={{ fill: BRASS, stroke: DEEP, strokeWidth: 0.5 }} />
      <circle cx="8" cy="5" r="4.4" style={{ fill: BRASS, stroke: DEEP, strokeWidth: 1 }} />
      <circle cx="8" cy="5" r="1.3" style={{ fill: DEEP }} />
    </svg>
  );
}

/** The peg drawn inside another drawing: it stands on (x, y), `h` tall. */
export function PegGlyphAt({ x, y, h }: { x: number; y: number; h: number }) {
  const r = Math.max(h * 0.3, 2);
  return (
    <g aria-hidden="true">
      <rect x={x - 0.6} y={y - h + r} width={1.2} height={h - r} style={{ fill: BRASS, stroke: DEEP, strokeWidth: 0.4 }} />
      <circle cx={x} cy={y - h + r} r={r} style={{ fill: BRASS, stroke: DEEP, strokeWidth: 0.8 }} />
    </g>
  );
}

/** The seal drawn inside another drawing, centred on (x, y), `d` across. */
export function SealGlyphAt({ x, y, d }: { x: number; y: number; d: number }) {
  const k = d / 24;
  return (
    <g transform={`translate(${x - d / 2} ${y - d / 2}) scale(${k})`} aria-hidden="true">
      <circle cx="12" cy="12" r="11.2" style={{ fill: BRASS, stroke: DEEP, strokeWidth: 0.9 / k }} />
      <path
        d="M7.4 12.4l3.1 3.1 6.2-6.9"
        style={{ fill: "none", stroke: DEEP, strokeWidth: 2.3, strokeLinecap: "round", strokeLinejoin: "round" }}
      />
    </g>
  );
}

/** A flat brass seal. "line" draws it in the current colour, for print. */
export function SealGlyph({
  size = 16,
  tone = "brass",
  className = "",
}: {
  size?: 12 | 16 | 24;
  tone?: "brass" | "line";
  className?: string;
}) {
  const line = tone === "line";
  const ink = line ? "currentColor" : DEEP;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`inline-block shrink-0 overflow-visible align-[-0.15em] ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="11.2" style={{ fill: line ? "none" : BRASS, stroke: ink, strokeWidth: line ? 1.2 : 0.9 }} />
      {size > 12 && <circle cx="12" cy="12" r="8.6" style={{ fill: "none", stroke: ink, strokeWidth: 0.9 }} />}
      <path
        d="M7.4 12.4l3.1 3.1 6.2-6.9"
        style={{ fill: "none", stroke: ink, strokeWidth: 2.3, strokeLinecap: "round", strokeLinejoin: "round" }}
      />
    </svg>
  );
}
