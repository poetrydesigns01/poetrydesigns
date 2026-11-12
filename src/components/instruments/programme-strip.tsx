import type { CSSProperties } from "react";
import { hatch } from "@/lib/draw";
import type { StripCell } from "@/lib/firm";
import { PegGlyphAt } from "./glyphs";

// A project's programme as a strip of eleven cells, sign-up and ten milestones, drawn in
// the house's own states. Still to come is a dashed outline; under way is hatched; built is
// laterite with dark joints. Money runs into the joints: dashed lime once approved, half
// set once part paid, solid lime once paid. A peg glyph stands over a cell raised and with
// the client. A split milestone is two half cells; a split still waiting has a dashed cut.

type Size = 40 | 120 | 264;

const DIMS: Record<Size, { h: number; peg: number; gap: number; dash: string }> = {
  40: { h: 10, peg: 7, gap: 1, dash: "1.5 1.5" },
  120: { h: 16, peg: 10, gap: 2, dash: "2 2" },
  264: { h: 28, peg: 15, gap: 3, dash: "3 2.5" },
};

const BUILT: StripCell["state"][] = ["built", "raised", "approved", "part-paid", "paid"];

/** One sentence for the whole strip, for when no label is given. */
export function stripSummary(cells: StripCell[]): string {
  const milestones = cells.filter((c) => c.n > 0);
  const total = new Set(milestones.map((c) => c.n)).size;
  const order: StripCell["state"][] = ["raised", "approved", "part-paid", "under-way"];
  for (const state of order) {
    const cell = cells.find((c) => c.state === state);
    if (!cell) continue;
    const words: Record<string, string> = {
      raised: "raised, with the client",
      approved: "approved, waiting for the bank",
      "part-paid": "part paid",
      "under-way": "under way",
    };
    return `Milestone ${cell.label} of ${total} ${words[state]}.`;
  }
  const built = cells.filter((c) => BUILT.includes(c.state));
  if (built.length === 0) return "Nothing built yet.";
  if (built.length === cells.length) return "Every milestone built.";
  const last = built[built.length - 1];
  if (last.n === 0) return "Signed up. Building has not started.";
  return `Built up to milestone ${last.label} of ${total}.`;
}

type Slot = { n: number; cells: StripCell[] };

function slotsOf(cells: StripCell[]): Slot[] {
  const slots: Slot[] = [];
  for (const cell of cells) {
    const last = slots[slots.length - 1];
    if (last && last.n === cell.n) last.cells.push(cell);
    else slots.push({ n: cell.n, cells: [cell] });
  }
  return slots;
}

const r1 = (v: number) => Math.round(v * 100) / 100;

function Cell({
  cell,
  x,
  y,
  w,
  h,
  size,
  tone,
}: {
  cell: StripCell;
  x: number;
  y: number;
  w: number;
  h: number;
  size: Size;
  tone: "paper" | "dark";
}) {
  const { dash, peg } = DIMS[size];
  const line = tone === "dark" ? "var(--color-lime)" : "var(--color-rosewood)";
  const chalk = tone === "dark" ? "var(--color-chalk)" : "var(--color-ink-soft)";
  const hatchInk = tone === "dark" ? "rgb(250 248 245 / 0.7)" : "rgb(42 26 18 / 0.6)";
  const dark = "rgb(42 26 18 / 0.6)";
  const lime = "var(--color-lime)";
  const built = BUILT.includes(cell.state);
  const courses = h >= 28 ? 3 : 2;
  const course = h / courses;

  // Bed joints across the cell, and head joints in running bond where the cell is wide enough.
  let joints = "";
  for (let i = 1; i < courses; i++) joints += `M${r1(x)} ${r1(y + i * course)}h${r1(w)}`;
  if (w >= 8) {
    for (let i = 0; i < courses; i++) {
      const offsets = i % 2 === 0 ? [0.5] : [0.25, 0.75];
      for (const o of offsets) joints += `M${r1(x + w * o)} ${r1(y + i * course)}v${r1(course)}`;
    }
  }
  const half = `M${r1(x)} ${r1(y + h / 2)}h${r1(w / 2)}`;
  const inset = { x: r1(x + 0.5), y: r1(y + 0.5), width: r1(Math.max(w - 1, 0.5)), height: r1(h - 1) };
  const fade = (on: boolean): CSSProperties => ({ opacity: on ? 1 : 0 });

  return (
    <g>
      {/* To come: chalk dashes. Under way: a solid outline with an ink hatch. */}
      <rect
        {...inset}
        className="inst-fill"
        style={{ ...fade(!built), fill: "none", stroke: cell.state === "under-way" ? line : chalk, strokeWidth: 1 }}
        strokeDasharray={cell.state === "under-way" ? undefined : dash}
        vectorEffect="non-scaling-stroke"
      />
      {cell.state === "under-way" && (
        <path d={hatch({ x, y, w, h }, size === 264 ? 5 : 3.5)} style={{ stroke: hatchInk, strokeWidth: 1 }} />
      )}
      {/* Built: laterite with dark joints, then lime run into the joints as the money comes. */}
      <rect x={r1(x)} y={r1(y)} width={r1(w)} height={r1(h)} className="inst-fill" style={{ ...fade(built), fill: "var(--color-laterite)" }} />
      {built && (
        <>
          <path d={joints} className="inst-fill" style={{ ...fade(cell.state !== "paid" && cell.state !== "approved"), stroke: dark, strokeWidth: 1 }} shapeRendering="crispEdges" />
          <path d={joints} className="inst-fill" style={{ ...fade(cell.state === "approved"), stroke: lime, strokeWidth: 1 }} strokeDasharray="2 1.5" shapeRendering="crispEdges" />
          <path d={joints} className="inst-fill" style={{ ...fade(cell.state === "paid"), stroke: lime, strokeWidth: 1 }} shapeRendering="crispEdges" />
          <path d={half} className="inst-fill" style={{ ...fade(cell.state === "part-paid"), stroke: lime, strokeWidth: 1.25 }} />
          {size !== 40 && <rect {...inset} style={{ fill: "none", stroke: line, strokeWidth: 1, opacity: tone === "dark" ? 0.7 : 0.85 }} />}
        </>
      )}
      {/* A split waiting for the client: a dashed saw cut down the middle. */}
      {cell.pendingSplit && (
        <path
          d={`M${r1(x + w / 2)} ${r1(y - 1)}v${r1(h + 2)}`}
          style={{ stroke: line, strokeWidth: 1.25 }}
          strokeDasharray={size === 40 ? "1.5 1" : "2.5 1.5"}
        />
      )}
      {/* Raised, with the client: the peg glyph stands over the cell. */}
      <g className="inst-fill" style={fade(cell.state === "raised")}>
        <PegGlyphAt x={r1(x + w / 2)} y={y} h={peg} />
      </g>
    </g>
  );
}

export function ProgrammeStrip({
  cells,
  size,
  tone = "paper",
  label,
  className = "",
}: {
  cells: StripCell[];
  size: Size;
  tone?: "paper" | "dark";
  /** What the strip says. Without it, a summary is worked out from the cells. */
  label?: string;
  className?: string;
}) {
  const { h, peg, gap } = DIMS[size];
  const slots = slotsOf(cells);
  const count = Math.max(slots.length, 1);
  const slotW = (size - gap * (count - 1)) / count;
  const height = h + peg;

  return (
    <svg
      viewBox={`0 0 ${size} ${height}`}
      width={size}
      height={height}
      className={`block max-w-full shrink-0 overflow-visible ${className}`}
      style={{ height: "auto" }}
      role="img"
      aria-label={label ?? stripSummary(cells)}
      focusable="false"
    >
      {slots.map((slot, i) => {
        const x0 = i * (slotW + gap);
        const parts = slot.cells.length;
        const split = parts > 1 ? Math.min(gap, 1.5) : 0;
        const w = (slotW - split * (parts - 1)) / parts;
        return slot.cells.map((cell, j) => (
          <Cell
            key={`${cell.n}${cell.split ?? ""}`}
            cell={cell}
            x={x0 + j * (w + split)}
            y={peg}
            w={w}
            h={h}
            size={size}
            tone={tone}
          />
        ));
      })}
    </svg>
  );
}
