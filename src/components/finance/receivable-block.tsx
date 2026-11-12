import { PegGlyphAt } from "@/components/instruments/glyphs";
import type { LetterView } from "@/lib/firm";
import { countWord } from "@/lib/format";

// The receivable blocks: one block per open demand letter, the way an accountant would
// picture what is owed. A block is hollow while nothing has come in and fills with lime,
// one piece per receipt, as the bank's part and the client's part arrive; full is paid.
// A letter still with the client is drawn in chalk dashes with the peg glyph over it: the
// client has to speak first. The drawing is decoration; the words under it say the same.

const H = 34;
const PEG = 12;
const GAP = 8;
const r1 = (v: number) => Math.round(v * 100) / 100;

/** "Four letters open: one with the client, three waiting for the bank." */
export function receivableWords(letters: LetterView[]): string {
  const withClient = letters.filter((l) => l.state === "raised").length;
  const waiting = letters.filter((l) => l.state === "approved" || l.state === "part-paid").length;
  const paid = letters.filter((l) => l.state === "paid").length;
  const open = withClient + waiting;
  const parts: string[] = [];
  if (withClient > 0) parts.push(`${countWord(withClient)} with the client`);
  if (waiting > 0) parts.push(`${countWord(waiting)} waiting for the bank`);
  const head =
    open === 0
      ? "No letters open"
      : `${countWord(open, true)} ${open === 1 ? "letter" : "letters"} open: ${parts.join(", ")}`;
  return paid > 0 ? `${head}. ${countWord(paid, true)} paid in full this month.` : `${head}.`;
}

export function ReceivableBlock({
  letters,
  tone = "dark",
  width = 320,
}: {
  /** Open letters, and any paid this month. */
  letters: LetterView[];
  tone?: "dark" | "paper";
  width?: number;
}) {
  const n = Math.max(letters.length, 1);
  const blockW = Math.max(24, Math.min(64, (width - GAP * (n - 1)) / n));
  const line = tone === "dark" ? "var(--color-lime)" : "var(--color-ink)";
  const chalk = tone === "dark" ? "var(--color-chalk)" : "var(--color-ink-soft)";
  const fill = tone === "dark" ? "rgb(250 248 245 / 0.85)" : "var(--color-kota)";
  const joint = tone === "dark" ? "var(--color-rosewood)" : "var(--color-paper)";
  const words = tone === "dark" ? "text-lime/75" : "text-ink-soft";

  return (
    <div className="flex flex-wrap items-end gap-2" aria-hidden="true">
      {letters.map((l) => {
        const raised = l.state === "raised";
        // One piece per receipt, laid left to right in the order the money came.
        let x = 0;
        const pieces = l.receipts.map((receipt) => {
          const w = l.total > 0 ? Math.min(blockW - x, (receipt.amount / l.total) * blockW) : 0;
          const piece = { x, w };
          x += w;
          return piece;
        });
        return (
          <span key={l.letterNo} className="grid justify-items-center gap-1">
            <svg viewBox={`0 0 ${r1(blockW)} ${H + PEG}`} width={r1(blockW)} height={H + PEG} className="block overflow-visible">
              {raised && <PegGlyphAt x={r1(blockW / 2)} y={PEG + 1} h={PEG} />}
              {pieces.map((p, i) =>
                p.w > 0 ? (
                  <rect
                    key={i}
                    className="inst-fill"
                    x={r1(p.x)}
                    y={PEG}
                    width={r1(p.w)}
                    height={H}
                    style={{ fill }}
                  />
                ) : null,
              )}
              {/* A joint between the bank's piece and the client's. */}
              {pieces.slice(1).map((p, i) =>
                p.w > 0 ? (
                  <path key={`j${i}`} d={`M${r1(p.x)} ${PEG}V${PEG + H}`} style={{ stroke: joint, strokeWidth: 1.5 }} />
                ) : null,
              )}
              <rect
                x={0.5}
                y={PEG + 0.5}
                width={r1(blockW - 1)}
                height={H - 1}
                style={{ fill: "none", stroke: raised ? chalk : line, strokeWidth: 1 }}
                strokeDasharray={raised ? "3 3" : undefined}
              />
            </svg>
            <span className={`lettering ${words}`}>{l.short}</span>
          </span>
        );
      })}
    </div>
  );
}
