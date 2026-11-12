import { SealGlyphAt } from "./glyphs";

// Setting out a plot: the outline is dashed until it is pegged. A stake is driven at each
// corner as a step of onboarding is done, and a string runs between driven stakes. With all
// four, the outline closes solid. `sealed` adds the client's seal glyph at one corner: they
// have agreed the estimate. On the rosewood board the plot is ground: hatched earth inside
// the outline, so even an unpegged plot reads as land waiting, not an empty box.

const CORNERS = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
] as const;

const r1 = (v: number) => Math.round(v * 100) / 100;

export function PlotOutline({
  pegs,
  sealed = false,
  size = 160,
  tone = "paper",
  words,
}: {
  pegs: 0 | 1 | 2 | 3 | 4;
  sealed?: boolean;
  /** Width in px. */
  size?: 72 | 160 | 280;
  tone?: "paper" | "dark";
  /** Words under the drawing, in lettering. */
  words?: string;
}) {
  const w = size;
  const h = Math.round(size * 0.62);
  const pad = Math.max(6, size * 0.07);
  const line = tone === "dark" ? "var(--color-lime)" : "var(--color-rosewood)";
  const chalk = tone === "dark" ? "var(--color-chalk)" : "var(--color-ink-soft)";
  const stake = Math.max(3.5, size * 0.035);
  // A plot is never quite square: the far side runs a little off true.
  const at = ([cx, cy]: readonly [number, number]) => [
    r1(pad + cx * (w - pad * 2) + (cy === 1 && cx === 1 ? -size * 0.04 : 0)),
    r1(pad + cy * (h - pad * 2)),
  ];
  const points = CORNERS.map(at);
  const outline = `M${points.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
  let strings = "";
  for (let i = 0; i < pegs - 1; i++) strings += `M${points[i][0]} ${points[i][1]}L${points[i + 1][0]} ${points[i + 1][1]}`;
  const closed = pegs === 4;
  const seal = points[1];
  // One pattern per size and tone; two plots of the same size share the same drawing.
  const earthId = `plot-earth-${size}-${tone}`;
  const earthLine = tone === "dark" ? "rgb(250 248 245 / 0.28)" : "rgb(42 26 18 / 0.18)";
  const earthGap = Math.max(5, Math.round(size / 24));

  const drawing = (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className="block max-w-full overflow-visible"
      style={{ height: "auto" }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={earthId} width={earthGap} height={earthGap} patternUnits="userSpaceOnUse" patternTransform="rotate(-55)">
          <path d={`M0 0V${earthGap}`} style={{ stroke: earthLine, strokeWidth: 1 }} />
        </pattern>
      </defs>
      <path d={outline} style={{ fill: `url(#${earthId})`, stroke: "none" }} />
      {closed && <path d={outline} className="inst-fill" style={{ fill: tone === "dark" ? "rgb(250 248 245 / 0.08)" : "rgb(42 26 18 / 0.04)", stroke: "none" }} />}
      <path d={outline} style={{ fill: "none", stroke: chalk, strokeWidth: 1 }} strokeDasharray="4 4" />
      {closed ? (
        <path d={outline} className="inst-fill" style={{ fill: "none", stroke: line, strokeWidth: 1.5 }} />
      ) : (
        strings && <path d={strings} className="inst-fill" style={{ fill: "none", stroke: line, strokeWidth: 1.25 }} />
      )}
      {points.map(([x, y], i) => {
        const driven = i < pegs;
        return (
          <g key={i} className="inst-fill" style={{ opacity: driven ? 1 : 0.6 }}>
            {driven ? (
              <>
                <rect
                  x={r1(x - stake / 2)}
                  y={r1(y - stake / 2)}
                  width={r1(stake)}
                  height={r1(stake)}
                  style={{ fill: line, stroke: tone === "dark" ? "var(--color-rosewood)" : "var(--color-paper)", strokeWidth: 1 }}
                />
                <path
                  d={`M${r1(x - stake)} ${r1(y)}h${r1(stake * 2)}M${r1(x)} ${r1(y - stake)}v${r1(stake * 2)}`}
                  style={{ stroke: line, strokeWidth: 1 }}
                />
              </>
            ) : (
              <circle cx={x} cy={y} r={r1(stake / 2)} style={{ fill: "none", stroke: chalk, strokeWidth: 1 }} />
            )}
          </g>
        );
      })}
      {sealed && <SealGlyphAt x={seal[0] - size * 0.02} y={seal[1] + size * 0.11} d={r1(Math.max(12, size * 0.13))} />}
    </svg>
  );

  if (!words) return drawing;
  return (
    <figure className="grid justify-items-start gap-1.5">
      {drawing}
      <figcaption className={`lettering ${tone === "dark" ? "text-lime/80" : "text-ink-soft"}`}>{words}</figcaption>
    </figure>
  );
}
