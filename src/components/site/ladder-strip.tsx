import { StatusWord } from "@/components/register/status-word";
import type { RequestView } from "@/lib/firm";

// The request ladder laid on its side, 120 px wide, for a list row: five notches on a
// chalk rule (raised, seen, PO in part, PO uploaded, delivered), the ones reached filled.
// The status word beside it carries the meaning; the drawing is decoration.

const AT = { New: 0, Seen: 1, "PO in part": 2, "PO uploaded": 3, Delivered: 4 } as const;
const XS = [6, 33, 60, 87, 114];

export function LadderStrip({ request }: { request: RequestView }) {
  const at = request.queued ? -1 : AT[request.status];
  // Ordered in one PO, a request passes "PO in part" without standing there.
  const passed = (i: number) => i === 2 && at >= 3 && request.pos.length <= 1;

  return (
    <span className="grid justify-items-start gap-1">
      <svg viewBox="0 0 120 12" width={120} height={12} className="block shrink-0" aria-hidden="true" focusable="false">
        <path d="M6 6H114" style={{ stroke: "var(--color-ink-soft)", strokeWidth: 1 }} strokeDasharray="2 2" />
        {at > 0 && <path d={`M6 6H${XS[at]}`} style={{ stroke: "var(--color-rosewood)", strokeWidth: 1.5 }} />}
        {XS.map((x, i) => {
          const reached = i <= at;
          const filled = reached && !passed(i);
          return (
            <rect
              key={x}
              x={x - 4}
              y={2}
              width={8}
              height={8}
              transform={`rotate(45 ${x} 6)`}
              className="inst-fill"
              style={{
                fill: filled ? "var(--color-rosewood)" : "var(--color-paper)",
                stroke: reached ? "var(--color-rosewood)" : "var(--color-ink-soft)",
                strokeWidth: 1,
              }}
              strokeDasharray={reached ? undefined : "2 1.5"}
            />
          );
        })}
      </svg>
      <span className="text-15">
        {request.queued ? (
          <StatusWord>Waiting to send</StatusWord>
        ) : (
          <>
            <StatusWord>{request.status}</StatusWord>
            {request.late && (
              <>
                {". "}
                <span className="font-bold">Late for site</span>
              </>
            )}
          </>
        )}
      </span>
    </span>
  );
}
