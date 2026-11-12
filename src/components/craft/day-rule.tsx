import type { CSSProperties } from "react";
import { addDays, dayCount, formatDate } from "@/lib/format";

// A length of teak marked in days. A brass notch is fixed at the handover date as planned;
// a lime marker slides to where a change being tried would move it, and the days between
// are hatched in brass. The same thing is always written under it in words.

/** Day ticks on the rule: two before the planned date and twenty-six after. */
const TICKS = 28;
const BEFORE = 2;

function Rule({ base, days, className }: { base: string; days: number; className?: string }) {
  const shown = Math.min(Math.max(Math.round(days), 0), TICKS - BEFORE);
  const planned = `Handover as planned, ${formatDate(base)}`;
  const moved =
    days > 0
      ? `${dayCount(days)} later, ${formatDate(addDays(base, days))}`
      : days < 0
        ? `${dayCount(-days)} earlier, ${formatDate(addDays(base, days))}`
        : "No change to the handover date";

  return (
    <div
      className={`day-rule${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={`${planned}. ${moved}.`}
      style={{ "--days": shown } as CSSProperties}
    >
      <p className="day-rule-planned lettering" aria-hidden="true">
        {planned}
      </p>
      <div className="day-rule-strip" aria-hidden="true">
        <span className="day-rule-ticks" />
        <span className="day-rule-stretch" />
        <span className="day-rule-notch" />
        <span className="day-rule-marker measure" />
      </div>
      <p className="day-rule-moved" aria-hidden="true">
        {moved}
      </p>
    </div>
  );
}

export function DayRule({
  base,
  days,
  className,
}: {
  /** ISO date of the handover as planned. */
  base: string;
  /** Days a change being tried would add. */
  days: number;
  className?: string;
}) {
  // A new planned date is a new rule: after an approval the marker is on the notch at once.
  return <Rule key={base} base={base} days={days} className={className} />;
}
