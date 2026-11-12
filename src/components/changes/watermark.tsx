// Her name and today's date, written across a view-only sheet from corner to corner. It is
// drawn over the sheet and takes no pointer, so the sheet is read through it and cannot be
// lifted from the page. The same mark as the design viewer's, kept here for the changes.

const COLUMNS = 6;
const ROWS = 12;

export function Watermark({ text }: { text: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-col justify-center gap-y-[140px] opacity-[0.09]">
        {Array.from({ length: ROWS }, (_, row) => (
          <p key={row} className={`flex gap-x-[240px] whitespace-nowrap text-15 font-semibold ${row % 2 ? "pl-[120px]" : ""}`}>
            {Array.from({ length: COLUMNS }, (_, column) => (
              <span key={column}>{text}</span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
