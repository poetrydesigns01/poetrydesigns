import { hatch, rects } from "@/lib/draw";
import { STEPS, STOPS, STOREYS, TODAY_STOP, type Pass, type Storey } from "@/lib/house-model";

// The house at the size of a word: front faces only, for list rows, the entry screen and
// the letter. It has no hooks, so it can be used anywhere, staff screens included.

const BUILT_TODAY = STOPS[TODAY_STOP].builtUpTo;

/** What the small house should show for a payment stop. */
export function markForStop(stop: number): { upTo: number; passes: Pass[] } {
  const at = STOPS[Math.min(Math.max(Math.round(stop), 0), STOPS.length - 1)];
  return { upTo: at.builtUpTo, passes: at.passes };
}

export function HouseMark({
  upTo = BUILT_TODAY,
  highlight = [],
  passes = [],
  tone = "dark",
  title,
  className = "w-[72px] shrink-0",
}: {
  /** Index of the last built storey: 0 plinth, 1 ground floor, 2 first floor, 3 second floor, 4 roof. */
  upTo?: number;
  /** Storeys to hatch and outline more heavily. */
  highlight?: number[];
  passes?: Pass[];
  /** "dark" on rosewood, "light" on paper, "line" for black line only. */
  tone?: "dark" | "light" | "line";
  /** Says what the drawing shows. Without it the drawing is decoration. */
  title?: string;
  className?: string;
}) {
  const ink = tone === "dark" ? "var(--color-lime)" : "var(--color-rosewood)";
  const chalk = tone === "dark" ? "var(--color-chalk)" : "var(--color-ink-soft)";
  const filled = tone !== "line";
  const wall = passes.includes("paint")
    ? "var(--color-lime)"
    : passes.includes("plaster")
      ? "var(--color-plaster)"
      : "var(--color-laterite)";
  // Walls take the finish; the plinth stays laterite and the roof slab stays as it was poured.
  const fillOf = (storey: Storey) =>
    storey.courses > 1 ? wall : storey.courses === 1 ? "var(--color-laterite)" : "var(--color-plaster-shade)";
  const built = STOREYS.filter((storey) => storey.id <= upTo);
  const glass = rects(built.flatMap((storey) => storey.glass.filter((opening) => !storey.teak.includes(opening))));
  const teak = rects(built.flatMap((storey) => storey.teak));

  return (
    <svg
      viewBox="70 24 580 376"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      fill="none"
    >
      {STOREYS.map((storey) => {
        const isBuilt = storey.id <= upTo;
        const marked = highlight.includes(storey.id);
        return (
          <g key={storey.key}>
            <path
              d={rects(storey.head ? [storey.mass, storey.head] : [storey.mass])}
              vectorEffect="non-scaling-stroke"
              style={{
                fill: isBuilt && filled ? fillOf(storey) : "none",
                stroke: isBuilt ? ink : chalk,
                strokeWidth: marked ? 2 : isBuilt ? 1.25 : 1,
                strokeDasharray: isBuilt ? undefined : "4 3",
              }}
            />
            {marked && (
              <path
                d={hatch(storey.mass, 30)}
                vectorEffect="non-scaling-stroke"
                style={{ stroke: ink, strokeWidth: 1 }}
              />
            )}
          </g>
        );
      })}
      {glass && (
        <path
          d={glass}
          vectorEffect="non-scaling-stroke"
          style={{ fill: filled ? "var(--color-rosewood-2)" : "none", stroke: ink, strokeWidth: 1 }}
        />
      )}
      {teak && (
        <path
          d={teak}
          vectorEffect="non-scaling-stroke"
          style={{
            fill: !filled ? "none" : passes.includes("teak") ? "var(--color-teak)" : "var(--color-rosewood-2)",
            stroke: ink,
            strokeWidth: 1,
          }}
        />
      )}
      {upTo >= 0 && filled && passes.includes("kota") && <path d={rects(STEPS)} style={{ fill: "var(--color-kota)" }} />}
      <path d="M70 392H650" vectorEffect="non-scaling-stroke" style={{ stroke: ink, strokeWidth: 1.5 }} />
    </svg>
  );
}
