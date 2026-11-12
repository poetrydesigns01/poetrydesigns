// One division of the payment rule, as a length of teak, with the cut that would split it
// in two. The cut is dashed while it is only proposed and solid once she has approved it.
// The drawing is decoration: the rows beside it say the same thing in words.

export function SawnCell({
  n,
  parts,
  cut,
}: {
  /** The milestone: 5. */
  n: number;
  /** Percents of the contract value, e.g. [5, 5]. */
  parts: [number, number];
  /** "proposed" draws a dashed cut; "made" a solid one, with the pieces named 5a and 5b. */
  cut: "proposed" | "made";
}) {
  const share = parts[0] / (parts[0] + parts[1]);
  const at = `${(share * 100).toFixed(2)}%`;
  const made = cut === "made";

  return (
    <div aria-hidden="true" className="w-full max-w-[20rem]">
      <div className="relative h-10" style={{ backgroundImage: "var(--tex-teak)" }}>
        {/* The saw cut. Made, it is a kerf of light end grain; proposed, a pencil line. */}
        <span
          className={`absolute inset-y-0 -translate-x-1/2 ${made ? "w-[5px] bg-teak-light" : "w-0 border-l-2 border-dashed border-lime"}`}
          style={{ left: at }}
        />
      </div>
      <div className="lettering mt-1 grid" style={{ gridTemplateColumns: `${at} minmax(0, 1fr)` }}>
        {made ? (
          <>
            <span className="text-center">
              {n}a, {parts[0]}%
            </span>
            <span className="text-center">
              {n}b, {parts[1]}%
            </span>
          </>
        ) : (
          <span className="col-span-2 text-center">
            Milestone {n}, cut proposed at {parts[0]}%
          </span>
        )}
      </div>
    </div>
  );
}
