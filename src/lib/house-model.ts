import { groupOf, type StoreyGroup } from "./projection";

// The single truth for the house: its storeys, where marks stand on it, the shapes of
// changes, and what each payment builds. The front faces are the true front elevation;
// every mass also has a top face and a right side face receding by DEPTH, which makes it
// a model that still reads as an elevation. Pure data, no clock.

export const VIEW = { w: 720, h: 440 };

/** How far the top and side faces recede. Set both to 0 and the house is the flat elevation. */
export const DEPTH = { dx: 28, dy: -18 };

export type Rect = { x: number; y: number; w: number; h: number };
export type Line = { x1: number; y1: number; x2: number; y2: number };
export type Pass = "plaster" | "kota" | "teak" | "paint" | "nameplate";

export type Storey = {
  id: 0 | 1 | 2 | 3 | 4;
  key: string;
  label: string;
  group: StoreyGroup;
  mass: Rect;
  /** Courses of blocks on the front face. 0 means the mass is poured, not laid. */
  courses: number;
  milestoneId: number;
  /** Openings, filled rosewood-2 when built. */
  glass: Rect[];
  /** Mullions, the door line and shutter slats. */
  lines: Line[];
  /** Door leaves and the shutter, drawn in the teak pass. */
  teak: Rect[];
  /** Railings and the pergola: lime lines, teak in the teak pass. */
  rails: Line[];
  /** A smaller mass standing on this one: the stair head on the roof. */
  head?: Rect;
  /** Where the storey's name is written at the right of the house. */
  labelY: number;
};

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const line = (x1: number, y1: number, x2: number, y2: number): Line => ({ x1, y1, x2, y2 });

const railing = (from: number, to: number, top: number, bottom: number): Line[] => {
  const posts: Line[] = [line(from, top, to, top)];
  for (let x = from + 14; x < to; x += 14) posts.push(line(x, top, x, bottom));
  return posts;
};

// The entrance door and the garage shutter are openings first and teak later, so each is
// one rectangle shared by both lists.
const ENTRANCE = rect(372, 292, 48, 80);
const GARAGE = rect(450, 304, 140, 68);

export const STOREYS: Storey[] = [
  {
    id: 0,
    key: "plinth",
    label: "Plinth",
    group: "ground",
    mass: rect(110, 372, 500, 20),
    courses: 1,
    milestoneId: 1,
    glass: [],
    lines: [],
    teak: [],
    rails: [],
    labelY: 383,
  },
  {
    id: 1,
    key: "ground",
    label: "Ground floor",
    group: "ground",
    mass: rect(110, 262, 500, 110),
    courses: 5,
    milestoneId: 2,
    // Living room glazing, the entrance, the garage.
    glass: [rect(140, 286, 190, 86), ENTRANCE, GARAGE],
    lines: [
      line(187.5, 286, 187.5, 372),
      line(235, 286, 235, 372),
      line(282.5, 286, 282.5, 372),
      line(396, 292, 396, 372),
      line(450, 321, 590, 321),
      line(450, 338, 590, 338),
      line(450, 355, 590, 355),
    ],
    teak: [ENTRANCE, GARAGE],
    rails: [],
    labelY: 317,
  },
  {
    id: 2,
    key: "first",
    label: "First floor",
    group: "first",
    // The first floor overhangs the living room side and stops short of the garage,
    // whose roof is the balcony.
    mass: rect(80, 152, 390, 110),
    courses: 5,
    milestoneId: 3,
    glass: [rect(112, 180, 188, 60), rect(338, 180, 100, 60)],
    lines: [
      line(159, 180, 159, 240),
      line(206, 180, 206, 240),
      line(253, 180, 253, 240),
      line(388, 180, 388, 240),
    ],
    teak: [],
    rails: [...railing(470, 610, 232, 262), line(610, 232, 610, 262)],
    labelY: 207,
  },
  {
    id: 3,
    key: "second",
    label: "Second floor",
    group: "second",
    mass: rect(210, 62, 310, 90),
    courses: 4,
    milestoneId: 4,
    glass: [rect(242, 86, 120, 48), rect(404, 86, 84, 66)],
    lines: [line(302, 86, 302, 134)],
    teak: [],
    // The pergola over the terrace, then the terrace railing.
    rails: [line(80, 104, 214, 104), line(92, 104, 92, 152), line(150, 104, 150, 152), ...railing(80, 210, 126, 152)],
    labelY: 107,
  },
  {
    id: 4,
    key: "roof",
    label: "Roof",
    group: "second",
    mass: rect(192, 50, 346, 12),
    courses: 0,
    milestoneId: 4,
    glass: [],
    lines: [],
    teak: [],
    rails: [],
    head: rect(230, 38, 70, 12),
    labelY: 44,
  },
];

/** The two steps up to the entrance, in front of the plinth. */
export const STEPS: Rect[] = [rect(352, 382, 88, 10), rect(360, 372, 72, 10)];

/** The top faces that stay open to the sky: the balcony over the garage and the terrace. Each runs from x1 to x2. */
export const TERRACES: { storey: number; x1: number; x2: number; side: "left" | "right" }[] = [
  { storey: 1, x1: 470, x2: 610, side: "right" },
  { storey: 2, x1: 80, x2: 210, side: "left" },
];

/** The brass nameplate beside the entrance, pressed on at handover. It sits clear of the seal below it. */
export const NAMEPLATE: Rect = rect(427, 298, 15, 9);

const at = (key: string, storey: number, x: number, y: number) => ({ storey, x, y, group: groupOf(key) });

/** Where marks stand on the house, in viewBox units. Pegs stand on the point; seals are centred on it. */
export const ANCHORS: Record<string, { storey: number; x: number; y: number; group: StoreyGroup }> = {
  "pay:3": at("pay:3", 2, 319, 214),
  "design:terrace-plan": at("design:terrace-plan", 3, 383, 118),
  "design:kitchen-spec": at("design:kitchen-spec", 1, 351, 326),
  // Stands on the terrace, which is the top of the first floor, on the clear slab beside the tub.
  "change:terrace-jacuzzi": at("change:terrace-jacuzzi", 2, 98, 150),
  "change:living-glazing": at("change:living-glazing", 1, 235, 300),
  "change:study-room": at("change:study-room", 2, 454, 214),
  "design:first-floor-plan": at("design:first-floor-plan", 2, 96, 214),
  "design:ground-floor-plan": at("design:ground-floor-plan", 1, 125, 330),
  "design:front-elevation": at("design:front-elevation", 1, 435, 330),
  agreement: at("agreement", 0, 160, 384),
};

/** Shapes of changes on the house, by change id. */
export const GHOSTS: Record<string, { storey: number; box?: Rect; outline?: Rect; replaces?: Rect; band?: Line }> = {
  // A six-seater tub is about a metre tall and two and a half long, at 33 units to a metre.
  "terrace-jacuzzi": { storey: 2, box: rect(112, 118, 84, 34), band: line(104, 152, 204, 152) },
  "living-glazing": { storey: 1, outline: rect(122, 280, 238, 92), replaces: rect(140, 286, 190, 86) },
};

const ALL_PASSES: Pass[] = ["plaster", "kota", "teak", "paint", "nameplate"];

/** The eleven payment stops: what stands once each payment's work is done, and what it buys. */
export const STOPS: { stop: number; milestoneId: number; builtUpTo: number; passes: Pass[]; buys: string }[] = [
  { stop: 0, milestoneId: 0, builtUpTo: -1, passes: [], buys: "design work began and the plot was set out" },
  { stop: 1, milestoneId: 1, builtUpTo: 0, passes: [], buys: "the foundation and plinth" },
  { stop: 2, milestoneId: 2, builtUpTo: 1, passes: [], buys: "the ground floor structure" },
  { stop: 3, milestoneId: 3, builtUpTo: 2, passes: [], buys: "the first floor structure" },
  { stop: 4, milestoneId: 4, builtUpTo: 4, passes: [], buys: "the second floor and the roof slab" },
  {
    stop: 5,
    milestoneId: 5,
    builtUpTo: 4,
    passes: ["plaster"],
    buys: "inside walls and lime plaster, inside and out",
  },
  {
    stop: 6,
    milestoneId: 6,
    builtUpTo: 4,
    passes: ["plaster"],
    buys: "wiring and pipes inside the walls. Nothing changes on the outside",
  },
  {
    stop: 7,
    milestoneId: 7,
    builtUpTo: 4,
    passes: ["plaster", "kota"],
    buys: "floors and tiles, with kota stone on the terrace and steps",
  },
  {
    stop: 8,
    milestoneId: 8,
    builtUpTo: 4,
    passes: ["plaster", "kota", "teak"],
    buys: "teak doors, windows, railings and the pergola",
  },
  {
    stop: 9,
    milestoneId: 9,
    builtUpTo: 4,
    passes: ["plaster", "kota", "teak", "paint"],
    buys: "limewash, fixtures and fittings",
  },
  { stop: 10, milestoneId: 10, builtUpTo: 4, passes: ALL_PASSES, buys: "final cleaning, snag closure and the keys" },
];

/** The payment stop the site has reached. */
export const TODAY_STOP = 3;

/** When the house is opened at a floor, storeys above this index lift. */
export function openAt(group: StoreyGroup): number {
  return group === "ground" ? 1 : group === "first" ? 2 : 3;
}

/** The three floor bands of the house, top and bottom in viewBox units. */
export const BANDS: Record<StoreyGroup, { y0: number; y1: number; label: string }> = {
  second: { y0: 20, y1: 152, label: "Second floor and roof" },
  first: { y0: 152, y1: 262, label: "First floor" },
  ground: { y0: 262, y1: 392, label: "Ground floor and plinth" },
};
