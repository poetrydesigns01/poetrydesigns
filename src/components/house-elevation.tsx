// The front elevation of the house, drawn as far as it is built.
// Built parts are inked, the part under way is brass, and what is still to come is dashed.

type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number };

const rect = (x: number, y: number, w: number, h: number): Shape => ({ kind: "rect", x, y, w, h });
const line = (x1: number, y1: number, x2: number, y2: number): Shape => ({ kind: "line", x1, y1, x2, y2 });

const railing = (from: number, to: number, top: number, bottom: number): Shape[] => {
  const posts: Shape[] = [line(from, top, to, top)];
  for (let x = from + 14; x < to; x += 14) posts.push(line(x, top, x, bottom));
  return posts;
};

export const ELEVATION_STAGES: { label: string; labelY: number; shapes: Shape[] }[] = [
  {
    label: "Plinth",
    labelY: 386,
    shapes: [rect(110, 372, 500, 20), line(352, 392, 440, 392), line(360, 382, 432, 382)],
  },
  {
    label: "Ground floor",
    labelY: 321,
    shapes: [
      rect(110, 262, 500, 110),
      // Living room glazing
      rect(140, 286, 190, 86),
      line(187.5, 286, 187.5, 372),
      line(235, 286, 235, 372),
      line(282.5, 286, 282.5, 372),
      // Entrance
      rect(372, 292, 48, 80),
      line(396, 292, 396, 372),
      // Garage
      rect(450, 304, 140, 68),
      line(450, 321, 590, 321),
      line(450, 338, 590, 338),
      line(450, 355, 590, 355),
    ],
  },
  {
    label: "First floor",
    labelY: 211,
    shapes: [
      // The first floor overhangs the entrance side
      rect(80, 152, 390, 110),
      line(80, 262, 610, 262),
      rect(112, 180, 188, 60),
      line(159, 180, 159, 240),
      line(206, 180, 206, 240),
      line(253, 180, 253, 240),
      rect(338, 180, 100, 60),
      line(388, 180, 388, 240),
      ...railing(470, 610, 232, 262),
      line(610, 232, 610, 262),
    ],
  },
  {
    label: "Second floor",
    labelY: 111,
    shapes: [
      rect(210, 62, 310, 90),
      rect(242, 86, 120, 48),
      line(302, 86, 302, 134),
      rect(404, 86, 84, 66),
      // Pergola over the terrace
      line(80, 104, 214, 104),
      line(92, 104, 92, 152),
      line(150, 104, 150, 152),
      ...railing(80, 210, 126, 152),
    ],
  },
  {
    label: "Roof",
    labelY: 50,
    shapes: [rect(192, 50, 346, 12), line(230, 50, 230, 38), line(230, 38, 300, 38), line(300, 38, 300, 50)],
  },
];

function ShapeEl({ shape, className, style }: { shape: Shape; className?: string; style?: React.CSSProperties }) {
  if (shape.kind === "rect") {
    return (
      <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} pathLength={1} className={className} style={style} />
    );
  }
  return (
    <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} pathLength={1} className={className} style={style} />
  );
}

export function HouseElevation({
  builtUpTo,
  animate = true,
  showLabels = true,
  tone = "dark",
  className,
}: {
  /** Index of the last finished stage. Pass 4 to draw the whole house as built. */
  builtUpTo: number;
  animate?: boolean;
  showLabels?: boolean;
  /** "dark" draws in lime on rosewood; "light" draws in rosewood on paper. */
  tone?: "dark" | "light";
  className?: string;
}) {
  const ink = tone === "dark" ? "var(--color-lime)" : "var(--color-rosewood)";
  const current = tone === "dark" ? "var(--color-brass-light)" : "var(--color-brass)";
  const finished = ELEVATION_STAGES.filter((_, index) => index <= builtUpTo)
    .map((stage) => stage.label.toLowerCase())
    .join(", ");
  const underWay = ELEVATION_STAGES[builtUpTo + 1]?.label.toLowerCase();

  return (
    <svg
      viewBox="0 0 720 440"
      className={className}
      role="img"
      aria-label={
        underWay
          ? `Front elevation of the house. Finished: ${finished}. Under way: ${underWay}.`
          : "Front elevation of the house."
      }
      fill="none"
      strokeLinecap="square"
    >
      {/* Ground and earth */}
      <line x1="20" y1="392" x2="700" y2="392" stroke={ink} strokeWidth="1.5" opacity="0.9" />
      <g stroke={ink} strokeWidth="1" opacity="0.28">
        {Array.from({ length: 34 }, (_, i) => (
          <line key={i} x1={28 + i * 20} y1="406" x2={40 + i * 20} y2="394" />
        ))}
      </g>

      {/* A tree, for scale */}
      <g stroke={ink} strokeWidth="1" opacity="0.4">
        <line x1="52" y1="392" x2="52" y2="318" />
        <circle cx="52" cy="290" r="30" />
        <line x1="52" y1="340" x2="66" y2="322" />
      </g>

      {ELEVATION_STAGES.map((stage, index) => {
        const state = index <= builtUpTo ? "built" : index === builtUpTo + 1 ? "current" : "future";
        const stageStyle = { "--stage": index } as React.CSSProperties;

        return (
          <g key={stage.label}>
            <g
              stroke={state === "current" ? current : ink}
              strokeWidth={state === "future" ? 1 : 1.6}
              strokeDasharray={state === "future" ? "3 6" : undefined}
              className={state === "future" && animate ? "ink-fade" : undefined}
              style={
                state === "future"
                  ? ({ ...stageStyle, "--to": 0.4, opacity: animate ? undefined : 0.4 } as React.CSSProperties)
                  : undefined
              }
            >
              {stage.shapes.map((shape, shapeIndex) => (
                <ShapeEl
                  key={shapeIndex}
                  shape={shape}
                  className={state !== "future" && animate ? "ink" : undefined}
                  style={state !== "future" && animate ? stageStyle : undefined}
                />
              ))}
            </g>

            {showLabels && (
              <g
                className={animate ? "ink-fade" : undefined}
                style={{ ...stageStyle, "--to": state === "future" ? 0.45 : 1 } as React.CSSProperties}
                opacity={animate ? undefined : state === "future" ? 0.45 : 1}
              >
                <line x1="628" y1={stage.labelY - 4} x2="640" y2={stage.labelY - 4} stroke={state === "current" ? current : ink} strokeWidth="1" />
                <text
                  x="646"
                  y={stage.labelY}
                  fill={state === "current" ? current : ink}
                  fontSize="12.5"
                  fontFamily="var(--font-sans)"
                  fontWeight={state === "current" ? 600 : 400}
                >
                  {stage.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
