"use client";

import { memo, type CSSProperties } from "react";
import { SCENE, SCENE_H, SCENE_W } from "./site-model";
import type { SiteRefs } from "./site-refs";

// The site around the house, in scene units (1000 x 532, the ground line along the bottom).
// Behind the house: the far skyline, the other sites on the horizon, the plot being pegged
// out, the block pile. In front: the casuarina scaffold, the tower crane and the cement
// pallet. Both are built once from constants and never rendered again.

const VIEW_BOX = `0 0 ${SCENE_W} ${SCENE_H}`;
const r = (v: number) => Math.round(v * 10) / 10;

function palm(x: number, top: number, lean: number): { trunk: string; crown: string } {
  const tx = x + lean;
  return {
    trunk: `M${x} ${SCENE_H}Q${x - lean * 0.6} ${r((SCENE_H + top) / 2)} ${tx} ${top}`,
    crown: [
      `M${tx} ${top}q-14 -4 -24 7`,
      `M${tx} ${top}q-12 -12 -25 -9`,
      `M${tx} ${top}q2 -14 -5 -21`,
      `M${tx} ${top}q12 -11 24 -6`,
      `M${tx} ${top}q15 0 21 11`,
    ].join(""),
  };
}

const PALMS = [palm(22, 418, 4), palm(940, 430, -3), palm(975, 412, 3)];
const SKYLINE = `M-320 ${SCENE_H}V455H50V${SCENE_H}ZM905 ${SCENE_H}V470H1320V${SCENE_H}Z`;

// The plot BD pegs out: a parallelogram on the base plane, left of the house, strung
// between four stakes as tall as a person beside it.
const { a, b, c, d } = SCENE.plot;
const PLOT_POINTS = [a, b, c, d].map((p) => p.join(",")).join(" ");
const HATCH_STEP = 14;
const PLOT_HATCH = Array.from(
  { length: Math.floor((b[0] - a[0]) / HATCH_STEP) - 1 },
  (_, i) => `M${a[0] + (i + 1) * HATCH_STEP} ${a[1]}L${d[0] + (i + 1) * HATCH_STEP} ${d[1]}`,
).join("");
const STAKES = [a, b, c, d];
const STAKE_H = 22;
const STRINGS = [
  [a, b],
  [b, c],
  [c, d],
  [d, a],
].map(([p, q]) => `M${p[0]} ${p[1] - 8}L${q[0]} ${q[1] - 8}`);

// The pile the blocks are thrown from: three rows, laterite with one pit each.
const PILE_BLOCKS = [
  [730, 526],
  [750, 526],
  [770, 526],
  [740, 520],
  [760, 520],
  [750, 514],
] as const;

// The horizon sites the admin sees: a villa at the walls stage and a farmhouse.
const VILLA = SCENE.villa;
const FARM = SCENE.farm;

// The scaffold: one group per lift, so a lift rises when the storey under it is done.
const LIFTS = SCENE.lifts.map((lift, i) => {
  const poles = SCENE.poles.map((x) => `M${x} ${lift.y0}V${lift.y1}`).join("");
  const first = SCENE.poles[0];
  const last = SCENE.poles[SCENE.poles.length - 1];
  const ledger = `M${first - 6} ${lift.y1}H${last + 6}`;
  // One brace per lift, alternating bays.
  const bay = i % 2 === 0 ? [SCENE.poles[0], SCENE.poles[1]] : [SCENE.poles[3], SCENE.poles[4]];
  const brace = `M${bay[0]} ${lift.y0}L${bay[1]} ${lift.y1}`;
  return { k: i + 1, d: poles + ledger + brace };
});

// The tower crane, in chalk lines, the lattice drawn as one zigzag.
const { mastX, mastTop, jibY, jibFrom, counterTo, trolleyPark, cable } = SCENE.crane;
function zigzag(x0: number, x1: number, y0: number, y1: number, step: number, vertical: boolean): string {
  let d = "";
  if (vertical) {
    let left = true;
    for (let y = y1; y > y0; y -= step) {
      d += `M${left ? x0 : x1} ${y}L${left ? x1 : x0} ${Math.max(y - step, y0)}`;
      left = !left;
    }
  } else {
    let top = true;
    for (let x = x0; x < x1; x += step) {
      d += `M${x} ${top ? y0 : y1}L${Math.min(x + step, x1)} ${top ? y1 : y0}`;
      top = !top;
    }
  }
  return d;
}
const MAST = `M${mastX - 4} ${SCENE_H}V${mastTop}M${mastX + 4} ${SCENE_H}V${mastTop}` + zigzag(mastX - 4, mastX + 4, mastTop, SCENE_H, 10, true);
const JIB =
  `M${jibFrom} ${jibY - 4}H${counterTo}M${jibFrom + 6} ${jibY + 4}H${counterTo}` +
  zigzag(jibFrom + 6, mastX - 4, jibY - 4, jibY + 4, 12, false) +
  zigzag(mastX + 4, counterTo, jibY - 4, jibY + 4, 12, false) +
  `M${jibFrom} ${jibY - 4}L${jibFrom + 6} ${jibY + 4}`;
const APEX = `M${mastX} ${mastTop}V${mastTop - 14}L${jibFrom + 60} ${jibY - 4}M${mastX} ${mastTop - 14}L${counterTo} ${jibY - 4}`;
const HOOK = "M0 0v5a3 3 0 1 1 -3.5 2.6";

const BAGS = [
  [800, 525],
  [814, 525],
  [828, 525],
  [807, 518],
  [821, 518],
] as const;

export const SceneBack = memo(function SceneBack({ refs }: { refs: SiteRefs }) {
  return (
    <svg className="sc sc-back" viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
      <g ref={refs.set("skyline")} className="sc-skyline">
        <path className="sc-roofs" d={SKYLINE} />
        {PALMS.map((p, i) => (
          <g key={i} className="sc-palm">
            <path d={p.trunk} className="sc-trunk" />
            <path d={p.crown} />
          </g>
        ))}
      </g>

      <g className="sc-horizon role-layer" data-for="admin">
        <g className="sc-site" style={{ "--k": 0 } as CSSProperties}>
          <rect className="sc-laterite" x={VILLA.x} y={482} width={VILLA.w} height={50} />
          <rect className="sc-laterite" x={VILLA.x + 12} y={448} width={VILLA.w - 24} height={34} />
          <rect className="sc-dashed" x={VILLA.x + 12} y={416} width={VILLA.w - 24} height={32} />
          <path className="sc-site-glass" d={`M${VILLA.x + 20} 496h26v22h-26zM${VILLA.x + 70} 496h40v22h-40zM${VILLA.x + 30} 458h30v16h-30z`} />
        </g>
        <g className="sc-site" style={{ "--k": 1 } as CSSProperties}>
          <rect className="sc-laterite" x={FARM.x} y={490} width={FARM.w} height={42} />
          <path className="sc-dashed" d={`M${FARM.x - 8} 490L${FARM.x + FARM.w / 2} 452L${FARM.x + FARM.w + 8} 490`} />
          <path className="sc-site-glass" d={`M${FARM.x + 18} 502h30v20h-30zM${FARM.x + 96} 502h34v20h-34z`} />
        </g>
        <path className="sc-site-mark" d={`M${VILLA.x - 6} 531h${VILLA.w + 12}M${FARM.x - 6} 531h${FARM.w + 12}`} />
      </g>

      <g className="sc-plot role-layer" data-for="bd">
        <polygon className="sc-plot-dash" points={PLOT_POINTS} />
        <path className="sc-plot-hatch" d={PLOT_HATCH} />
        <polygon className="sc-plot-solid" points={PLOT_POINTS} />
        {STRINGS.map((s, k) => (
          <path key={k} className="sc-plot-string" d={s} pathLength={1} style={{ "--k": k } as CSSProperties} />
        ))}
        {STAKES.map((p, k) => (
          <rect
            key={k}
            className="sc-stake"
            x={p[0] - 1.5}
            y={p[1] - STAKE_H}
            width={3}
            height={STAKE_H}
            style={{ "--k": k } as CSSProperties}
          />
        ))}
      </g>

      <g className="sc-pile">
        {PILE_BLOCKS.map(([x, y], i) => (
          <g key={i}>
            <rect className="sc-pile-block" x={x} y={y} width={18} height={6} />
            <rect className="sc-pile-pit" x={x + 4 + (i % 3) * 3} y={y + 2} width={2.5} height={1.5} />
          </g>
        ))}
      </g>
    </svg>
  );
});

export const SceneFront = memo(function SceneFront({ refs }: { refs: SiteRefs }) {
  return (
    <svg className="sc sc-front" viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
      <g className="sc-scaffold">
        {LIFTS.map((lift) => (
          <path key={lift.k} className="sc-lift" data-k={lift.k} d={lift.d} />
        ))}
      </g>

      <g className="sc-pallet-at role-layer" data-for="site">
        <g ref={refs.set("pallet")} className="sc-pallet">
          <path className="sc-pallet-board" d="M798 531.5h46" />
          {BAGS.map(([x, y], i) => (
            <g key={i} ref={refs.bag(i)} className="sc-bag">
              <rect x={x} y={y} width={14} height={7} rx={1.5} />
            </g>
          ))}
        </g>
      </g>

      <g ref={refs.set("crane")} className="sc-crane">
        <path className="sc-steel" d={MAST + JIB + APEX} />
        <rect className="sc-counterweight" x={962} y={jibY + 4} width={22} height={16} />
        <path className="sc-pennant" d={`M${mastX} ${mastTop - 22}l12 3.5l-12 3.5z`} />
        <g transform={`translate(${trolleyPark} ${jibY + 4})`}>
          <g ref={refs.set("trolley")} className="sc-trolley">
            <rect className="sc-trolley-box" x={-5} y={0} width={10} height={6} />
            <g ref={refs.set("hook")} className="sc-hook">
              <line ref={refs.set("cable")} className="sc-cable" x1={0} y1={6} x2={0} y2={6 + cable} />
              <g ref={refs.set("hookHead")} className="sc-hook-head">
                <g transform={`translate(0 ${6 + cable})`}>
                  <path className="sc-hook-j" d={HOOK} />
                  <g ref={refs.set("carried")} className="sc-carried">
                    <rect x={-9} y={9} width={18} height={6} />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
});
