import type { PhotoKind } from "@/lib/firm-data";

// A site photo stands in as a line drawing in a sand frame, 4 by 3, so no one takes it
// for a real photograph. Each kind is drawn once here. The tag says it is a sample.

const WORDS: Record<PhotoKind, string> = {
  "slab-pour": "Concrete being poured on the slab",
  shuttering: "Slab shuttering on props",
  curing: "Slab curing under ponded water",
  columns: "Column steel standing on the slab",
  blocks: "A block wall going up",
  tiles: "Floor tiles being laid",
  steel: "A bundle of steel bars on site",
  sand: "A heap of sand with a shovel",
};

/** The line drawing for each kind, in a 120 by 90 box. */
const ART: Record<PhotoKind, { lines: string; fill?: string }> = {
  "slab-pour": {
    lines:
      "M10 70L38 52H112L84 70Z" + // slab top
      "M10 70V76H84V70M84 76L112 58V52" + // slab edge
      "M20 76V86M52 76V86M80 76V86" + // columns under
      "M96 8C96 22 88 30 70 34V44" + // pump hose
      "M66 44H74" +
      "M68 48l-1 3M72 49l1 3M70 51v3", // drops
    fill: "M44 62L54 56H80L70 62Z",
  },
  shuttering: {
    lines:
      "M8 40H112V46H8Z" + // plywood deck
      "M8 40L30 28H112M112 28V40" +
      "M34 40V46M60 40V46M86 40V46" + // sheet joints
      "M18 46V84M44 46V84M70 46V84M96 46V84" + // props
      "M18 60L44 74M44 60L70 74M70 60L96 74" + // braces
      "M4 84H116",
  },
  curing: {
    lines:
      "M6 62L34 40H114L86 62Z" + // slab
      "M6 62V68H86V62M86 68L114 46V40" +
      "M26 54L50 38M50 54L74 38M74 54L96 40" + // bunds across
      "M20 50H46M44 46H70M66 52H92", // bund lines along
    fill: "M30 50h12l-4 3H26ZM58 46h12l-4 3H54ZM80 50h10l-3 3H76Z",
  },
  columns: {
    lines:
      "M8 74L30 62H112L90 74Z" + // slab
      "M30 66V20M38 66V20M30 56H38M30 46H38M30 36H38M30 26H38" + // cage 1
      "M60 66V14M68 66V14M60 56H68M60 46H68M60 36H68M60 26H68M60 18H68" + // cage 2
      "M90 64V24M98 64V24M90 54H98M90 44H98M90 34H98",
  },
  blocks: {
    lines:
      "M10 80H110" +
      "M10 80V68H110V80M10 68V56H94V68M10 56V44H78V56M10 44V32H54V44" + // courses, stepped end
      "M34 80V68M58 80V68M82 80V68M22 68V56M46 68V56M70 68V56M34 56V44M58 56V44M22 44V32M44 44V32" +
      "M100 40l8 -8M104 44l8 -8", // trowel
  },
  tiles: {
    lines:
      "M4 82L30 46H90L116 82Z" + // floor in perspective
      "M23 56H97M15 68H105" + // rows
      "M45 46L34 82M60 46V82M75 46L86 82", // columns
    fill: "M64 52h12l3 6H66Z",
  },
  steel: {
    lines:
      "M6 62L106 44M6 66L106 48M6 70L106 52M6 74L106 56" + // bars
      "M32 54V74M76 46V66" + // ties
      "M100 36l10 6-6 4" + // tag
      "M4 84H116",
  },
  sand: {
    lines:
      "M8 80Q34 34 60 32Q86 34 112 80Z" + // heap
      "M30 64l4 -2M50 52l5 -1M72 56l5 2M86 66l4 1" + // grain
      "M76 18L58 52M54 50l6 6 4 -7Z", // shovel
  },
};

export function SamplePhoto({
  kind,
  size = "sm",
  tag = true,
}: {
  kind: PhotoKind;
  size?: "sm" | "md";
  /** The "Sample photo" tag. Leave it on for the first photo on a screen. */
  tag?: boolean;
}) {
  const art = ART[kind];
  return (
    <figure className={`relative shrink-0 self-start border border-sand bg-sand-2 ${size === "md" ? "w-[200px]" : "w-[112px]"}`}>
      <svg viewBox="0 0 120 90" className="block aspect-[4/3] w-full" role="img" aria-label={`${WORDS[kind]}. A sample drawing, not a photo.`}>
        {art.fill && <path d={art.fill} style={{ fill: "var(--color-ink-soft)", opacity: 0.45 }} />}
        <path
          d={art.lines}
          style={{ fill: "none", stroke: "var(--color-rosewood)", strokeWidth: 1.1, strokeLinejoin: "round", strokeLinecap: "round", opacity: 0.8 }}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {tag && (
        <figcaption className="absolute bottom-1 left-1 bg-sand-2">
          <span className="sample-tag">Sample photo</span>
        </figcaption>
      )}
    </figure>
  );
}
