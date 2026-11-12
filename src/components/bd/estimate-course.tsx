import type { EstimateResult } from "@/lib/estimate";

// The estimate as a course of laterite. Part A, the house, is the long course of blocks;
// each Part B item is a block laid beside it, all to one scale. A ruler under them has a
// tick for every ten lakh rupees. Hook-free: a drawing, with its words given by the board.

const W = 320;
const COURSE_H = 30;
const GAP = 5;
const TICK = 1000000;

const r1 = (v: number) => Math.round(v * 100) / 100;

export function EstimateCourse({ result, tone = "dark" }: { result: EstimateResult; tone?: "paper" | "dark" }) {
  const items = result.partB.items;
  const amounts = [result.partA.amount, ...items.map((item) => item.amount)];
  const total = amounts.reduce((sum, a) => sum + a, 0) || 1;
  const room = W - GAP * items.length;
  const scale = room / total;
  const line = tone === "dark" ? "var(--color-lime)" : "var(--color-rosewood)";
  const chalk = tone === "dark" ? "var(--color-chalk)" : "var(--color-ink-soft)";

  // Part A: two staggered rows of blocks, the joints drawn in the line colour.
  const wA = Math.max(r1(result.partA.amount * scale), 2);
  const block = 18;
  const joints: string[] = [];
  for (let row = 0; row < 2; row++) {
    const y0 = row * (COURSE_H / 2);
    for (let x = row === 0 ? block : block / 2; x < wA - 2; x += block) joints.push(`M${r1(x)} ${r1(y0)}v${r1(COURSE_H / 2)}`);
  }

  const widths = items.map((item) => Math.max(r1(item.amount * scale), 3));
  const blocks = items.map((item, i) => {
    const before = widths.slice(0, i).reduce((sum, w) => sum + w + GAP, 0);
    return { key: item.name, x: r1(wA + GAP + before), w: widths[i] };
  });

  // The ruler: a tick for every ten lakh, along the whole length.
  const ticks: number[] = [];
  for (let v = 0; v * scale <= W + 0.5 && v <= total; v += TICK) ticks.push(r1(v * scale));

  return (
    <svg
      viewBox={`0 0 ${W} ${COURSE_H + 14}`}
      width={W}
      height={COURSE_H + 14}
      className="block max-w-full"
      style={{ height: "auto" }}
      aria-hidden="true"
      focusable="false"
    >
      <rect x={0} y={0} width={wA} height={COURSE_H} style={{ fill: "var(--color-laterite)" }} />
      <path d={`M0 ${COURSE_H / 2}h${wA}`} style={{ stroke: line, strokeWidth: 1, opacity: 0.55 }} />
      <path d={joints.join("")} style={{ stroke: line, strokeWidth: 1, opacity: 0.55 }} />
      {blocks.map((b) => (
        <g key={b.key}>
          <rect
            x={b.x + 0.6}
            y={0.6}
            width={Math.max(b.w - 1.2, 1)}
            height={COURSE_H - 1.2}
            style={{ fill: "var(--color-laterite-face)", stroke: line, strokeWidth: 1.2 }}
          />
          <path d={`M${b.x} ${COURSE_H / 2}h${b.w}`} style={{ stroke: line, strokeWidth: 1, opacity: 0.55 }} />
        </g>
      ))}
      <path d={`M0 ${COURSE_H + 6}h${W}`} style={{ stroke: chalk, strokeWidth: 1 }} />
      {ticks.map((t) => (
        <path key={t} d={`M${t} ${COURSE_H + 3}v6`} style={{ stroke: chalk, strokeWidth: 1 }} />
      ))}
    </svg>
  );
}

/** The words under the course: what is drawn, not the figures (the sheet below has those). */
export function courseWords(result: EstimateResult): string {
  const n = result.partB.items.length;
  const items = n === 0 ? "no Part B items" : n === 1 ? "one Part B item" : `${n} Part B items`;
  return `Part A, the house, with ${items} laid beside it, to scale. A tick for every ₹10 lakh.`;
}
