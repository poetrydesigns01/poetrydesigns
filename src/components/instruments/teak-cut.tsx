import type { CSSProperties } from "react";
import { hours } from "@/lib/format";

// A client's advisory hours as a length of teak, to scale. The hours used are sawn off in
// pieces; what is left is whole. Hours bought later are a new board joined on at the end.
// Time about to be logged is a chalk length from where the cut stands; past the end of the
// teak it runs on in chalk, because logging is never blocked. The words carry the figures.

/**
 * The sentence for a cut: "This uses 1.5 of Meera's 2.5 hours left." or, past the end,
 * "This goes 0.5 hours over her allowance. It is still logged, and she will be told."
 */
export function teakWords({
  left,
  adding,
  name,
  pronoun = "their",
}: {
  left: number;
  adding: number;
  /** "Meera's", "the Nairs'". */
  name: string;
  pronoun?: "her" | "his" | "their";
}): string {
  if (adding <= left) return `This uses ${trim(adding)} of ${name} ${hours(Math.max(left, 0))} left.`;
  return `This goes ${hours(adding - Math.max(left, 0))} over ${pronoun} allowance. It is still logged, and ${pronoun === "her" ? "she" : pronoun === "his" ? "he" : "they"} will be told.`;
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");
}

const pct = (v: number, total: number) => `${((v / total) * 100).toFixed(3)}%`;

export function TeakCut({
  granted,
  used,
  adding = 0,
  added = 0,
  label,
  tone = "paper",
}: {
  /** Every hour in the pool, bought ones included. */
  granted: number;
  used: number;
  /** Hours about to be logged: a chalk length. */
  adding?: number;
  /** Of `granted`, the hours bought later: drawn as a board joined on at the end. */
  added?: number;
  /** The words under the strip. */
  label: string;
  tone?: "paper" | "dark";
}) {
  const end = Math.max(granted, used + adding, 0.5);
  // A little room past the end, so chalk running over has somewhere to go.
  const total = end + Math.max(end * 0.04, 0.25);
  const usedOnTeak = Math.min(used, granted);
  const chalk = tone === "dark" ? "var(--color-chalk)" : "var(--color-ink-soft)";
  const ground = tone === "dark" ? "var(--color-rosewood)" : "var(--color-paper)";
  const joinAt = Math.max(granted - added, 0);

  const kerfs: number[] = [];
  for (let h = 1; h < usedOnTeak; h += 1) kerfs.push(h);
  if (usedOnTeak > 0 && usedOnTeak < granted) kerfs.push(usedOnTeak);

  const ticks: number[] = [];
  const step = end > 24 ? 2 : 1;
  for (let h = 0; h <= end + 0.001; h += step) ticks.push(h);

  const box: CSSProperties = { position: "absolute", top: 0, bottom: 0 };

  return (
    <figure className="grid gap-1.5">
      <div aria-hidden="true">
        <div className="relative h-[22px]">
          {/* The board, and the board joined on for hours bought later. */}
          <span style={{ ...box, left: 0, width: pct(granted, total), backgroundImage: "var(--tex-teak)" }} />
          {added > 0 && (
            <span
              style={{
                ...box,
                left: pct(joinAt, total),
                width: 2,
                marginLeft: -1,
                background: tone === "dark" ? "var(--color-lime)" : "var(--color-rosewood)",
              }}
            />
          )}
          {/* What is used is sawn off: the pieces are pale, with a kerf at every hour. */}
          {usedOnTeak > 0 && (
            <span
              className="inst-fill"
              style={{ ...box, left: 0, width: pct(usedOnTeak, total), background: ground, opacity: 0.62 }}
            />
          )}
          {kerfs.map((h) => (
            <span
              key={h}
              style={{ ...box, top: -2, bottom: -2, left: pct(h, total), width: 2, marginLeft: -1, background: ground }}
            />
          ))}
          {/* Already over before this cut: the overrun in chalk past the end. */}
          {used > granted && (
            <span
              style={{
                ...box,
                left: pct(granted, total),
                width: pct(used - granted, total),
                border: `1px dashed ${chalk}`,
                backgroundImage: tone === "dark" ? "var(--tex-hatch-lime)" : "var(--tex-hatch-ink)",
                opacity: 0.55,
              }}
            />
          )}
          {/* The cut about to be made, in chalk. */}
          {adding > 0 && (
            <span
              className="inst-fill"
              style={{
                ...box,
                top: -3,
                bottom: -3,
                left: pct(used, total),
                width: pct(adding, total),
                border: `1.5px dashed ${tone === "dark" ? "var(--color-lime)" : "var(--color-rosewood)"}`,
                background: used + adding > granted ? "transparent" : "rgb(250 248 245 / 0.35)",
              }}
            />
          )}
        </div>
        <div className="relative mt-1 h-1.5">
          {ticks.map((h) => (
            <span
              key={h}
              style={{ position: "absolute", top: 0, left: pct(h, total), width: 1, height: h % 5 === 0 ? 6 : 3, background: chalk }}
            />
          ))}
        </div>
      </div>
      <figcaption className={`lettering ${tone === "dark" ? "text-lime/80" : "text-ink-soft"}`}>{label}</figcaption>
    </figure>
  );
}
