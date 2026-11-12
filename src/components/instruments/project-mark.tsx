import { HouseMark, markForStop } from "@/components/house/house-mark";
import { hatch, rects } from "@/lib/draw";
import { projects, type CategoryId, type MilestoneState, type ProjectId } from "@/lib/firm-data";
import type { Pass } from "@/lib/house-model";

// A project at the size of a word. City villas, eco homes and cement block homes are the
// house mark; a farmhouse is one storey under a pitched roof. Both are drawn as far as the
// work has gone, in the same tones, and are decoration unless given a title.

const BUILT: MilestoneState[] = ["done", "raised", "approved", "part-paid", "paid"];

/** How far a project's house stands: the last built part and the finishing passes. */
export function markOf(category: CategoryId, milestones: { n: number; state: MilestoneState }[]): {
  upTo: number;
  passes: Pass[];
} {
  const stop = milestones.filter((m) => BUILT.includes(m.state)).reduce((top, m) => Math.max(top, m.n), 0);
  if (category !== "farmhouse") return markForStop(stop);
  // Farmhouse: 1 plinth, 2 walls, 3 roof; then plaster, floors, joinery, paint.
  const upTo = stop >= 3 ? 2 : stop - 1;
  const passes: Pass[] = [];
  if (stop >= 4) passes.push("plaster");
  if (stop >= 6) passes.push("kota");
  if (stop >= 7) passes.push("teak");
  if (stop >= 9) passes.push("paint");
  if (stop >= 10) passes.push("nameplate");
  return { upTo, passes };
}

type R = { x: number; y: number; w: number; h: number };
const box = (x: number, y: number, w: number, h: number): R => ({ x, y, w, h });

// The farmhouse in its own small viewBox: plinth, walls with a verandah, a pitched roof.
const PLINTH = box(14, 78, 132, 7);
const WALLS = box(22, 46, 116, 32);
const ROOF = "M8 47L44 22H116L152 47Z";
const DOOR = box(72, 56, 16, 22);
const WINDOWS = [box(34, 56, 22, 13), box(104, 56, 22, 13)];
const VERANDAH = box(22, 74, 116, 4);

function Farmhouse({
  upTo,
  highlight,
  passes,
  tone,
  title,
  className,
}: {
  upTo: number;
  highlight: number[];
  passes: Pass[];
  tone: "dark" | "light" | "line";
  title?: string;
  className: string;
}) {
  const ink = tone === "dark" ? "var(--color-lime)" : "var(--color-rosewood)";
  const chalk = tone === "dark" ? "var(--color-chalk)" : "var(--color-ink-soft)";
  const filled = tone !== "line";
  const wall = passes.includes("paint")
    ? "var(--color-lime)"
    : passes.includes("plaster")
      ? "var(--color-plaster)"
      : "var(--color-laterite)";
  const part = (i: number) => ({
    fill: upTo >= i && filled ? (i === 0 ? "var(--color-laterite)" : i === 1 ? wall : "var(--color-laterite-shade)") : "none",
    stroke: upTo >= i ? ink : chalk,
    strokeWidth: highlight.includes(i) ? 2 : upTo >= i ? 1.25 : 1,
    strokeDasharray: upTo >= i ? undefined : "4 3",
  });
  const p = (r: R) => rects([r]);

  return (
    <svg
      viewBox="0 12 160 80"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      fill="none"
    >
      <path d={p(PLINTH)} vectorEffect="non-scaling-stroke" style={part(0)} />
      <path d={p(WALLS)} vectorEffect="non-scaling-stroke" style={part(1)} />
      <path d={ROOF} vectorEffect="non-scaling-stroke" style={part(2)} />
      {upTo >= 1 && (
        <path
          d={rects([DOOR, ...WINDOWS])}
          vectorEffect="non-scaling-stroke"
          style={{
            fill: !filled ? "none" : passes.includes("teak") ? "var(--color-teak)" : "var(--color-rosewood-2)",
            stroke: ink,
            strokeWidth: 1,
          }}
        />
      )}
      {upTo >= 2 && <path d="M30 41.5H130" vectorEffect="non-scaling-stroke" style={{ stroke: ink, strokeWidth: 1, opacity: 0.5 }} />}
      {upTo >= 1 && filled && passes.includes("kota") && <path d={p(VERANDAH)} style={{ fill: "var(--color-kota)" }} />}
      {highlight.map((i) => {
        const r = i === 0 ? PLINTH : i === 1 ? WALLS : box(30, 26, 100, 20);
        return <path key={i} d={hatch(r, 8)} vectorEffect="non-scaling-stroke" style={{ stroke: ink, strokeWidth: 1 }} />;
      })}
      <path d="M4 85H156" vectorEffect="non-scaling-stroke" style={{ stroke: ink, strokeWidth: 1.5 }} />
    </svg>
  );
}

export function ProjectMark({
  projectId,
  upTo,
  passes,
  highlight = [],
  tone = "light",
  className = "w-[72px] shrink-0",
  title,
}: {
  projectId: ProjectId;
  /** The last built part. City villa: 0 plinth to 4 roof. Farmhouse: 0 plinth, 1 walls, 2 roof. */
  upTo?: number;
  passes?: Pass[];
  highlight?: number[];
  /** "light" on paper, "dark" on rosewood, "line" for black line only. */
  tone?: "dark" | "light" | "line";
  className?: string;
  title?: string;
}) {
  const seed = projects.find((p) => p.id === projectId);
  const category = seed?.category ?? "city-villa";
  const fallback = markOf(category, seed?.milestones ?? []);
  const at = upTo ?? fallback.upTo;
  const finish = passes ?? fallback.passes;
  if (category === "farmhouse") {
    return <Farmhouse upTo={at} highlight={highlight} passes={finish} tone={tone} title={title} className={className} />;
  }
  return <HouseMark upTo={at} passes={finish} highlight={highlight} tone={tone} title={title} className={className} />;
}
