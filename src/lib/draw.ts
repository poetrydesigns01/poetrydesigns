import { DEPTH, VIEW, type Line, type Rect } from "./house-model";

// Everything the house is drawn with, as plain path data: block joints, pits, hatches
// and the receding faces. Nothing here uses a pattern, a clip path or an id, because
// several houses can be in the document at once. All of it is worked out from constants,
// so the server and the browser write the same markup.

type Depth = { dx: number; dy: number };

/** One decimal place is finer than a pixel at any size the house is shown. */
const n = (value: number) => String(Math.round(value * 10) / 10);

const box = (x: number, y: number, w: number, h: number) => `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}z`;

/** A seeded generator, so textures are the same on every render. The only randomness allowed. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Polygon points for the receding top face of a mass. */
export function topFace(r: Rect, depth: Depth = DEPTH): string {
  const { dx, dy } = depth;
  return `${n(r.x)},${n(r.y)} ${n(r.x + r.w)},${n(r.y)} ${n(r.x + r.w + dx)},${n(r.y + dy)} ${n(r.x + dx)},${n(r.y + dy)}`;
}

/** Polygon points for the right side face of a mass. */
export function sideFace(r: Rect, depth: Depth = DEPTH): string {
  const { dx, dy } = depth;
  const right = r.x + r.w;
  return `${n(right)},${n(r.y)} ${n(right + dx)},${n(r.y + dy)} ${n(right + dx)},${n(r.y + r.h + dy)} ${n(right)},${n(r.y + r.h)}`;
}

/** Polygon points for everything a mass covers: front, top and side together. */
export function silhouette(r: Rect, depth: Depth = DEPTH): string {
  const { dx, dy } = depth;
  const right = r.x + r.w;
  const bottom = r.y + r.h;
  return [
    [r.x, bottom],
    [r.x, r.y],
    [r.x + dx, r.y + dy],
    [right + dx, r.y + dy],
    [right + dx, bottom + dy],
    [right, bottom],
  ]
    .map(([x, y]) => `${n(x)},${n(y)}`)
    .join(" ");
}

/** The outline of a mass as one path: the front face, then the back edges of the top and side faces. */
export function edges(r: Rect, depth: Depth = DEPTH): string {
  const { dx, dy } = depth;
  const front = box(r.x, r.y, r.w, r.h);
  if (dx === 0 && dy === 0) return front;
  const right = r.x + r.w;
  return (
    front +
    `M${n(r.x)} ${n(r.y)}l${n(dx)} ${n(dy)}h${n(r.w)}l${n(-dx)} ${n(-dy)}` +
    `M${n(right + dx)} ${n(r.y + dy)}v${n(r.h)}l${n(-dx)} ${n(-dy)}`
  );
}

/** Several rectangles as one path. */
export function rects(list: Rect[]): string {
  return list.map((r) => box(r.x, r.y, r.w, r.h)).join("");
}

/** Several lines as one path. */
export function segments(list: Line[]): string {
  return list.map((l) => `M${n(l.x1)} ${n(l.y1)}L${n(l.x2)} ${n(l.y2)}`).join("");
}

const BLOCK = 46;

/**
 * The front face of a mass as courses of blocks in running bond, bottom course first.
 * Blocks are 46 long and alternate rows are offset by half a block. Each course carries
 * its joints, its pits, and the few blocks that are a shade lighter or darker.
 */
export function courseRows(
  mass: Rect,
  courses: number,
  seed: number,
): { y: number; h: number; joints: string; pits: string; light: string }[] {
  const random = mulberry32(seed);
  const h = mass.h / courses;
  const right = mass.x + mass.w;
  const rows = [];
  for (let i = 0; i < courses; i++) {
    const y = mass.y + mass.h - (i + 1) * h;
    const ends = [mass.x];
    for (let x = mass.x + (i % 2 === 0 ? BLOCK : BLOCK / 2); x < right - 6; x += BLOCK) ends.push(x);
    ends.push(right);

    // The bed joint along the top of the course, except where the outline already runs.
    let joints = i < courses - 1 ? `M${n(mass.x)} ${n(y)}h${n(mass.w)}` : "";
    let pits = "";
    let light = "";
    for (let b = 0; b < ends.length - 1; b++) {
      const x0 = ends[b];
      const length = ends[b + 1] - x0;
      if (b > 0) joints += `M${n(x0)} ${n(y)}v${n(h)}`;
      // Laterite is quarried, so no two blocks are quite the same colour.
      const shade = random();
      if (shade < 0.17) light += box(x0, y, length, h);
      else if (shade < 0.31) pits += box(x0, y, length, h);
      if (length < 16) continue;
      const count = 1 + Math.floor(random() * 2.4);
      for (let p = 0; p < count; p++) {
        const w = 2 + random() * 2.5;
        const ph = 1.4 + random() * 1.4;
        pits += box(x0 + 3 + random() * (length - 7 - w), y + 3 + random() * (h - 7 - ph), w, ph);
      }
    }
    rows.push({ y, h, joints, pits, light });
  }
  return rows;
}

/** Oblique course lines on the side face, so the bond turns the corner. */
export function sideCourses(mass: Rect, courses: number, depth: Depth = DEPTH): string {
  const right = mass.x + mass.w;
  const h = mass.h / courses;
  let d = "";
  for (let i = 1; i < courses; i++) d += `M${n(right)} ${n(mass.y + i * h)}l${n(depth.dx)} ${n(depth.dy)}`;
  // Every other course shows a block end on at the corner, so it has a joint half way back.
  for (let i = 0; i < courses; i += 2) {
    d += `M${n(right + depth.dx / 2)} ${n(mass.y + mass.h - (i + 1) * h + depth.dy / 2)}v${n(h)}`;
  }
  return d;
}

/** 45 degree hatch lines inside a rectangle, cut to it by geometry, as one path. */
export function hatch(r: Rect, gap = 7): string {
  const right = r.x + r.w;
  const bottom = r.y + r.h;
  let d = "";
  // Each line is x + y = c, running from the left or bottom edge up to the top or right edge.
  for (let c = r.x + r.y + gap; c < right + bottom; c += gap) {
    const from = c - bottom >= r.x ? [c - bottom, bottom] : [r.x, c - r.x];
    const to = c - r.y <= right ? [c - r.y, r.y] : [right, c - right];
    d += `M${n(from[0])} ${n(from[1])}L${n(to[0])} ${n(to[1])}`;
  }
  return d;
}

/** A point in viewBox units as percentages, for HTML laid over the drawing. */
export function pct(x: number, y: number): { left: string; top: string } {
  return { left: `${((x / VIEW.w) * 100).toFixed(3)}%`, top: `${((y / VIEW.h) * 100).toFixed(3)}%` };
}
