import { dayCount, inr } from "@/lib/format";
import { RollingFigure } from "./rolling-figure";

/**
 * A figure as agreed and, while something is being tried, what it would become. The agreed
 * figure is struck through but stays readable, and the tried one rolls in beside it. With
 * nothing tried it is the agreed figure alone.
 */
export function StruckFigure({
  agreed,
  tried,
  format = "inr",
  note,
  size = "md",
}: {
  agreed: number;
  /** What it would be with the changes being tried, or null when nothing is tried. */
  tried: number | null;
  format?: "inr" | "days";
  /** Said after the tried figure: "with the jacuzzi, not approved". */
  note?: string;
  size?: "lg" | "md" | "sm";
}) {
  // A trial that changes nothing here is not a trial as far as this figure goes.
  const other = tried !== null && tried !== agreed ? tried : null;
  const write = (value: number) => (format === "inr" ? inr(value) : dayCount(value));
  const said = note ?? "being tried, not approved";

  return (
    <span className="struck" data-size={size} data-on={other !== null ? "" : undefined}>
      <span className="sr-only">
        {other !== null ? `${write(agreed)} as agreed. ${write(other)} ${said}.` : write(agreed)}
      </span>
      <span className="struck-agreed figure" aria-hidden="true">
        <RollingFigure value={agreed} format={format} />
        <span className="struck-bar" />
      </span>
      {/* Always present, so the figure rolls from the agreed value as it appears. */}
      <span className="struck-tried figure" aria-hidden="true">
        <RollingFigure value={other ?? agreed} format={format} />
      </span>
      {other !== null && (
        <span className="struck-note" aria-hidden="true">
          {said}
        </span>
      )}
    </span>
  );
}
