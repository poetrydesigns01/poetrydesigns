import { PegGlyph, SealGlyph } from "@/components/instruments/glyphs";

// The version shelf: every version of a sheet stands on one shelf as a spine, oldest at the
// left. An approved version carries the client's seal; a version she asked to change has a
// chalk slip hanging under the shelf; the one waiting for her has a peg standing over it.
// Earlier versions are kept, so the shelf is the sheet's whole history at a glance. It is a
// drawing only: the words beside it say the same thing.

export type ShelfVersion = {
  version: number;
  /** "superseded": sent, then replaced by a later version before she decided. */
  status: "approved" | "awaiting" | "changes-requested" | "superseded";
};

const STATUS_WORDS: Record<ShelfVersion["status"], (client: string) => string> = {
  approved: () => "approved",
  awaiting: (client) => `with ${client}`,
  "changes-requested": () => "changes asked",
  superseded: () => "replaced by a later version",
};

/** "Version 1, changes asked. Version 2, with Meera." */
export function shelfWords(versions: ShelfVersion[], client = "Meera"): string {
  return versions.map((v) => `Version ${v.version}, ${STATUS_WORDS[v.status](client)}.`).join(" ");
}

export function VersionShelf({
  versions,
  tone = "paper",
  max = 6,
}: {
  versions: ShelfVersion[];
  tone?: "paper" | "dark";
  /** The newest this many are drawn; older ones are counted at the left. */
  max?: number;
}) {
  const dark = tone === "dark";
  const shown = versions.slice(-max);
  const older = versions.length - shown.length;

  const spine = (status: ShelfVersion["status"]) => {
    if (status === "approved") return `bg-laterite text-lime border ${dark ? "border-lime/70" : "border-rosewood"}`;
    if (status === "superseded") return dark ? "border border-lime/50 text-lime/80" : "border border-ink-soft bg-paper text-ink-soft";
    if (status === "awaiting") return dark ? "border border-lime bg-lime/15 text-lime" : "border border-rosewood bg-plaster text-ink";
    return dark ? "border border-dashed border-chalk text-lime/80" : "border border-dashed border-ink-soft bg-sand-2 text-ink-soft";
  };

  return (
    <div aria-hidden="true" className="inline-flex max-w-full items-start gap-2">
      {older > 0 && <span className={`lettering mt-8 ${dark ? "text-lime/75" : "text-ink-soft"}`}>+{older}</span>}
      <div
        className="inline-grid gap-x-1.5"
        style={{ gridTemplateColumns: `repeat(${shown.length}, 32px)`, gridTemplateRows: "16px 44px 2px 16px" }}
      >
        {shown.map((v, i) => (
          <span key={`g${v.version}`} className="flex items-end justify-center" style={{ gridColumn: i + 1, gridRow: 1 }}>
            {v.status === "approved" && <SealGlyph size={12} />}
            {v.status === "awaiting" && <PegGlyph size={12} />}
          </span>
        ))}
        {shown.map((v, i) => (
          <span
            key={`s${v.version}`}
            className={`lettering flex items-end justify-center pb-1 ${spine(v.status)}`}
            style={{ gridColumn: i + 1, gridRow: 2 }}
          >
            v{v.version}
          </span>
        ))}
        {/* The shelf itself, under every spine. */}
        <span className={dark ? "bg-lime/60" : "bg-laterite"} style={{ gridColumn: "1 / -1", gridRow: 3 }} />
        {shown.map((v, i) =>
          v.status === "changes-requested" ? (
            <span key={`c${v.version}`} className="flex justify-center" style={{ gridColumn: i + 1, gridRow: 4 }}>
              <span className={`mt-0.5 block h-3 w-5 rotate-3 border border-dashed ${dark ? "border-chalk" : "border-ink-soft bg-paper"}`} />
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
