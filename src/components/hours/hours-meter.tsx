// Advisory hours as a row of cells, one per hour: filled for what is used, part filled for
// a half hour, open for what is left. Hours used beyond the pool show as brick cells.

/** "2.5 h", "12 h". */
export function h(value: number): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, "");
  return `${text} h`;
}

export function HoursMeter({
  granted,
  used,
  tone = "light",
  label,
}: {
  granted: number;
  used: number;
  /** "dark" on rosewood glass, "light" on cream glass. */
  tone?: "dark" | "light";
  label: string;
}) {
  const cells = Math.max(Math.ceil(granted), Math.ceil(used), 1);
  const track = tone === "dark" ? "bg-lime/15" : "bg-ink/10";
  const fill = tone === "dark" ? "bg-lime" : "bg-laterite";

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={granted}
      aria-valuenow={Math.min(used, granted)}
      aria-valuetext={`${h(used)} used of ${h(granted)}`}
      className="flex gap-1"
    >
      {Array.from({ length: cells }, (_, index) => {
        const share = Math.min(Math.max(used - index, 0), 1);
        const over = index >= granted;
        return (
          <span key={index} className={`relative h-3 min-w-0 flex-1 overflow-hidden rounded-full ${track}`}>
            {share > 0 && (
              <span
                className={`absolute inset-0 origin-left rounded-full ${over ? "bg-brick" : fill}`}
                style={{ transform: `scaleX(${share})` }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
