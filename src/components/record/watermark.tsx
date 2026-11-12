// Her name and today's date written across a view-only page, corner to corner. The lines
// sit 140 px apart and the words 240 px apart along a line, at 9% so the page stays legible.

export function Watermark({ text }: { text: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden">
      <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-col justify-center gap-[140px] opacity-[0.09]">
        {Array.from({ length: 10 }, (_, row) => (
          <p key={row} className={`flex gap-[240px] whitespace-nowrap text-15 font-semibold ${row % 2 ? "pl-[120px]" : ""}`}>
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i}>{text}</span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
