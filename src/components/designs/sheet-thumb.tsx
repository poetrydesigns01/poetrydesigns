import { FloorPlan } from "@/components/floor-plan";
import { HouseMark } from "@/components/house/house-mark";
import type { Design } from "@/lib/demo-data";

// A small picture of a sheet for the designs list, drawn in code: the plan itself for a
// floor plan, the house in line for the elevation, ruled lines for a specification.
// It is decoration; the row beside it says everything in words.

const INK = "var(--color-rosewood)";

/** A written sheet: a heading, then rows of an item and what is specified for it. */
function RuledSheet() {
  const rows = [22, 31, 40, 49, 58];
  return (
    <svg viewBox="0 0 96 72" aria-hidden="true" focusable="false" className="block h-auto w-full" fill="none">
      <path d="M12 12h34" stroke={INK} strokeWidth="2" />
      <path d={`M12 17h72${rows.map((y) => `M12 ${y + 4}h72`).join("")}`} stroke={INK} strokeWidth="1" opacity="0.35" />
      <path d={rows.map((y) => `M12 ${y}h16`).join("")} stroke={INK} strokeWidth="1.5" />
      <path d={rows.map((y, i) => `M36 ${y}h${[44, 36, 48, 30, 40][i]}`).join("")} stroke={INK} strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

export function SheetThumb({
  design,
  version,
  loose = false,
}: {
  design: Design;
  version: number;
  /** Still waiting for her: the sheet sits a little askew on a hard shadow. */
  loose?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex aspect-[4/3] w-24 shrink-0 items-center justify-center border border-ink bg-paper ${loose ? "loose" : ""}`}
    >
      {design.drawing === "plan" && (
        <FloorPlan designId={design.id} title={design.title} sheet={design.sheet} version={version} thumb />
      )}
      {design.drawing === "elevation" && <HouseMark tone="line" upTo={4} className="w-[76px]" />}
      {design.drawing === "spec" && <RuledSheet />}
    </span>
  );
}
