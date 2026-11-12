// A stand-in drawing for the demo's design viewer. Real projects show the architect's uploaded PDF or image here.

type Room = { x: number; y: number; w: number; h: number; name: string; size: string };
type Box = { x: number; y: number; w: number; h: number };

/** Every plan is drawn on a sheet this size, at 50 units to a metre. */
export const PLAN_VIEW = { w: 800, h: 600 };

const PLANS: Record<string, Room[]> = {
  "ground-floor-plan": [
    { x: 60, y: 60, w: 300, h: 220, name: "Living", size: "6.0 × 4.5 m" },
    { x: 360, y: 60, w: 200, h: 220, name: "Dining", size: "4.0 × 4.5 m" },
    { x: 560, y: 60, w: 180, h: 220, name: "Kitchen", size: "3.6 × 4.5 m" },
    { x: 60, y: 280, w: 220, h: 200, name: "Verandah", size: "4.4 × 4.0 m" },
    { x: 280, y: 280, w: 140, h: 200, name: "Stair", size: "2.8 × 4.0 m" },
    { x: 420, y: 280, w: 200, h: 200, name: "Guest bedroom", size: "4.0 × 4.0 m" },
    { x: 620, y: 280, w: 120, h: 200, name: "Bath", size: "2.4 × 4.0 m" },
  ],
  "first-floor-plan": [
    { x: 60, y: 60, w: 280, h: 220, name: "Master bedroom", size: "5.6 × 4.5 m" },
    { x: 340, y: 60, w: 150, h: 220, name: "Study", size: "3.0 × 4.5 m" },
    { x: 490, y: 60, w: 250, h: 220, name: "Bedroom 2", size: "5.0 × 4.5 m" },
    { x: 60, y: 280, w: 160, h: 200, name: "Bath", size: "3.2 × 4.0 m" },
    { x: 220, y: 280, w: 200, h: 200, name: "Stair and lobby", size: "4.0 × 4.0 m" },
    { x: 420, y: 280, w: 200, h: 200, name: "Bedroom 3", size: "4.0 × 4.0 m" },
    { x: 620, y: 280, w: 120, h: 200, name: "Balcony", size: "2.4 × 4.0 m" },
  ],
  "terrace-plan": [
    { x: 60, y: 60, w: 330, h: 420, name: "Open terrace", size: "6.6 × 8.4 m" },
    { x: 390, y: 60, w: 350, h: 240, name: "Family room", size: "7.0 × 4.8 m" },
    { x: 390, y: 300, w: 150, h: 180, name: "Stair", size: "3.0 × 3.6 m" },
    { x: 540, y: 300, w: 200, h: 180, name: "Utility", size: "4.0 × 3.6 m" },
  ],
};

/** The parts of a plan that differ from one version to the next. */
type PlanVersion = {
  /** The door opening in the wall between the family room and the terrace. */
  door: { x: number; y0: number; y1: number };
  /** The headroom over the stair, drawn a little clear of the walls. */
  headroom: Box;
};

/** One thing that changed between two versions, tied to a place on the drawing. */
export type Revision = {
  n: number;
  text: string;
  /** Where its numbered mark sits. */
  mark: { x: number; y: number };
  /** The part of the drawing it is about. */
  place: Box;
};

/**
 * What changed between the versions of a plan, in sheet units. The terrace door is 1.8 m
 * wide in version 1 and 3.0 m in version 2; the headroom moves from the south side of the
 * stair to the north side.
 */
export const REVISIONS: Record<string, { versions: Record<number, PlanVersion>; changes: Revision[] }> = {
  "terrace-plan": {
    versions: {
      1: { door: { x: 390, y0: 135, y1: 225 }, headroom: { x: 400, y: 400, w: 130, h: 72 } },
      2: { door: { x: 390, y0: 105, y1: 255 }, headroom: { x: 400, y: 308, w: 130, h: 72 } },
    },
    changes: [
      {
        n: 1,
        text: "Terrace door widened from 1.8 m to 3.0 m.",
        mark: { x: 348, y: 180 },
        place: { x: 368, y: 91, w: 44, h: 178 },
      },
      {
        n: 2,
        text: "Staircase headroom moved to the north side.",
        mark: { x: 566, y: 390 },
        place: { x: 384, y: 292, w: 162, h: 196 },
      },
    ],
  },
};

const INK = "var(--color-rosewood)";
const SOFT = "var(--color-ink-soft)";
const PAPER = "var(--color-paper)";
const SANS = "var(--font-sans)";

type Weight = "plain" | "added";

/** A sliding door in a wall: the wall is cut between the jambs and two leaves stand in the gap. */
function Door({ door, weight }: { door: PlanVersion["door"]; weight: Weight }) {
  const { x, y0, y1 } = door;
  const mid = (y0 + y1) / 2;
  const added = weight === "added";
  return (
    <g stroke={INK}>
      <line x1={x} y1={y0} x2={x} y2={y1} stroke={PAPER} strokeWidth="6" />
      <path d={`M${x - 9} ${y0}h18M${x - 9} ${y1}h18`} strokeWidth={added ? 4.5 : 2} />
      <path d={`M${x - 3} ${y0}V${mid + 7}M${x + 3} ${mid - 7}V${y1}`} strokeWidth={added ? 2.5 : 1.2} />
    </g>
  );
}

/** The headroom over the stair, with the treads that run under it. */
function Headroom({ box, weight }: { box: Box; weight: Weight }) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return (
    <g stroke={INK}>
      <g strokeWidth="1" opacity="0.45">
        {Array.from({ length: 6 }, (_, i) => (
          <line key={i} x1={box.x + 8} y1={box.y + 11 + i * 10} x2={box.x + box.w - 8} y2={box.y + 11 + i * 10} />
        ))}
      </g>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} strokeWidth={weight === "added" ? 4.5 : 2} />
      <rect x={cx - 40} y={cy - 11} width="80" height="21" fill={PAPER} stroke="none" />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={INK} stroke="none" fontSize="13" fontFamily={SANS} fontWeight="600">
        Headroom
      </text>
    </g>
  );
}

/** What the earlier version had and this one does not: dashed, in soft ink, and named. */
function Removed({ was, now, version }: { was: PlanVersion; now: PlanVersion; version: number }) {
  const { x } = now.door;
  // The stretches of wall that stood in the earlier version and are opening now.
  const stubs = [
    [now.door.y0, was.door.y0],
    [was.door.y1, now.door.y1],
  ].filter(([from, to]) => to > from);
  const label = {
    fill: SOFT,
    stroke: "none",
    fontSize: 13,
    fontFamily: SANS,
    fontWeight: 600,
  };
  return (
    <g stroke={SOFT} strokeWidth="1.5" strokeDasharray="6 4">
      {stubs.map(([from, to]) => (
        <line key={from} x1={x} y1={from} x2={x} y2={to} />
      ))}
      <path d={`M${x - 9} ${was.door.y0}h18M${x - 9} ${was.door.y1}h18`} />
      {/* The old door is named on the terrace side of the wall, clear of the room names. */}
      {stubs.length > 0 && (
        <text x={x - 14} y={(stubs[0][0] + stubs[0][1]) / 2 + 4} textAnchor="end" {...label}>
          Version {version}
        </text>
      )}
      {/* The old headroom is an empty box with its own name inside it. */}
      <rect x={was.headroom.x} y={was.headroom.y} width={was.headroom.w} height={was.headroom.h} />
      <text x={was.headroom.x + was.headroom.w / 2} y={was.headroom.y + was.headroom.h / 2 + 4} textAnchor="middle" {...label}>
        Version {version}
      </text>
    </g>
  );
}

export function FloorPlan({
  designId,
  title,
  sheet,
  version,
  changedFrom,
  thumb = false,
}: {
  designId: string;
  title: string;
  sheet: string;
  version: number;
  /** Draw this earlier version under the plan, so what was removed and what was added both show. */
  changedFrom?: number;
  /** Walls only, for a small picture of the sheet in a list. */
  thumb?: boolean;
}) {
  const rooms = PLANS[designId] ?? PLANS["ground-floor-plan"];
  const revisions = REVISIONS[designId];
  const now = revisions?.versions[version];
  const was = changedFrom === undefined ? undefined : revisions?.versions[changedFrom];
  const weight: Weight = was ? "added" : "plain";

  if (thumb) {
    return (
      <svg viewBox="40 0 720 540" aria-hidden="true" focusable="false" className="block h-auto w-full" fill="none">
        {rooms.map((room) => (
          <rect
            key={room.name}
            x={room.x}
            y={room.y}
            width={room.w}
            height={room.h}
            stroke={INK}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <rect x="60" y="60" width="680" height="420" stroke={INK} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  /** Where a room's name is written. In the stair room it keeps clear of the headroom. */
  const nameY = (room: Room) => {
    if (!now || !room.name.startsWith("Stair")) return room.y + room.h / 2;
    const { y, h } = now.headroom;
    return y < room.y + room.h / 2 ? (y + h + room.y + room.h) / 2 : (room.y + y) / 2;
  };

  return (
    <svg
      viewBox={`0 0 ${PLAN_VIEW.w} ${PLAN_VIEW.h}`}
      role="img"
      aria-label={
        was
          ? `${title}, version ${version}, with what changed since version ${changedFrom} marked`
          : `${title}, version ${version}`
      }
      className="block h-auto w-full"
      fill="none"
    >
      <rect x="0" y="0" width="800" height="600" fill={PAPER} />
      {/* Sheet border */}
      <rect x="16" y="16" width="768" height="568" stroke={INK} strokeWidth="1" opacity="0.5" />

      {/* Outer walls */}
      <rect x="60" y="60" width="680" height="420" stroke={INK} strokeWidth="5" />

      {rooms.map((room) => (
        <g key={room.name}>
          <rect x={room.x} y={room.y} width={room.w} height={room.h} stroke={INK} strokeWidth="2" />
          {now && was && room.name.startsWith("Stair") ? (
            // With both headrooms drawn the stair has one clear line left, between the two.
            <text
              x={room.x + room.w / 2}
              y={(Math.min(now.headroom.y, was.headroom.y) + now.headroom.h + Math.max(now.headroom.y, was.headroom.y)) / 2 + 4.5}
              textAnchor="middle"
              fill={INK}
              fontSize="12.5"
              fontFamily={SANS}
              fontWeight="600"
            >
              {room.name}, {room.size}
            </text>
          ) : (
            <>
              <text x={room.x + room.w / 2} y={nameY(room) - 4} textAnchor="middle" fill={INK} fontSize="16" fontFamily={SANS} fontWeight="600">
                {room.name}
              </text>
              <text x={room.x + room.w / 2} y={nameY(room) + 15} textAnchor="middle" fill={INK} fontSize="13" fontFamily={SANS} opacity="0.7">
                {room.size}
              </text>
            </>
          )}
        </g>
      ))}

      {/* Stair treads. Where the headroom is drawn, the treads are drawn with it. */}
      {!now &&
        rooms
          .filter((room) => room.name.startsWith("Stair"))
          .map((room) => (
            <g key={`${room.name}-treads`} stroke={INK} strokeWidth="1" opacity="0.45">
              {Array.from({ length: 7 }, (_, i) => (
                <line key={i} x1={room.x + 14} y1={room.y + 18 + i * 9} x2={room.x + room.w - 14} y2={room.y + 18 + i * 9} />
              ))}
            </g>
          ))}

      {/* The parts that change between versions. Added lines are solid and heavier. */}
      {now && (
        <>
          <Door door={now.door} weight={weight} />
          <Headroom box={now.headroom} weight={weight} />
        </>
      )}
      {now && was && changedFrom !== undefined && <Removed was={was} now={now} version={changedFrom} />}

      {/* Overall dimensions */}
      <g stroke={INK} strokeWidth="1" opacity="0.6">
        <line x1="60" y1="508" x2="740" y2="508" />
        <line x1="60" y1="502" x2="60" y2="514" />
        <line x1="740" y1="502" x2="740" y2="514" />
        <line x1="38" y1="60" x2="38" y2="480" />
        <line x1="32" y1="60" x2="44" y2="60" />
        <line x1="32" y1="480" x2="44" y2="480" />
      </g>
      <text x="400" y="527" textAnchor="middle" fill={INK} fontSize="13" fontFamily={SANS}>13.6 m</text>
      <text x="30" y="274" textAnchor="middle" fill={INK} fontSize="13" fontFamily={SANS} transform="rotate(-90 30 274)">8.4 m</text>

      {/* Title block */}
      <g>
        <rect x="484" y="536" width="300" height="48" stroke={INK} strokeWidth="1" opacity="0.5" />
        <line x1="684" y1="536" x2="684" y2="584" stroke={INK} strokeWidth="1" opacity="0.5" />
        <text x="494" y="556" fill={INK} fontSize="13" fontFamily="var(--font-display)" fontWeight="500">{title}</text>
        <text x="494" y="574" fill={INK} fontSize="11" fontFamily={SANS} opacity="0.75">Iyer Residence, scale 1:100</text>
        <text x="694" y="556" fill={INK} fontSize="12" fontFamily={SANS} fontWeight="600">{sheet}</text>
        <text x="694" y="574" fill={INK} fontSize="11" fontFamily={SANS} opacity="0.75">
          {was ? `Versions ${changedFrom} and ${version}` : `Version ${version}`}
        </text>
      </g>

      {/* North arrow */}
      <g stroke={INK} strokeWidth="1.2">
        <circle cx="52" cy="556" r="16" opacity="0.6" />
        <line x1="52" y1="570" x2="52" y2="542" />
        <line x1="52" y1="542" x2="46" y2="552" />
        <line x1="52" y1="542" x2="58" y2="552" />
      </g>
      <text x="76" y="560" fill={INK} fontSize="12" fontFamily={SANS}>N</text>
    </svg>
  );
}
