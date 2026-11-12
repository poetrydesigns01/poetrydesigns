"use client";

import { memo, useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { useProjection } from "@/lib/demo-store";
import {
  courseRows,
  edges,
  hatch,
  pct,
  rects,
  segments,
  sideCourses,
  sideFace,
  silhouette,
  topFace,
} from "@/lib/draw";
import { listWords } from "@/lib/format";
import {
  ANCHORS,
  BANDS,
  DEPTH,
  GHOSTS,
  NAMEPLATE,
  STEPS,
  STOPS,
  STOREYS,
  TERRACES,
  TODAY_STOP,
  VIEW,
  openAt,
  type Line,
  type Rect,
  type Storey,
} from "@/lib/house-model";
import { useOnce } from "@/lib/motion";
import type { StoreyGroup } from "@/lib/projection";

// The one model of the client's house. It is a pure picture of the sample data, the
// decisions made in this tab and whatever is being tried, so every screen shows the same
// house. Pages only say which scene they want. All styling is in globals.css under "House".

export type HouseScene = {
  /** 0 to 10; default is today's stop. What is drawn as built. */
  stop?: number;
  /** Open the house at this floor. */
  focus?: StoreyGroup | null;
  /** Which marks to show. Default "all". */
  markers?: "all" | "needs-you" | "agreed" | "none";
  /** Anchor key to emphasise; the other marks stand back. */
  highlight?: string | null;
  /** Draw the joint states. Default true. */
  money?: boolean;
  /** Anchor keys whose marks show; every other mark is hidden. A highlighted mark shows too. */
  only?: string[];
  /** Replaces the words on the string line, such as the site note "Slab curing, day 5 of 21". */
  note?: string;
  /** The string line's label. Default true; false hides the words and keeps the line. */
  stringLabel?: boolean;
};

type GhostState = "off" | "trying" | "approved";
type Depth = { dx: number; dy: number };
/** A peg or a seal on the house. `order` is the peg's place in the list of what is waiting. */
type Mark = { key: string; kind: "peg" | "seal"; order: number };

const VIEW_BOX = `0 0 ${VIEW.w} ${VIEW.h}`;
const FLAT: Depth = { dx: 0, dy: 0 };
// The stair head and the tub are small, so they recede less than a storey does.
const HEAD_DEPTH: Depth = { dx: DEPTH.dx * 0.6, dy: DEPTH.dy * 0.6 };
const TUB_DEPTH: Depth = { dx: DEPTH.dx * 0.5, dy: DEPTH.dy * 0.5 };
const GROUPS: StoreyGroup[] = ["second", "first", "ground"];
/** The storeys that carry a name at the right: never more than three. */
const LABELLED = new Set(["ground", "first", "second"]);
const COUNT_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

const line = (x1: number, y1: number, x2: number, y2: number): Line => ({ x1, y1, x2, y2 });
const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
/** Polygon points as a closed path, so a storey with two masses can share one shape. */
const closed = (points: string) => `M${points.split(" ").join("L")}z`;
/** The same points left open, for a mass that stands on another: its foot is not drawn twice. */
const standing = (points: string) => `M${points.split(" ").join("L")}`;

/** Where a railing or the pergola turns the corner and runs back along the side of the house. */
function returns(storey: Storey): Line[] {
  const { dx, dy } = DEPTH;
  const terrace = TERRACES.find((t) => t.storey === storey.id - 1);
  if (!terrace || storey.rails.length === 0) return [];
  const top = Math.min(...storey.rails.filter((rail) => rail.y1 === rail.y2).map((rail) => rail.y1));
  const floor = STOREYS[terrace.storey].mass.y;
  if (terrace.side === "right") {
    const x = terrace.x2;
    const rail = Math.max(...storey.rails.filter((r) => r.y1 === r.y2).map((r) => r.y1));
    return [
      line(x, rail, x + dx, rail + dy),
      line(x + dx / 2, rail + dy / 2, x + dx / 2, floor + dy / 2),
      line(x + dx, rail + dy, x + dx, floor + dy),
    ];
  }
  // The terrace: the railing returns along the left edge, and the pergola gets its rafters.
  const x = terrace.x1;
  const rail = Math.max(...storey.rails.filter((r) => r.y1 === r.y2).map((r) => r.y1));
  const back: Line[] = [line(x, rail, x + dx, rail + dy), line(x + dx, rail + dy, x + dx, floor + dy)];
  for (let rafter = x; rafter + dx <= terrace.x2; rafter += 22) back.push(line(rafter, top, rafter + dx, top + dy));
  back.push(line(x + dx, top + dy, terrace.x2, top + dy));
  return back;
}

function buildArt(storey: Storey) {
  const { mass, head } = storey;
  const openings = storey.glass.filter((glass) => !storey.teak.includes(glass));
  const ownLines = storey.lines.filter(
    (l) => !storey.teak.some((teak) => inside(teak, (l.x1 + l.x2) / 2, (l.y1 + l.y2) / 2)),
  );
  const longRails = storey.rails.filter((rail) => Math.hypot(rail.x2 - rail.x1, rail.y2 - rail.y1) > 30);
  const corner = returns(storey);

  let grain = "";
  for (const teak of storey.teak) {
    if (teak.w > teak.h) {
      for (let y = teak.y + teak.h / 8; y < teak.y + teak.h - 1; y += teak.h / 8) {
        grain += segments([line(teak.x, y, teak.x + teak.w, y)]);
      }
    } else {
      for (const part of [0.25, 0.5, 0.75]) {
        grain += segments([line(teak.x + teak.w * part, teak.y, teak.x + teak.w * part, teak.y + teak.h)]);
      }
    }
  }

  const terrace = TERRACES.find((t) => t.storey === storey.id);
  const { dx, dy } = DEPTH;
  const kota = terrace
    ? terrace.side === "right"
      ? topFace({ x: terrace.x1, y: mass.y, w: terrace.x2 - terrace.x1, h: 0 })
      : `${terrace.x1},${mass.y} ${terrace.x2},${mass.y} ${terrace.x2},${mass.y + dy} ${terrace.x1 + dx},${mass.y + dy}`
    : "";

  return {
    rows: storey.courses > 0 ? courseRows(mass, storey.courses, 7 + storey.id * 13) : [],
    top: topFace(mass),
    side: sideFace(mass),
    sideLines: storey.courses > 1 ? sideCourses(mass, storey.courses) : "",
    headTop: head ? topFace(head, HEAD_DEPTH) : "",
    headSide: head ? sideFace(head, HEAD_DEPTH) : "",
    edge: edges(mass) + (head ? edges(head, HEAD_DEPTH) : ""),
    edgeFlat: edges(mass, FLAT) + (head ? edges(head, FLAT) : ""),
    shape: closed(silhouette(mass)) + (head ? closed(silhouette(head, HEAD_DEPTH)) : ""),
    shapeFlat: closed(silhouette(mass, FLAT)) + (head ? closed(silhouette(head, FLAT)) : ""),
    // A slab is too thin for every face to carry its own dashes: its chalk line is the outside only.
    slabWire: closed(silhouette(mass)) + (head ? standing(silhouette(head, HEAD_DEPTH)) : ""),
    plasterSide: sideFace(mass),
    glass: rects(storey.glass),
    glint: openings
      .filter((glass) => glass.w >= 80)
      .map((glass) => `M${glass.x + 9} ${glass.y + 25}l15 -15M${glass.x + 17} ${glass.y + 30}l9 -9`)
      .join(""),
    lines: segments(storey.lines),
    rails: segments(storey.rails),
    railsDeep: segments([...storey.rails, ...corner]),
    openings: rects(storey.glass) + segments(longRails),
    frames: rects(storey.glass) + segments(ownLines),
    grain,
    kota,
    hatch: hatch(mass, 8),
    ghosts: Object.keys(GHOSTS).filter((id) => GHOSTS[id].storey === storey.id),
  };
}

const ART = STOREYS.map(buildArt);

// The ground the house stands on: a base that recedes like the house does, a section of
// earth under the ground line, a flat shadow, and a tree for scale.
const GROUND = {
  base: topFace({ x: 20, y: 392, w: 670, h: 0 }),
  cast: topFace({ x: 610, y: 392, w: 54, h: 0 }),
  earth: Array.from({ length: 34 }, (_, i) => `M${28 + i * 20} 406l12 -12`).join(""),
  trunk: "M50 392V316M50 342l13 -17",
};

/** One change shown on the house: hidden, tried, or approved. */
function Ghost({ id, state, flat }: { id: string; state: GhostState; flat: boolean }) {
  const ghost = GHOSTS[id];
  const piece = ghost.box ?? ghost.outline;
  if (!piece) return null;
  const isTub = Boolean(ghost.box);
  const depth = isTub && !flat ? TUB_DEPTH : FLAT;
  const outline = edges(piece, depth);
  const panes = 5;
  const mullions = Array.from({ length: panes - 1 }, (_, i) => {
    const x = piece.x + ((i + 1) * piece.w) / panes;
    return line(x, piece.y, x, piece.y + piece.h);
  });
  const { band } = ghost;

  return (
    <g className="ghost" data-change={id} data-state={state} data-kind={isTub ? "tub" : "window"}>
      {band && <path className="ghost-band" d={segments([line(band.x1, band.y1 + 5, band.x2, band.y2 + 5)])} />}
      <rect className="ghost-shadow" x={piece.x + 2} y={piece.y + piece.h} width={piece.w} height={3} />
      <g className="ghost-piece">
        <path className="ghost-body" d={closed(silhouette(piece, depth))} />
        <path className="ghost-hatch" d={hatch(piece, 10)} />
        {!isTub && <path className="ghost-lines" d={segments(mullions)} />}
        <path className="ghost-dash" d={outline} />
        <path className="ghost-solid" d={outline} />
      </g>
      {ghost.replaces && <path className="ghost-was" d={rects([ghost.replaces])} />}
    </g>
  );
}

/** Everything drawn for one storey. It never changes with state, only with what is tried on it. */
const StoreyArt = memo(function StoreyArt({
  index,
  flat,
  hatched,
  ghosts,
}: {
  index: number;
  flat: boolean;
  hatched: boolean;
  /** The state of each change on this storey, in order, joined with a space. */
  ghosts: string;
}) {
  const storey = STOREYS[index];
  const art = ART[index];
  const { mass, head } = storey;
  const laid = storey.courses > 1;
  const ghostStates = ghosts.split(" ") as GhostState[];
  const rails = flat ? art.rails : art.railsDeep;
  const shape = flat ? art.shapeFlat : art.shape;

  return (
    <svg viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
      <g className="mass">
        {!flat && <polygon className={laid || storey.courses === 1 ? "top" : "top slab-top"} points={art.top} />}
        {!flat && <polygon className={laid || storey.courses === 1 ? "side" : "side slab-side"} points={art.side} />}
        {!flat && art.sideLines && <path className="side-courses" d={art.sideLines} />}
        {storey.courses === 0 && <rect className="slab" x={mass.x} y={mass.y} width={mass.w} height={mass.h} />}
        {art.rows.map((row, i) => (
          <g key={i} className="course" data-i={i} style={{ "--i": i } as CSSProperties}>
            <rect x={mass.x} y={row.y} width={mass.w} height={row.h} />
            {row.light && <path className="blocks-light" d={row.light} />}
            <path className="pits" d={row.pits} />
            {row.joints && <path className="block-joints" d={row.joints} />}
          </g>
        ))}
        {head && !flat && <polygon className="top slab-top" points={art.headTop} />}
        {head && !flat && <polygon className="side slab-side" points={art.headSide} />}
        {head && <rect className="slab" x={head.x} y={head.y} width={head.w} height={head.h} />}
        <path className="edge" d={flat ? art.edgeFlat : art.edge} />
      </g>

      {art.rows.length > 0 && (
        <g className="pointing">
          {art.rows.map(
            (row, i) =>
              row.joints && (
                <g key={i} style={{ "--i": i } as CSSProperties}>
                  <path className="joint-wet" d={row.joints} />
                  <path className="joint-set" d={row.joints} />
                </g>
              ),
          )}
        </g>
      )}

      <path className="haze" d={shape} />

      {laid && (
        <g className="pass pass-plaster">
          {!flat && <rect className="wet-edge" x={mass.x} y={mass.y} width={mass.w + 10} height={mass.h - 7} />}
          <rect className="plaster-front" x={mass.x} y={mass.y} width={mass.w} height={mass.h} />
          {!flat && <polygon className="plaster-side" points={art.plasterSide} />}
        </g>
      )}
      {laid && (
        <g className="pass pass-paint">
          <rect className="coat coat-1" x={mass.x} y={mass.y} width={mass.w} height={mass.h} />
          <rect className="coat coat-2" x={mass.x} y={mass.y} width={mass.w} height={mass.h} />
        </g>
      )}

      {index === 0 && <path className="steps" d={rects(STEPS)} />}
      {art.glass && (
        <g className="glass">
          <path d={art.glass} />
          {art.glint && <path className="glint" d={art.glint} />}
        </g>
      )}
      {(art.lines || rails) && (
        <g className="lines">
          {art.lines && <path d={art.lines} />}
          {rails && <path className="rails" d={rails} />}
        </g>
      )}

      {(storey.teak.length > 0 || art.frames || rails) && (
        <g className="pass pass-teak">
          {storey.teak.map((teak, i) => (
            <rect
              key={i}
              className={teak.w > teak.h ? "teak-shutter" : "teak-door"}
              x={teak.x}
              y={teak.y}
              width={teak.w}
              height={teak.h}
            />
          ))}
          {art.grain && <path className="teak-grain" d={art.grain} />}
          {art.frames && <path className="teak-frames" d={art.frames} />}
          {rails && <path className="teak-rails" d={rails} />}
        </g>
      )}

      {(index === 0 || (art.kota && !flat)) && (
        <g className="pass pass-kota">
          {index === 0 ? (
            <path className="kota" d={rects(STEPS)} />
          ) : (
            <polygon className="kota" points={art.kota} style={{ "--k": index } as CSSProperties} />
          )}
        </g>
      )}
      {index === 1 && (
        <rect
          className="pass nameplate"
          x={NAMEPLATE.x}
          y={NAMEPLATE.y}
          width={NAMEPLATE.w}
          height={NAMEPLATE.h}
        />
      )}

      {art.ghosts.map((id, i) => (
        <Ghost key={id} id={id} state={ghostStates[i] ?? "off"} flat={flat} />
      ))}

      <path className="veil" d={shape} />
      <g className="wire">
        <path d={flat ? art.edgeFlat : laid ? art.edge : art.slabWire} />
        {art.openings && <path d={art.openings} />}
      </g>
      {hatched && <path className="storey-hatch" d={art.hatch} />}
    </svg>
  );
});

/** A standing brass peg: something here is waiting for her. */
export function PegMark({ className }: { className?: string }) {
  const brass = "var(--h-brass, var(--color-brass-light))";
  return (
    <svg viewBox="0 0 16 22" className={className} aria-hidden="true" focusable="false">
      <ellipse cx="8" cy="20.4" rx="5" ry="1.6" style={{ fill: "rgb(0 0 0 / 0.5)" }} />
      <rect x="7" y="10" width="2" height="10.6" style={{ fill: brass }} />
      <circle cx="8" cy="6.5" r="5.75" style={{ fill: brass, stroke: "var(--color-brass-deep)", strokeWidth: 1 }} />
      <circle cx="8" cy="6.5" r="1.75" style={{ fill: "var(--color-brass-deep)" }} />
    </svg>
  );
}

/** A flat brass seal with an engraved tick: she has agreed this. */
export function SealMark({ className }: { className?: string }) {
  const engraved: CSSProperties = { fill: "none", stroke: "var(--color-brass-deep)" };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <circle
        cx="12"
        cy="12"
        r="11.4"
        style={{ ...engraved, fill: "var(--h-brass, var(--color-brass-light))", strokeWidth: 0.8 }}
      />
      <circle cx="12" cy="12" r="8.8" style={{ ...engraved, strokeWidth: 0.9 }} />
      <path d="M7.4 12.5l3.1 3.1 6.2-6.9" style={{ ...engraved, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" }} />
    </svg>
  );
}

function waitingWords(count: number, where: string): string {
  if (count === 0) return `Nothing is waiting ${where}.`;
  if (count === 1) return `One thing is waiting ${where}.`;
  return `${COUNT_WORDS[count] ?? count} things are waiting ${where}.`;
}

/** When each part of the arrival starts, in ms from first paint. */
function arrivalAt(index: number): number {
  return index === 0 ? 100 : 450 + (index - 1) * 550;
}

const ARRIVAL_MS = 2400;

export function House({
  scene,
  interactive = false,
  onFocusChange,
  arrival = false,
  arrivalKey = "house-arrival",
  tone = "dark",
  flat = false,
  labels = false,
  phoneMarks = "all",
  className,
}: {
  scene?: HouseScene;
  /** The three floor bands become buttons. */
  interactive?: boolean;
  onFocusChange?: (group: StoreyGroup | null) => void;
  /** Allow the once-per-load arrival. The client home only. */
  arrival?: boolean;
  /** The arrival plays once per page load for each key. Only the gallery passes its own. */
  arrivalKey?: string;
  /** "dark" on the table, "light" on paper, "line" for black line only. */
  tone?: "dark" | "light" | "line";
  /** No depth faces: the true front elevation. */
  flat?: boolean;
  /** Storey names at the right, once the house is 480 px wide: ground, first and second floor. */
  labels?: boolean;
  /** Below 1024 px, "pegs" hides the seals, so a phone screen keeps to a few brass marks. */
  phoneMarks?: "pegs" | "all";
  className?: string;
}) {
  const projection = useProjection();
  const [play, done] = useOnce(arrivalKey);
  const arriving = arrival && play;
  const rootRef = useRef<HTMLDivElement>(null);

  const stop = Math.min(Math.max(Math.round(scene?.stop ?? TODAY_STOP), 0), STOPS.length - 1);
  const focus = scene?.focus ?? null;
  const markers = scene?.markers ?? "all";
  const highlight = scene?.highlight ?? null;
  const money = scene?.money ?? true;
  const only = scene?.only ?? null;
  const stringLabel = scene?.stringLabel ?? true;

  const builtAt = STOPS[stop].builtUpTo;
  const builtNow = STOPS[TODAY_STOP].builtUpTo;
  const forecast = stop > TODAY_STOP;
  const passes = STOPS[stop].passes;
  const next = STOREYS[builtNow + 1] as Storey | undefined;
  const stringOn = Boolean(next) && stop >= TODAY_STOP && stop < STOPS.length - 1;

  // The arrival ends when its clock runs out, when anything is pressed, or when the screen is left.
  useEffect(() => {
    if (!arriving) return;
    const root = rootRef.current;
    const timer = window.setTimeout(done, ARRIVAL_MS + 200);
    window.addEventListener("pointerdown", done);
    window.addEventListener("keydown", done);
    window.addEventListener("wheel", done, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", done);
      window.removeEventListener("keydown", done);
      window.removeEventListener("wheel", done);
      // A hidden route keeps this house in the document. If that is why we are here, the
      // arrival is over for this page load, so coming back does not play it again.
      window.setTimeout(() => {
        if (!root || !root.isConnected || root.getClientRects().length === 0) done();
      }, 0);
    };
  }, [arriving, done]);

  const waitingOrder = new Map(projection.waiting.map((item, i) => [item.anchor, i]));
  const agreedKeys = new Set(projection.agreed.map((item) => item.anchor));
  // Marks keep the order of ANCHORS, so a peg that becomes a seal stays the same element.
  const marks: Mark[] = [];
  if (markers !== "none") {
    for (const key of Object.keys(ANCHORS)) {
      const order = waitingOrder.get(key);
      if (order !== undefined) marks.push({ key, kind: "peg", order });
      else if (agreedKeys.has(key)) marks.push({ key, kind: "seal", order: 0 });
    }
  }

  const ghostState = (id: string): GhostState => {
    const change = projection.changes.find((c) => c.id === id);
    if (change?.status === "approved") return "approved";
    return change?.trying ? "trying" : "off";
  };

  const moneyOf = (storey: Storey) => {
    const state = projection.milestones.find((m) => m.id === storey.milestoneId)?.money;
    return money && (state === "paid" || state === "approved" || state === "due") ? state : "none";
  };

  const names = (upTo: number) => listWords(STOREYS.filter((s) => s.id <= upTo).map((s) => s.label.toLowerCase()));
  let summary = "Front of the house.";
  if (stop < TODAY_STOP) {
    summary = `Front of the house, looking back. ${builtAt < 0 ? "Nothing was built yet." : `Built by then: ${names(builtAt)}.`}`;
  } else {
    if (forecast) summary = "Front of the house, as a forecast that can move.";
    summary += ` Built${forecast ? " today" : ""}: ${names(builtNow)}.`;
    if (next) summary += ` Being built now: ${next.label.toLowerCase()}.`;
  }
  if (markers === "all" || markers === "needs-you") summary += ` ${waitingWords(projection.waiting.length, "for you")}`;
  if (projection.tried.length > 0) {
    summary += ` Being tried, not approved: ${listWords(projection.tried.map((change) => change.short))}.`;
  }

  // The string line runs along the top of the course being laid.
  const stringY = next ? next.mass.y + next.mass.h - (next.courses > 0 ? next.mass.h / next.courses : next.mass.h) : 0;
  const stringFrom = next ? next.mass.x - 14 : 0;
  const stringPin = next ? next.mass.x + next.mass.w + (flat ? 0 : DEPTH.dx) + 14 : 0;
  const stringAt = builtAt <= 0 ? 600 : arrivalAt(builtAt) + 600;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && interactive && focus) onFocusChange?.(null);
  };

  return (
    <div
      ref={rootRef}
      className={`house${arriving ? " is-arriving" : ""}${className ? ` ${className}` : ""}`}
      data-tone={tone}
      data-stop={stop}
      data-focus={focus ?? undefined}
      data-forecast={forecast ? "" : undefined}
      data-pass={passes.length > 0 ? passes.join(" ") : undefined}
      data-highlight={highlight ? "" : undefined}
      data-phone-marks={phoneMarks}
      style={{ "--string-at": `${stringAt}ms`, "--pegs-at": `${stringAt + 300}ms` } as CSSProperties}
      onKeyDown={onKeyDown}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && event.animationName === "house-arrival") done();
      }}
    >
      <span role="img" aria-label={summary} className="sr-only" />

      <svg className="house-ground" viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
        {!flat && <polygon className="base" points={GROUND.base} />}
        {!flat && <polygon className="cast" points={GROUND.cast} />}
        <path className="earth" d={GROUND.earth} />
        <g className="tree">
          <path d={GROUND.trunk} />
          <circle cx="50" cy="290" r="27" />
        </g>
        <path className="ground-line" d="M20 392H700" />
      </svg>

      {STOREYS.map((storey, index) => {
        const state =
          index <= builtAt ? "built" : stop === TODAY_STOP && index === builtAt + 1 ? "under-way" : "to-come";
        const art = ART[index];
        return (
          <div
            key={storey.key}
            className="storey"
            data-storey={index}
            data-state={state}
            data-money={state === "built" ? moneyOf(storey) : "none"}
            data-poured={storey.courses < 2 ? "" : undefined}
            data-future={state === "built" && index > builtNow ? "" : undefined}
            data-open={focus === storey.group ? "" : undefined}
            data-dim={focus && focus !== storey.group ? "" : undefined}
            data-lift={focus && index > openAt(focus) ? "" : undefined}
            style={
              {
                "--n": Math.max(storey.courses, 1),
                "--s": Math.max(index - 1, 0),
                "--at": `${arrivalAt(index)}ms`,
              } as CSSProperties
            }
          >
            <StoreyArt
              index={index}
              flat={flat}
              hatched={tone === "line" && highlight !== null && ANCHORS[highlight]?.storey === index}
              ghosts={art.ghosts.map(ghostState).join(" ")}
            />
            {labels && LABELLED.has(storey.key) && !(stringOn && storey === next) && (
              <span className="storey-label lettering" style={{ top: pct(0, storey.labelY).top }} aria-hidden="true">
                {storey.label}
              </span>
            )}
            {marks
              .filter((mark) => ANCHORS[mark.key].storey === index)
              .map((mark) => {
                const hidden =
                  (mark.kind === "peg" && markers === "agreed") ||
                  (mark.kind === "seal" && markers === "needs-you") ||
                  (only !== null && !only.includes(mark.key) && highlight !== mark.key);
                return (
                  <span
                    key={mark.key}
                    className="marker"
                    data-kind={mark.kind}
                    data-on={highlight === mark.key ? "" : undefined}
                    data-hide={hidden ? "" : undefined}
                    data-away={focus && ANCHORS[mark.key].group !== focus ? "" : undefined}
                    style={{ ...pct(ANCHORS[mark.key].x, ANCHORS[mark.key].y), "--k": mark.order } as CSSProperties}
                    aria-hidden="true"
                  >
                    {mark.kind === "peg" && <PegMark className="marker-peg" />}
                    <SealMark className={`marker-seal press${mark.kind === "peg" ? " is-off" : ""}`} />
                  </span>
                );
              })}
          </div>
        );
      })}

      {next && (
        <div
          className="string-line"
          data-on={stringOn ? "" : undefined}
          data-lift={focus && next.id > openAt(focus) ? "" : undefined}
          style={{ top: pct(0, stringY).top }}
          aria-hidden="true"
        >
          <span className="string" style={{ left: pct(stringFrom, 0).left, right: "0.5%" }} />
          <span className="string-pin" style={{ left: pct(stringFrom, 0).left }} />
          <span className="string-pin" style={{ left: pct(stringPin, 0).left }} />
          {stringLabel && (
            <span className="string-label lettering">
              {scene?.note ?? (
                <>
                  Being built now:
                  <br />
                  {next.label.toLowerCase()}
                </>
              )}
            </span>
          )}
        </div>
      )}

      {interactive &&
        GROUPS.map((group) => {
          const band = BANDS[group];
          const pressed = focus === group;
          const count = projection.waiting.filter((item) => item.group === group).length;
          return (
            <button
              key={group}
              type="button"
              className="band"
              aria-pressed={pressed}
              aria-label={`${band.label}. ${waitingWords(count, "here")}`}
              style={{ top: pct(0, band.y0).top, height: `${(((band.y1 - band.y0) / VIEW.h) * 100).toFixed(3)}%` }}
              onClick={() => onFocusChange?.(pressed ? null : group)}
            />
          );
        })}
    </div>
  );
}
