import { courseRows, mulberry32 } from "@/lib/draw";
import { STOREYS, type Line, type Rect } from "@/lib/house-model";

// The sign-in site, as pure geometry: no clock, nothing random except the seeded textures
// the house itself uses. Two sets of units. House units are the house's own 720 x 440
// viewBox; the blocks a keystroke throws are drawn in them, over the real house. Scene
// units are the 1000 x 532 stage the house stands in: house x + 60, house y + 140, so the
// house's ground line (y 392) is the stage's bottom edge (y 532).

export const SCENE_W = 1000;
export const SCENE_H = 532;
export const HOUSE_DX = 60;
export const HOUSE_DY = 140;

const BLOCK = 46;

/** One decimal place, as the house writes its paths, so the two drawings match. */
const n = (value: number) => String(Math.round(value * 10) / 10);
const box = (x: number, y: number, w: number, h: number) => `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}z`;

export type Block = {
  /** Place in the laying order, 0 to 131. */
  index: number;
  /** 1 ground, 2 first, 3 second. */
  storey: number;
  /** Course within the storey, from the bottom. */
  course: number;
  /** Course across the whole house, 0 to 13. */
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  light: boolean;
  dark: boolean;
  /** The small pits, as one path. */
  pits: string;
};

export type Course = {
  row: number;
  storey: number;
  course: number;
  y: number;
  h: number;
  /** First block of this course in the laying order, and one past its last. */
  from: number;
  to: number;
  /** The bed joint along its top and its perpends, as one path. */
  joints: string;
};

/**
 * The front face of a mass as single blocks in running bond, bottom course first, left to
 * right. It reads the seeded generator in exactly the order courseRows does, so every
 * block has the shade and pits of the course the house draws under it.
 */
export function bondBlocks(mass: Rect, courses: number, seed: number) {
  const random = mulberry32(seed);
  const h = mass.h / courses;
  const right = mass.x + mass.w;
  const out: { course: number; x: number; y: number; w: number; h: number; light: boolean; dark: boolean; pits: string }[] = [];
  for (let i = 0; i < courses; i++) {
    const y = mass.y + mass.h - (i + 1) * h;
    const ends = [mass.x];
    for (let x = mass.x + (i % 2 === 0 ? BLOCK : BLOCK / 2); x < right - 6; x += BLOCK) ends.push(x);
    ends.push(right);
    for (let b = 0; b < ends.length - 1; b++) {
      const x0 = ends[b];
      const length = ends[b + 1] - x0;
      const shade = random();
      const light = shade < 0.17;
      const dark = !light && shade < 0.31;
      let pits = "";
      if (length >= 16) {
        const count = 1 + Math.floor(random() * 2.4);
        for (let p = 0; p < count; p++) {
          const w = 2 + random() * 2.5;
          const ph = 1.4 + random() * 1.4;
          pits += box(x0 + 3 + random() * (length - 7 - w), y + 3 + random() * (h - 7 - ph), w, ph);
        }
      }
      out.push({ course: i, x: x0, y, w: length, h, light, dark, pits });
    }
  }
  return out;
}

/** The three laid storeys: ground, first, second. The plinth and roof are poured. */
const LAID_STOREYS = [1, 2, 3];

function build() {
  const blocks: Block[] = [];
  const courses: Course[] = [];
  const storeyEnd: number[] = [];
  let row = 0;
  for (const id of LAID_STOREYS) {
    const storey = STOREYS[id];
    const all = bondBlocks(storey.mass, storey.courses, 7 + id * 13);
    for (let c = 0; c < storey.courses; c++) {
      // Even courses run left to right and odd ones back, so the laying zigzags.
      const own = all.filter((b) => b.course === c);
      const ordered = c % 2 === 0 ? own : [...own].reverse();
      const from = blocks.length;
      for (const b of ordered) {
        blocks.push({
          ...b,
          index: blocks.length,
          storey: id,
          row,
          cx: b.x + b.w / 2,
          cy: b.y + b.h / 2,
        });
      }
      const { x, w } = storey.mass;
      const y = own[0].y;
      const h = own[0].h;
      let joints = `M${n(x)} ${n(y)}h${n(w)}`;
      for (let b = 1; b < own.length; b++) joints += `M${n(own[b].x)} ${n(y)}v${n(h)}`;
      courses.push({ row, storey: id, course: c, y, h, from, to: blocks.length, joints });
      row++;
    }
    storeyEnd.push(blocks.length);
  }
  return { blocks, courses, storeyEnd };
}

const BUILT = build();

export const BLOCKS: Block[] = BUILT.blocks;
export const COURSES: Course[] = BUILT.courses;
/** One past each storey's last block: [57, 102, 132]. */
export const STOREY_END: number[] = BUILT.storeyEnd;
export const TOTAL = BLOCKS.length;
/** Ground courses 0 and 1 are laid before anything is typed. */
export const BASE_LAID = COURSES[0].to - COURSES[0].from + (COURSES[1].to - COURSES[1].from);
/** The crane delivers on its own only until the ground floor stands. */
export const AMBIENT_CAP = STOREY_END[0];
/** Typing builds no higher than the first floor: the second storey is kept for topping out. */
export const TYPED_CAP = STOREY_END[1];

/**
 * Blocks laid for what is typed. A character of the ID lays four and one of the password
 * three, so an ordinary sign-in (about 22 characters) finishes the ground floor during the
 * ID and the first floor during the password.
 */
export function blocksFor(idLength: number, passwordLength: number): number {
  return idLength * 4 + passwordLength * 3;
}

/** The house's payment stop for a count of laid blocks: each finished storey moves it on. */
export function stopFor(laid: number): number {
  if (laid < STOREY_END[0]) return 1;
  if (laid < STOREY_END[1]) return 2;
  if (laid < STOREY_END[2]) return 3;
  return 4;
}

/** The course a block belongs to, by laying index. */
export function courseOf(index: number): Course {
  return COURSES[BLOCKS[Math.min(Math.max(index, 0), TOTAL - 1)].row];
}

// In development, check the blocks against the courses the house draws, pixel for pixel.
if (process.env.NODE_ENV !== "production") {
  for (const id of LAID_STOREYS) {
    const storey = STOREYS[id];
    const rows = courseRows(storey.mass, storey.courses, 7 + id * 13);
    const own = bondBlocks(storey.mass, storey.courses, 7 + id * 13);
    rows.forEach((r, i) => {
      const inRow = own.filter((b) => b.course === i);
      const pits = inRow.map((b) => (b.dark ? box(b.x, b.y, b.w, b.h) : "") + b.pits).join("");
      const light = inRow.map((b) => (b.light ? box(b.x, b.y, b.w, b.h) : "")).join("");
      if (pits !== r.pits || light !== r.light) {
        console.warn(`Sign-in blocks do not match the house at storey ${id}, course ${i}.`);
      }
    });
  }
}

/** Where a keystroke throws blocks from, in house units: the pile right of the house. */
export const PILE = { x: 700, y: 384 };

/** Openings for each laid storey, and their mullions, in house units. They stand before the walls. */
export const FRAMES: { storey: number; glass: Rect[]; lines: Line[] }[] = LAID_STOREYS.map((id) => ({
  storey: id,
  glass: STOREYS[id].glass,
  lines: STOREYS[id].lines,
}));

/** The openings that light up at dusk: every one that is glass, not teak. */
export const LIT: Rect[] = LAID_STOREYS.flatMap((id) =>
  STOREYS[id].glass.filter((g) => !STOREYS[id].teak.includes(g)),
);

export const ENTRANCE: Rect = STOREYS[1].teak.find((t) => t.h > t.w) ?? { x: 372, y: 292, w: 48, h: 80 };
export const GARAGE: Rect = STOREYS[1].teak.find((t) => t.w > t.h) ?? { x: 450, y: 304, w: 140, h: 68 };

/** The string line of each storey runs from just left of its mass to past its side face. */
export const STRING_SPANS = LAID_STOREYS.map((id) => {
  const { mass } = STOREYS[id];
  return { storey: id, x1: mass.x - 14, x2: mass.x + mass.w + 28 + 14 };
});

/** The top of the course being laid when `laid` blocks are down. */
export function stringAt(laid: number): { storey: number; y: number } | null {
  if (laid >= TOTAL) return null;
  const c = courseOf(laid);
  return { storey: c.storey, y: c.y };
}

// ---- The scene, in scene units ----

export const SCENE = {
  poles: [128, 270, 420, 560, 690],
  /** Each lift: from y0 up to y1, where its ledger runs. */
  lifts: [
    { y0: 532, y1: 470 },
    { y0: 470, y1: 402 },
    { y0: 402, y1: 292 },
  ],
  /** Left of the house, mostly past the stage's left edge: only the BD camera brings it in. */
  plot: { a: [-110, 532], b: [120, 532], c: [176, 490], d: [-54, 490] } as Record<"a" | "b" | "c" | "d", [number, number]>,
  /** Two more sites, past both edges of the stage: only the admin's pulled-back camera shows them. */
  villa: { x: -190, w: 140 },
  farm: { x: 1040, w: 150 },
  pile: { x: 730, y: 514, w: 60, h: 18 },
  pallet: { x: 800, y: 518 },
  crane: {
    mastX: 900,
    mastTop: 52,
    jibY: 64,
    jibFrom: 560,
    counterTo: 990,
    trolleyPark: 760,
    trolleyMin: 600,
    trolleyMax: 880,
    cable: 120,
  },
};

/** The trolley's x for a block in house units, or null when the jib does not reach it. */
export function trolleyFor(houseX: number): number | null {
  const x = houseX + HOUSE_DX;
  if (x < SCENE.crane.trolleyMin) return null;
  return Math.min(Math.max(x, SCENE.crane.trolleyMin), SCENE.crane.trolleyMax);
}

export type LoginRole = "client" | "bd" | "architect" | "site" | "finance" | "admin";
export const ROLES: LoginRole[] = ["client", "bd", "architect", "site", "finance", "admin"];

/**
 * The camera for each role, as translate (in % of the stage) then scale, about the top
 * left corner. Every move is the same list of functions, so a second choice retargets
 * smoothly from wherever the first had got to.
 */
function dolly(scale: number, ox: number, oy: number, preX = 0, preY = 0): string {
  const x = preX + ox * (1 - scale);
  const y = preY + oy * (1 - scale);
  return `translate(${x.toFixed(3)}%, ${y.toFixed(3)}%) scale(${scale})`;
}

/** The front door, as a share of the stage: house (396, 332), scene (456, 472). */
export const DOOR_ORIGIN = { x: 45.6, y: 88.7 };

export const ROLE_CAMERA: Record<LoginRole | "none", string> = {
  none: dolly(1, 0, 0),
  client: dolly(1.25, DOOR_ORIGIN.x, DOOR_ORIGIN.y),
  bd: dolly(1.35, 5, 100, 18),
  architect: dolly(1.06, 45, 60),
  site: dolly(1.12, 82, 92, -5),
  finance: dolly(1.12, 70, 90, -3),
  admin: dolly(0.7, 50, 100, 0, -8),
};

/** The flight's least zoom on the door; it grows on a large screen so the house fills it. */
export const FLIGHT_SCALE = 2.4;
