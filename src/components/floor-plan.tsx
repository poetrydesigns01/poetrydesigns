// A stand-in drawing for the demo's design viewer. Real projects show the architect's uploaded PDF or image here.

type Room = { x: number; y: number; w: number; h: number; name: string; size: string };

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

export function FloorPlan({ designId, title, sheet, version }: { designId: string; title: string; sheet: string; version: number }) {
  const rooms = PLANS[designId] ?? PLANS["ground-floor-plan"];
  const ink = "var(--color-rosewood)";

  return (
    <svg viewBox="0 0 800 600" role="img" aria-label={`${title}, version ${version}`} className="block h-auto w-full" fill="none">
      <rect x="0" y="0" width="800" height="600" fill="var(--color-paper)" />
      {/* Sheet border */}
      <rect x="16" y="16" width="768" height="568" stroke={ink} strokeWidth="1" opacity="0.5" />

      {/* Outer walls */}
      <rect x="60" y="60" width="680" height="420" stroke={ink} strokeWidth="5" />

      {rooms.map((room) => (
        <g key={room.name}>
          <rect x={room.x} y={room.y} width={room.w} height={room.h} stroke={ink} strokeWidth="2" />
          <text x={room.x + room.w / 2} y={room.y + room.h / 2 - 4} textAnchor="middle" fill={ink} fontSize="15" fontFamily="var(--font-sans)" fontWeight="600">
            {room.name}
          </text>
          <text x={room.x + room.w / 2} y={room.y + room.h / 2 + 15} textAnchor="middle" fill={ink} fontSize="12" fontFamily="var(--font-sans)" opacity="0.7">
            {room.size}
          </text>
        </g>
      ))}

      {/* Stair treads */}
      {rooms
        .filter((room) => room.name.startsWith("Stair"))
        .map((room) => (
          <g key={`${room.name}-treads`} stroke={ink} strokeWidth="1" opacity="0.45">
            {Array.from({ length: 7 }, (_, i) => (
              <line key={i} x1={room.x + 14} y1={room.y + 18 + i * 9} x2={room.x + room.w - 14} y2={room.y + 18 + i * 9} />
            ))}
          </g>
        ))}

      {/* Overall dimensions */}
      <g stroke={ink} strokeWidth="1" opacity="0.6">
        <line x1="60" y1="508" x2="740" y2="508" />
        <line x1="60" y1="502" x2="60" y2="514" />
        <line x1="740" y1="502" x2="740" y2="514" />
        <line x1="38" y1="60" x2="38" y2="480" />
        <line x1="32" y1="60" x2="44" y2="60" />
        <line x1="32" y1="480" x2="44" y2="480" />
      </g>
      <text x="400" y="526" textAnchor="middle" fill={ink} fontSize="12" fontFamily="var(--font-sans)">13.6 m</text>
      <text x="30" y="274" textAnchor="middle" fill={ink} fontSize="12" fontFamily="var(--font-sans)" transform="rotate(-90 30 274)">8.4 m</text>

      {/* Title block */}
      <g>
        <rect x="484" y="536" width="300" height="48" stroke={ink} strokeWidth="1" opacity="0.5" />
        <line x1="684" y1="536" x2="684" y2="584" stroke={ink} strokeWidth="1" opacity="0.5" />
        <text x="494" y="556" fill={ink} fontSize="13" fontFamily="var(--font-display)" fontWeight="500">{title}</text>
        <text x="494" y="574" fill={ink} fontSize="11" fontFamily="var(--font-sans)" opacity="0.75">Iyer Residence, scale 1:100</text>
        <text x="694" y="556" fill={ink} fontSize="12" fontFamily="var(--font-sans)" fontWeight="600">{sheet}</text>
        <text x="694" y="574" fill={ink} fontSize="11" fontFamily="var(--font-sans)" opacity="0.75">Version {version}</text>
      </g>

      {/* North arrow */}
      <g stroke={ink} strokeWidth="1.2">
        <circle cx="52" cy="556" r="16" opacity="0.6" />
        <line x1="52" y1="570" x2="52" y2="542" />
        <line x1="52" y1="542" x2="46" y2="552" />
        <line x1="52" y1="542" x2="58" y2="552" />
      </g>
      <text x="76" y="560" fill={ink} fontSize="12" fontFamily="var(--font-sans)">N</text>
    </svg>
  );
}
