"use client";

import { memo, type CSSProperties } from "react";
import { rects, segments } from "@/lib/draw";
import { VIEW } from "@/lib/house-model";
import {
  BASE_LAID,
  BLOCKS,
  COURSES,
  ENTRANCE,
  FRAMES,
  GARAGE,
  LIT,
  STRING_SPANS,
  stringAt,
} from "./site-model";
import type { SiteRefs } from "./site-refs";

// The blocks a keystroke throws, drawn in the house's own units over the real house. It is
// built once from constants and React never renders it again: the stage sets and clears
// data-on on each block and moves the rest through the refs it registers.

const VIEW_BOX = `0 0 ${VIEW.w} ${VIEW.h}`;
const STOREY_IDS = [1, 2, 3];
const FIRST_STRING = stringAt(BASE_LAID);

const FRAME_ART = FRAMES.map((f) => ({ storey: f.storey, glass: rects(f.glass), lines: segments(f.lines) }));
const LIT_PATH = rects(LIT);
const SLATS = [321, 338, 355].map((y) => `M${GARAGE.x} ${y}h${GARAGE.w}`).join("");
const half = ENTRANCE.w / 2;
const LEAVES = [
  { x: ENTRANCE.x, side: "left" },
  { x: ENTRANCE.x + half, side: "right" },
].map((leaf) => ({
  ...leaf,
  grain: [0.3, 0.7]
    .map((p) => `M${leaf.x + half * p} ${ENTRANCE.y + 4}v${ENTRANCE.h - 8}`)
    .join(""),
}));

export const BlockOverlay = memo(function BlockOverlay({ refs }: { refs: SiteRefs }) {
  return (
    <>
      <svg ref={refs.set("overlay")} className="lb" viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
        <g className="lb-work">
          {STOREY_IDS.map((id) => (
            <g key={id} className="lb-storey" style={{ "--s": id - 1 } as CSSProperties}>
              {BLOCKS.filter((b) => b.storey === id).map((b) => (
                <g
                  key={b.index}
                  ref={refs.block(b.index)}
                  className="lb-block"
                  data-on={b.index < BASE_LAID ? "" : undefined}
                  data-base={b.index < BASE_LAID ? "" : undefined}
                  style={{ "--o": b.index } as CSSProperties}
                >
                  <rect
                    className={`lb-face${b.light ? " lb-light" : b.dark ? " lb-dark" : ""}`}
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={b.h}
                  />
                  {b.pits && <path className="lb-pits" d={b.pits} />}
                </g>
              ))}
            </g>
          ))}

          {/* The frames stand first, and the walls are laid round them. */}
          <g className="lb-frames">
            {FRAME_ART.map((f) => (
              <g key={f.storey} className="lb-frame" style={{ "--s": f.storey - 1 } as CSSProperties}>
                <path className="lb-glass" d={f.glass} />
                {f.lines && <path className="lb-mullions" d={f.lines} />}
              </g>
            ))}
          </g>

          <g className="lb-joints">
            {COURSES.map((c) => (
              <path
                key={c.row}
                ref={refs.joint(c.row)}
                className="lb-joint"
                d={c.joints}
                pathLength={1}
                data-full={c.to <= BASE_LAID ? "" : undefined}
                style={{ "--c": c.row } as CSSProperties}
              />
            ))}
          </g>

          <g className="lb-strings">
            {STRING_SPANS.map((s, i) => (
              <g
                key={s.storey}
                ref={refs.string(i)}
                className="lb-string"
                data-on={FIRST_STRING?.storey === s.storey ? "" : undefined}
                style={{ transform: `translateY(${FIRST_STRING?.storey === s.storey ? FIRST_STRING.y : 0}px)` }}
              >
                <g ref={refs.stringIn(i)} className="lb-string-in">
                  <path className="lb-string-line" d={`M${s.x1} 0H${s.x2}`} />
                  <rect ref={refs.pin(i * 2)} className="lb-pin" x={s.x1 - 1.5} y={-1.5} width={3} height={3} />
                  <rect ref={refs.pin(i * 2 + 1)} className="lb-pin" x={s.x2 - 1.5} y={-1.5} width={3} height={3} />
                </g>
              </g>
            ))}
          </g>

          {/* The password locks up the garage. */}
          <g className="lb-shutter">
            <rect className="lb-shutter-face" x={GARAGE.x} y={GARAGE.y} width={GARAGE.w} height={GARAGE.h} />
            <path className="lb-slats" d={SLATS} />
          </g>

          {/* The architect's T-square, swept down the elevation. */}
          <path className="lb-sweep" d="M70 0H690" />

          <g className="lb-dust">
            {Array.from({ length: 9 }, (_, i) => (
              <rect key={i} ref={refs.mote(i)} className="lb-mote" x={0} y={0} width={2.5} height={2.5} />
            ))}
          </g>
        </g>

        <g className="lb-finish">
          <rect
            ref={refs.set("door")}
            className="lb-door"
            x={ENTRANCE.x}
            y={ENTRANCE.y}
            width={ENTRANCE.w}
            height={ENTRANCE.h}
          />
          {LEAVES.map((leaf, i) => (
            <g key={leaf.side} ref={refs.leaf(i)} className="lb-leaf" data-side={leaf.side}>
              <rect x={leaf.x} y={ENTRANCE.y} width={half} height={ENTRANCE.h} />
              <path d={leaf.grain} />
            </g>
          ))}
        </g>
      </svg>
      {/* The lit windows are a drawing of their own, so the dusk fades one box, not a path. */}
      <svg className="lb lb-lit" viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
        <path d={LIT_PATH} />
      </svg>
    </>
  );
});
