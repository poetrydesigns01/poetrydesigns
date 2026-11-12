import type { RequestStatus, StampView } from "@/lib/firm";
import { TODAY } from "@/lib/demo-data";
import { people } from "@/lib/firm-data";
import { formatStampShort, formatTime } from "@/lib/format";

// Where a material request has got to: five notches down a chalk rule, Raised, Seen, PO
// in part, PO uploaded, Delivered. The notches reached are filled, each with a small stamp
// of who did it and when. The notch it stands at now is written out in full.

const STEPS = ["Raised", "Seen", "PO in part", "PO uploaded", "Delivered"] as const;
const AT: Record<RequestStatus, number> = { New: 0, Seen: 1, "PO in part": 2, "PO uploaded": 3, Delivered: 4 };

function firstName(id: string): string {
  return people.find((p) => p.id === id)?.first ?? id;
}

/** "Seen, Prakash, 9:12 am"; a stamp from another day also gives its date. */
function tiny(stamp: StampView, today: string): string {
  const when = stamp.at.slice(0, 10) === today ? formatTime(stamp.at) : formatStampShort(stamp.at);
  return `${stamp.words}, ${firstName(stamp.by)}, ${when}`;
}

/** Which stamp belongs to each notch. Stamps come newest first. */
function stampsByStep(status: RequestStatus, stamps: StampView[]): (StampView | null)[] {
  const oldest = [...stamps].reverse();
  const sent = oldest.filter((s) => s.words === "Sent" || s.words === "Saved with no signal");
  // A PO that leaves some line short is stamped "PO uploaded in part"; the one that
  // completes the order, "PO uploaded".
  const part = oldest.filter((s) => s.words === "PO uploaded in part");
  const full = oldest.filter((s) => s.words === "PO uploaded");
  return [
    sent[sent.length - 1] ?? null,
    oldest.find((s) => s.words === "Seen") ?? null,
    part[part.length - 1] ?? null,
    status === "PO in part" ? null : (full[full.length - 1] ?? null),
    oldest.find((s) => s.words === "Delivered") ?? null,
  ];
}

export function RequestLadder({
  status,
  stamps,
  today = TODAY,
  late = false,
}: {
  status: RequestStatus;
  /** The request's stamps, newest first. */
  stamps: StampView[];
  /** The demo's day, so a stamp from today shows its time alone. */
  today?: string;
  /** "Late for site" is added to the current notch. */
  late?: boolean;
}) {
  const at = AT[status];
  const byStep = stampsByStep(status, stamps);
  // A request ordered in one PO never stands at "PO in part": that notch is passed, not reached.
  const passed = (i: number) => i === 2 && at >= 3 && !byStep[2];

  return (
    <ol className="grid" aria-label={`Material request: ${status === "New" ? "raised" : status}${late ? ", late for site" : ""}.`}>
      {STEPS.map((step, i) => {
        const reached = i <= at;
        const current = i === at;
        const stamp = byStep[i];
        return (
          <li key={step} className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3">
            <span className="relative flex justify-center" aria-hidden="true">
              {/* The rule: chalk ahead, ink behind. */}
              {i < STEPS.length - 1 && (
                <span
                  className={`absolute top-3 bottom-[-12px] w-0 border-l ${i < at ? "border-solid border-rosewood" : "border-dashed border-ink-soft"}`}
                />
              )}
              <span
                className={`relative mt-[5px] block size-3.5 rotate-45 border ${
                  reached ? (passed(i) ? "border-rosewood bg-paper" : "border-rosewood bg-rosewood") : "border-dashed border-ink-soft bg-paper"
                }`}
              />
            </span>
            <span className={`pb-3 ${reached ? "text-ink" : "text-ink-soft"}`}>
              <span className={`block text-15 ${current ? "font-bold" : reached ? "font-semibold" : ""}`}>
                {step}
                {current && late && <span className="font-bold">. Late for site</span>}
              </span>
              {stamp && reached && <span className="lettering block text-ink-soft">{tiny(stamp, today)}</span>}
              {passed(i) && <span className="lettering block text-ink-soft">Ordered in one PO</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
