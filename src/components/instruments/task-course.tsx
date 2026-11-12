import { hatch } from "@/lib/draw";

// A person's recent tasks laid as one course of blocks, oldest first. A task done on time
// is a solid laterite block; a late one is hatched in ink, and is longer by its days late.
// Each revision cuts a small notch in the top of its block. The words say the figures.

const r1 = (v: number) => Math.round(v * 100) / 100;

/** "5 tasks. 3 on time, 2 late by 11 days in all. 4 revisions." */
export function courseWords(tasks: { late: number; revisions: number }[]): string {
  const late = tasks.filter((t) => t.late > 0);
  const lateDays = late.reduce((sum, t) => sum + t.late, 0);
  const revisions = tasks.reduce((sum, t) => sum + t.revisions, 0);
  const count = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}.`;
  const timing =
    late.length === 0
      ? "All on time."
      : `${tasks.length - late.length} on time, ${late.length} late by ${lateDays} ${lateDays === 1 ? "day" : "days"} in all.`;
  const revised = `${revisions} ${revisions === 1 ? "revision" : "revisions"}.`;
  return `${count} ${timing} ${revised}`;
}

export function TaskCourse({
  tasks,
  label,
  width = 264,
}: {
  tasks: { title: string; late: number; revisions: number }[];
  /** Whose course this is: "Ananya Rao, last 30 days". */
  label: string;
  width?: number;
}) {
  const h = 22;
  const notch = 5;
  const gap = 2;
  // A block is one unit long, and a late one adds a fifth of a unit for each day late.
  const units = tasks.map((t) => 1 + Math.min(t.late, 10) * 0.2);
  const totalUnits = units.reduce((a, b) => a + b, 0) || 1;
  const unit = (width - gap * Math.max(tasks.length - 1, 0)) / totalUnits;
  const blocks = tasks.map((t, i) => ({
    x: units.slice(0, i).reduce((sum, u) => sum + u * unit + gap, 0),
    w: units[i] * unit,
    t,
  }));

  return (
    <figure className="grid justify-items-start gap-1.5">
      <figcaption className="text-15 font-semibold">{label}</figcaption>
      <svg
        viewBox={`0 0 ${width} ${h + 2}`}
        width={width}
        height={h + 2}
        className="block max-w-full"
        style={{ height: "auto" }}
        aria-hidden="true"
        focusable="false"
      >
        {blocks.map(({ x: bx, w, t }, i) => {
          const late = t.late > 0;
          // Notches are cut into the top edge, spread along the block.
          let shape = `M${r1(bx)} ${h + 1}V1`;
          const cuts = Math.min(t.revisions, 4);
          for (let c = 0; c < cuts; c++) {
            const cx = bx + (w * (c + 1)) / (cuts + 1);
            shape += `H${r1(cx - notch / 2)}l${notch / 2} ${notch}l${notch / 2} -${notch}`;
          }
          shape += `H${r1(bx + w)}V${h + 1}Z`;
          // The hatch stays below the notches, so a notch reads as a cut and not a line.
          const lines = late ? hatch({ x: bx, y: notch + 1, w, h: h - notch }, 4.5) : "";
          return (
            <g key={i}>
              <title>{`${t.title}${late ? `, ${t.late} ${t.late === 1 ? "day" : "days"} late` : ", on time"}`}</title>
              <path
                d={shape}
                style={{
                  fill: late ? "var(--color-paper)" : "var(--color-laterite)",
                  stroke: "var(--color-rosewood)",
                  strokeWidth: 1,
                }}
              />
              {late && <path d={lines} style={{ stroke: "rgb(42 26 18 / 0.6)", strokeWidth: 1 }} />}
              {late && <path d={shape} style={{ fill: "none", stroke: "var(--color-rosewood)", strokeWidth: 1 }} />}
            </g>
          );
        })}
      </svg>
      <p className="lettering text-ink-soft">{courseWords(tasks)}</p>
    </figure>
  );
}
