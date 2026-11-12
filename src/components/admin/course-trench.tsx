import { hatch } from "@/lib/draw";
import { inr, percent } from "@/lib/format";

// A project's money as masonry on a ground line. At the left, the margin so far: a course
// of laterite laid above the ground when the work is worth more than it cost, a trench dug
// below it when it is not. At the right, the cash: a course for money in hand, a trench for
// the cash the project is short. A tall course over a deep trench is a project profitable
// on paper and short of cash. Every drawing on a page shares one scale, so they compare.
// The drawing is decoration: the words beside it always say the figures.

type Tone = "paper" | "dark";

const r1 = (v: number) => Math.round(v * 10) / 10;

/** "19% margin so far, short of cash by ₹6,64,000." */
export function trenchWords(margin: number | null, marginPercent: number | null, cash: number): string {
  const first = margin === null ? "In design, no margin yet" : `${percent(marginPercent ?? 0)} margin so far`;
  const second = cash < 0 ? `short of cash by ${inr(-cash)}` : `${inr(cash)} in hand`;
  return `${first}, ${second}.`;
}

function Column({
  value,
  x,
  w,
  ground,
  depth,
  scale,
  tone,
  pending,
}: {
  value: number | null;
  x: number;
  w: number;
  ground: number;
  depth: number;
  scale: number;
  tone: Tone;
  pending?: boolean;
}) {
  const ink = tone === "dark" ? "var(--color-chalk)" : "var(--color-ink-soft)";
  const joint = tone === "dark" ? "var(--color-rosewood)" : "var(--color-paper)";
  if (value === null || pending) {
    // Nothing built yet: the course is pegged out in chalk.
    const h = Math.max(depth * 0.18, 3);
    return (
      <rect
        x={r1(x)}
        y={r1(ground - h)}
        width={r1(w)}
        height={r1(h)}
        vectorEffect="non-scaling-stroke"
        style={{ fill: "none", stroke: ink, strokeWidth: 1, strokeDasharray: "3 2" }}
      />
    );
  }
  if (value === 0) return null;
  const h = Math.max((Math.abs(value) / scale) * depth, 2);
  if (value > 0) {
    // A course of laterite, its joints staggered like a wall's.
    const rows = Math.max(1, Math.round(h / Math.max(depth / 5, 4)));
    const rowH = h / rows;
    const brick = Math.max(rowH * 2.2, 8);
    let d = "";
    for (let i = 1; i < rows; i++) d += `M${r1(x)} ${r1(ground - i * rowH)}h${r1(w)}`;
    for (let i = 0; i < rows; i++) {
      const y0 = ground - (i + 1) * rowH;
      for (let bx = x + (i % 2 === 0 ? brick : brick / 2); bx < x + w - 1; bx += brick)
        d += `M${r1(bx)} ${r1(y0)}v${r1(rowH)}`;
    }
    return (
      <g>
        <rect x={r1(x)} y={r1(ground - h)} width={r1(w)} height={r1(h)} style={{ fill: "var(--color-laterite)" }} />
        <path d={d} vectorEffect="non-scaling-stroke" style={{ stroke: joint, strokeWidth: 1, fill: "none" }} />
      </g>
    );
  }
  // A trench: dug below the ground, its sides and floor ruled, the cut hatched in ink.
  return (
    <g>
      <path
        d={hatch({ x, y: ground, w, h }, Math.max(4, Math.min(8, h / 3)))}
        vectorEffect="non-scaling-stroke"
        style={{ stroke: ink, strokeWidth: 1, fill: "none" }}
      />
      <path
        d={`M${r1(x)} ${r1(ground)}V${r1(ground + h)}H${r1(x + w)}V${r1(ground)}`}
        vectorEffect="non-scaling-stroke"
        style={{ stroke: tone === "dark" ? "var(--color-lime)" : "var(--color-ink)", strokeWidth: 1.25, fill: "none" }}
      />
    </g>
  );
}

export function CourseTrench({
  margin,
  cash,
  scale,
  width = 320,
  height = 120,
  tone = "paper",
  inDesign = false,
  className = "",
}: {
  /** Margin so far, before GST; null while in design. */
  margin: number | null;
  /** Cash position: received less spent, before GST. */
  cash: number;
  /** The rupee figure that fills half the height. Pass the same scale to every drawing on a page. */
  scale?: number;
  width?: number;
  height?: number;
  tone?: Tone;
  /** Nothing is built yet: the margin is pegged out, not laid. */
  inDesign?: boolean;
  className?: string;
}) {
  const ground = height / 2;
  const depth = ground - Math.max(2, height * 0.04);
  const s = Math.max(scale ?? Math.max(Math.abs(margin ?? 0), Math.abs(cash), 1), 1);
  const pad = width * 0.06;
  const gap = width * 0.1;
  const w = (width - pad * 2 - gap) / 2;
  const line = tone === "dark" ? "var(--color-lime)" : "var(--color-ink)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`block max-w-full shrink-0 ${className}`}
      style={{ height: "auto" }}
      aria-hidden="true"
      focusable="false"
    >
      <Column value={margin} x={pad} w={w} ground={ground} depth={depth} scale={s} tone={tone} pending={inDesign} />
      <Column value={cash} x={pad + w + gap} w={w} ground={ground} depth={depth} scale={s} tone={tone} />
      <path
        d={`M0 ${r1(ground)}H${width}`}
        vectorEffect="non-scaling-stroke"
        style={{ stroke: line, strokeWidth: 1.5 }}
      />
    </svg>
  );
}
