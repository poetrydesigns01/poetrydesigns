/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */

// A Net Promoter Score: the number, how many answers it stands on, and a thin bar of
// promoters (kota), passives and detractors (brick). Always shown with its count.

export function NpsScore({
  value,
  count,
  promoters,
  passives,
  detractors,
  size = "md",
  dark = false,
  className = "",
}: {
  /** -100 to 100, or null with no answers. */
  value: number | null;
  count: number;
  promoters?: number;
  passives?: number;
  detractors?: number;
  size?: "sm" | "md" | "lg";
  /** On glass-dark. */
  dark?: boolean;
  className?: string;
}) {
  const number = value === null ? "–" : value > 0 ? `+${value}` : `${value}`;
  const total = (promoters ?? 0) + (passives ?? 0) + (detractors ?? 0);
  const share = (n?: number) => (total > 0 ? `${((n ?? 0) / total) * 100}%` : "0%");
  const soft = dark ? "text-lime/75" : "text-ink-soft";
  const label =
    value === null
      ? "NPS, no answers yet"
      : `NPS ${number}, from ${count === 1 ? "1 answer" : `${count} answers`}${
          total > 0 ? `: ${promoters ?? 0} promoters, ${passives ?? 0} passives, ${detractors ?? 0} detractors` : ""
        }`;
  return (
    <div className={`grid gap-1.5 ${className}`} role="group" aria-label={label}>
      <div className="flex items-baseline gap-2" aria-hidden>
        <span className={`figure ${size === "lg" ? "text-32" : size === "md" ? "text-22" : "text-17"} ${value !== null && value < 0 ? "late-text" : ""}`}>
          {number}
        </span>
        <span className={`lettering ${soft}`}>NPS</span>
        <span className={`text-13 ${soft}`}>{count === 1 ? "1 answer" : `${count} answers`}</span>
      </div>
      {total > 0 && (
        <div className={`flex h-1.5 w-full max-w-40 overflow-hidden rounded-full ${dark ? "bg-lime/15" : "bg-ink/10"}`} aria-hidden>
          <span className="h-full bg-kota" style={{ width: share(promoters) }} />
          <span className={`h-full ${dark ? "bg-lime/30" : "bg-ink/20"}`} style={{ width: share(passives) }} />
          <span className="h-full bg-brick" style={{ width: share(detractors) }} />
        </div>
      )}
    </div>
  );
}
