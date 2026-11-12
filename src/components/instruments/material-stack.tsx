import { ChalkTick } from "@/components/staff/chalk-tick";
import { GLYPH_SCALE, type CatalogueItem, type CatalogueUnit } from "@/lib/firm-data";

// A material request as it would stand on site: one glyph for every so much of it (ten
// bags, a hundred kilos of bars, a hundred cubic feet of sand), stacked five high. What is
// requested is drawn in outline; what is on a PO is filled, each PO its own pile, so two
// POs are two fills with a gap between. A chalk tick is drawn once it is delivered. A
// quantity far past a usual request runs past a dashed "usual size" line. The words beside
// it always say the same in figures. On the rosewood board a filled glyph is laterite with
// lime joints, the same brick and lime as the client's house.

const MAX_GLYPHS = 30;
const HIGH = 5;

/** More than this in one request is far past usual: 5 times a usual order. */
const USUAL_LIMIT: Record<CatalogueUnit, number> = {
  bags: 200,
  kg: 2000,
  "cu ft": 2000,
  nos: 5000,
  "sq ft": 5000,
  lengths: 300,
};

const r1 = (v: number) => Math.round(v * 100) / 100;

function qtyWords(qty: number, item: CatalogueItem): string {
  const unit = item.unit === "nos" ? (item.id === "blocks" ? "blocks" : "nos") : item.unit;
  return `${qty.toLocaleString("en-IN")} ${unit}`;
}

/** The words for a stack: "500 of 850 kg ordered. 350 kg still to order." */
export function stackWords(item: CatalogueItem, requested: number, ordered: number, delivered: boolean): string {
  if (delivered) return `${qtyWords(requested, item)} delivered.`;
  if (ordered <= 0) return `${qtyWords(requested, item)} requested. None ordered yet.`;
  if (ordered >= requested) return `All ${qtyWords(requested, item)} ordered.`;
  const unitless = qtyWords(requested, item).replace(/^[\d,]+ /, "");
  return `${ordered.toLocaleString("en-IN")} of ${requested.toLocaleString("en-IN")} ${unitless} ordered. ${qtyWords(requested - ordered, item)} still to order.`;
}

/** True when a quantity is far past what one request usually asks for. */
export function pastUsual(item: CatalogueItem, qty: number): boolean {
  return qty > USUAL_LIMIT[item.unit];
}

type Pile = { filled: boolean; glyphs: number };

/** The outline of one glyph and the lines drawn on it, in a box. */
function glyph(unit: CatalogueUnit, x: number, y: number, w: number, h: number): { shape: string; detail: string } {
  const R = (v: number) => r1(v);
  switch (unit) {
    case "bags": {
      // A cement bag lying flat: a pillow with its stitched end.
      const k = h * 0.45;
      return {
        shape: `M${R(x + k)} ${R(y)}H${R(x + w - k)}Q${R(x + w)} ${R(y)} ${R(x + w)} ${R(y + h / 2)}Q${R(x + w)} ${R(y + h)} ${R(x + w - k)} ${R(y + h)}H${R(x + k)}Q${R(x)} ${R(y + h)} ${R(x)} ${R(y + h / 2)}Q${R(x)} ${R(y)} ${R(x + k)} ${R(y)}Z`,
        detail: `M${R(x + w * 0.8)} ${R(y + h * 0.2)}V${R(y + h * 0.8)}`,
      };
    }
    case "kg": {
      // A bundle of bars with two ties.
      const t = y + h * 0.18;
      const b = y + h * 0.82;
      return {
        shape: `M${R(x)} ${R(t)}H${R(x + w)}V${R(b)}H${R(x)}Z`,
        detail:
          `M${R(x)} ${R(y + h / 2)}H${R(x + w)}` +
          `M${R(x + w * 0.25)} ${R(t - 1)}V${R(b + 1)}M${R(x + w * 0.75)} ${R(t - 1)}V${R(b + 1)}`,
      };
    }
    case "cu ft": {
      // A heap, tipped from a truck.
      return {
        shape: `M${R(x)} ${R(y + h)}L${R(x + w * 0.28)} ${R(y + h * 0.08)}Q${R(x + w / 2)} ${R(y - h * 0.08)} ${R(x + w * 0.72)} ${R(y + h * 0.08)}L${R(x + w)} ${R(y + h)}Z`,
        detail: `M${R(x + w * 0.3)} ${R(y + h * 0.62)}h${R(w * 0.14)}M${R(x + w * 0.56)} ${R(y + h * 0.48)}h${R(w * 0.14)}`,
      };
    }
    case "nos": {
      // Blocks on a pallet: two courses in running bond over two slats.
      const top = y + h * 0.72;
      return {
        shape:
          `M${R(x)} ${R(y)}H${R(x + w)}V${R(top)}H${R(x)}Z` +
          `M${R(x + w * 0.08)} ${R(top + 1)}h${R(w * 0.18)}V${R(y + h)}H${R(x + w * 0.08)}Z` +
          `M${R(x + w * 0.74)} ${R(top + 1)}h${R(w * 0.18)}V${R(y + h)}H${R(x + w * 0.74)}Z`,
        detail:
          `M${R(x)} ${R(y + top / 2 - y / 2)}H${R(x + w)}` +
          `M${R(x + w / 2)} ${R(y)}V${R((y + top) / 2)}` +
          `M${R(x + w / 4)} ${R((y + top) / 2)}V${R(top)}M${R(x + (w * 3) / 4)} ${R((y + top) / 2)}V${R(top)}`,
      };
    }
    case "sq ft": {
      // A tile crate with its brace.
      return {
        shape: `M${R(x)} ${R(y)}H${R(x + w)}V${R(y + h)}H${R(x)}Z`,
        detail: `M${R(x + 1.5)} ${R(y + h - 1.5)}L${R(x + w - 1.5)} ${R(y + 1.5)}`,
      };
    }
    case "lengths": {
      // Conduit pipes, bundled.
      const t = y + h * 0.15;
      const b = y + h * 0.85;
      return {
        shape: `M${R(x)} ${R(t)}H${R(x + w)}V${R(b)}H${R(x)}Z`,
        detail: `M${R(x)} ${R(t + (b - t) / 3)}H${R(x + w)}M${R(x)} ${R(t + ((b - t) * 2) / 3)}H${R(x + w)}M${R(x + w / 2)} ${R(t - 1)}V${R(b + 1)}`,
      };
    }
  }
}

export function MaterialStack({
  item,
  requested,
  ordered,
  delivered,
  width = 120,
  tone = "paper",
  words = "below",
}: {
  item: CatalogueItem;
  requested: number;
  /** All POs together, or one amount per PO, oldest first. */
  ordered: number | number[];
  delivered: boolean;
  width?: number;
  tone?: "paper" | "dark";
  /** Where the words go. "none" only when the same words are already beside it. */
  words?: "below" | "beside" | "none";
}) {
  const per = GLYPH_SCALE[item.unit].per;
  const pos = (Array.isArray(ordered) ? ordered : [ordered]).filter((q) => q > 0);
  const orderedTotal = pos.reduce((a, b) => a + b, 0);
  const wanted = Math.max(1, Math.ceil(requested / per));
  const shown = Math.min(wanted, MAX_GLYPHS);
  const more = wanted > MAX_GLYPHS;

  // Each PO is its own pile; what is still to order is the last pile, in outline.
  const piles: Pile[] = [];
  let used = 0;
  for (const qty of pos) {
    const glyphs = Math.min(Math.max(1, Math.round(qty / per)), shown - used);
    if (glyphs <= 0) break;
    piles.push({ filled: true, glyphs });
    used += glyphs;
  }
  if (used < shown) piles.push({ filled: false, glyphs: shown - used });

  // Lay piles out in columns, five glyphs high; a new pile starts a new column.
  type Placed = { col: number; row: number; filled: boolean; pile: number };
  const placed: Placed[] = [];
  let col = 0;
  piles.forEach((pile, p) => {
    for (let g = 0; g < pile.glyphs; g++) {
      placed.push({ col: col + Math.floor(g / HIGH), row: g % HIGH, filled: pile.filled, pile: p });
    }
    col += Math.ceil(pile.glyphs / HIGH);
  });
  const cols = Math.max(col, 1);
  const pileGap = 3;
  const slotW = Math.min(width / 6, (width - pileGap * Math.max(piles.length - 1, 0)) / cols);
  const glyphW = slotW - 3;
  const glyphH = Math.max(5, slotW * 0.42);
  const rowH = glyphH + 2;
  const height = rowH * HIGH + 4;
  const xOf = (c: number, pile: number) => c * slotW + pile * pileGap;

  // The usual-size line falls after the column holding the last glyph of a usual request.
  const limitGlyphs = Math.floor(USUAL_LIMIT[item.unit] / per);
  const over = pastUsual(item, requested);
  const limitAt = over ? placed[limitGlyphs - 1] : undefined;
  const limitX = limitAt ? xOf(limitAt.col, limitAt.pile) + slotW - 1 : null;

  const ink = tone === "dark" ? "var(--color-lime)" : "var(--color-rosewood)";
  const soft = tone === "dark" ? "var(--color-chalk)" : "var(--color-ink-soft)";
  const ground = tone === "dark" ? "var(--color-rosewood)" : "var(--color-paper)";
  const body = tone === "dark" ? "var(--color-laterite-face)" : ink;
  const joint = tone === "dark" ? "var(--color-lime)" : ground;
  const sentence = stackWords(item, requested, orderedTotal, delivered);

  const drawing = (
    <span className="inline-flex items-end gap-1.5">
      <svg
        viewBox={`0 0 ${r1(width)} ${r1(height)}`}
        width={r1(width)}
        height={r1(height)}
        className="block max-w-full shrink-0 overflow-visible"
        style={{ height: "auto" }}
        aria-hidden="true"
        focusable="false"
      >
        {placed.map((g, i) => {
          const x = xOf(g.col, g.pile) + 1;
          const y = height - 2 - (g.row + 1) * rowH + 1;
          const { shape, detail } = glyph(item.unit, x, y, glyphW, glyphH);
          return (
            <g key={i}>
              <path d={shape} style={{ fill: "none", stroke: soft, strokeWidth: 1 }} />
              <g className="inst-fill" style={{ opacity: g.filled ? 1 : 0 }}>
                <path d={shape} style={{ fill: body, stroke: ink, strokeWidth: 1 }} />
                <path d={detail} style={{ fill: "none", stroke: joint, strokeWidth: 1 }} />
              </g>
              <path
                d={detail}
                className="inst-fill"
                style={{ opacity: g.filled ? 0 : 1, fill: "none", stroke: soft, strokeWidth: 1 }}
              />
            </g>
          );
        })}
        <path d={`M0 ${r1(height - 0.5)}H${r1(width)}`} style={{ stroke: soft, strokeWidth: 1 }} />
        {limitX !== null && (
          <path
            d={`M${r1(limitX + 1.5)} -2V${r1(height + 2)}`}
            style={{ stroke: ink, strokeWidth: 1.25 }}
            strokeDasharray="3 2"
          />
        )}
      </svg>
      {more && <span className="lettering whitespace-nowrap">and more</span>}
      {delivered && (
        <span style={{ color: ink }}>
          <ChalkTick className="size-5 shrink-0" />
        </span>
      )}
    </span>
  );

  if (words === "none") return drawing;
  return (
    <div className={words === "beside" ? "flex flex-wrap items-end gap-x-4 gap-y-1" : "grid justify-items-start gap-1"}>
      {drawing}
      <p className={`lettering max-w-[34ch] ${tone === "dark" ? "text-lime/80" : "text-ink-soft"}`}>
        {sentence}
        {over && (
          <span className={`block font-bold ${tone === "dark" ? "text-lime" : "text-ink"}`}>
            This is much more than a usual request. Check the number.
          </span>
        )}
      </p>
    </div>
  );
}
