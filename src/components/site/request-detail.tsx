"use client";

import { useEffect, useRef, useState } from "react";
import { MaterialStack, stackWords } from "@/components/instruments/material-stack";
import { RequestLadder } from "@/components/instruments/request-ladder";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { MaterialReport } from "@/components/reports/material-report";
import { ChalkTick, drawTick } from "@/components/staff/chalk-tick";
import { useFirm, useViewer } from "@/lib/demo-store";
import type { RequestView } from "@/lib/firm";
import { TODAY } from "@/lib/demo-data";
import { datePart, formatShortDate, formatStamp, formatStampShort } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/motion";
import { DeliveredButton, requestMargin } from "./rows";
import { amountWords, lowerFirst, stageName, upperFirst } from "./site-words";
import "./site.css";

// One request, as the site engineer follows it: where it has got to, what was ordered
// against each line and from whom (with the vendor's number to call), the delivery mark
// once it is on site, and the requirement report that went to procurement.

function stateLine(r: RequestView): string {
  if (r.queued) return "Waiting to send. It goes when the phone has signal.";
  const late = r.late ? ` Late for site since ${formatShortDate(r.neededBy)}.` : "";
  if (r.status === "Delivered") return `Delivered on ${formatShortDate(datePart(r.deliveredAt ?? r.at))}.`;
  if (r.status === "New") return `New. Not seen by procurement yet.${late}`;
  if (r.status === "Seen") return `Seen, waiting on a PO.${late}`;
  return `${r.status}.${late}`;
}

export function RequestDetail({ no }: { no: string }) {
  const firm = useFirm();
  const me = useViewer("site");
  const reduced = usePrefersReducedMotion();
  const [ticked, setTicked] = useState<{ no: string; keyboard: boolean; focus: boolean } | null>(null);
  const tick = useRef<HTMLSpanElement>(null);
  const where = useRef<HTMLDivElement>(null);
  const deliverRef = useRef<HTMLButtonElement>(null);
  // The delivery whose tick has been drawn. The screen stays mounted while hidden and runs
  // its effects again when it is shown, so this keeps the tick to one drawing per delivery.
  const drawn = useRef<string | null>(null);
  const request = firm.requests.find((r) => r.no === no);

  // Once, after the delivery is recorded: the chalk tick for a pointer, and focus to the row
  // when the button that has now gone had it.
  useEffect(() => {
    if (!ticked || drawn.current === ticked.no) return;
    drawn.current = ticked.no;
    if (!ticked.keyboard && !reduced) drawTick(tick.current);
    if (ticked.focus) where.current?.focus({ preventScroll: true });
  }, [ticked, reduced]);

  const back = { label: "Back to my requests", href: "/staff/site/requests" };

  if (!request) {
    return (
      <div className="site-screen">
        <StaffBoard place="My requests" headline={no} chip={false} back={back} />
        <p className="text-17 text-ink-soft">This request has not been raised yet.</p>
      </div>
    );
  }

  const project = firm.project(request.projectId);
  const main = request.lines[0];
  const mainItem = firm.catalogueAll.find((c) => c.id === main.material);
  const orderedOf = (lineId: string) => request.pos.map((po) => po.lines.find((l) => l.lineId === lineId)?.qty ?? 0);
  const delivered = Boolean(request.deliveredAt);
  const raiser = firm.person(request.by);
  const { margin, marginSub } = requestMargin(request);
  const canDeliver = !delivered && !request.queued && request.pos.length > 0;
  const stamps = firm.stampsFor(`mr:${request.no}`);
  // The board says it was delivered and when, and a stamp made today says who. The row
  // adds who only when that stamp is not on it.
  const stampedToday = stamps[0]?.words === "Delivered" && datePart(stamps[0].at) === TODAY;
  const deliveredBy = request.deliveredBy ? (firm.person(request.deliveredBy)?.name ?? request.deliveredBy) : null;

  return (
    <div className="site-screen">
      <StaffBoard
        place="My requests"
        headline={request.no}
        state={stateLine(request)}
        chip={false}
        back={back}
        picture={
          mainItem ? (
            <MaterialStack
              item={mainItem}
              requested={main.qty}
              ordered={orderedOf(main.id)}
              delivered={delivered}
              width={200}
              tone="dark"
              words="none"
            />
          ) : undefined
        }
        pictureWords={
          // Once delivered the state line says so, and the words only say how much.
          mainItem
            ? delivered
              ? `${upperFirst(amountWords(mainItem, main.qty))}.`
              : stackWords(
                  mainItem,
                  main.qty,
                  orderedOf(main.id).reduce((a, b) => a + b, 0),
                  delivered,
                )
            : undefined
        }
      />

      {/* One column: the ladder needs its width beside the words, and the report is an A4 sheet. */}
      <div className="grid gap-10">
        <div className="grid content-start gap-10">
          <div ref={where} tabIndex={-1} className="outline-none">
            <Register title="Where it has got to">
              <RegisterRow
                id={`mr:${request.no}`}
                margin={margin}
                marginSub={marginSub}
                title={project ? `${project.name}, milestone ${request.n}, ${lowerFirst(stageName(project, request.n))}` : request.projectName}
                sentence={
                  delivered ? (
                    <>
                      <span ref={tick} className="mr-2 inline-block align-[-0.2em] text-kota">
                        <ChalkTick className="size-5 shrink-0" />
                      </span>
                      {stampedToday || !deliveredBy ? "On site." : `On site, marked by ${deliveredBy}.`}
                    </>
                  ) : (
                    `Raised by ${raiser?.name ?? request.by} on ${formatStamp(request.at)}. Needed on site by ${formatShortDate(
                      request.neededBy,
                    )}.`
                  )
                }
                instrument={<RequestLadder status={request.status} stamps={stamps} late={request.late} />}
                action={
                  canDeliver ? (
                    <DeliveredButton
                      ref={deliverRef}
                      request={request}
                      person={me.id}
                      onRecorded={(keyboard) =>
                        setTicked({ no: request.no, keyboard, focus: document.activeElement === deliverRef.current })
                      }
                    />
                  ) : undefined
                }
                stamps={stamps}
              />
            </Register>
          </div>

          <section className="register" aria-labelledby="lines-title">
            <h2 id="lines-title" className="register-title">
              What was asked for and ordered
            </h2>
            <ul>
              {request.lines.map((line) => {
                const item = firm.catalogueAll.find((c) => c.id === line.material);
                const ordered = orderedOf(line.id);
                const pos = request.pos.filter((po) => po.lines.some((l) => l.lineId === line.id));
                return (
                  <li key={line.id} className="reg-item grid gap-3 py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="min-w-0 text-17 font-semibold">
                        {item?.name ?? line.material}, {line.sub}
                      </h3>
                      <span className="figure shrink-0 whitespace-nowrap text-17">
                        {line.qty.toLocaleString("en-IN")} {line.unit}
                      </span>
                    </div>
                    {line.outsideEstimate && (
                      <p className="text-17 font-semibold">
                        Not in the agreed estimate{line.note ? `, ${line.note}` : ""}.
                      </p>
                    )}
                    {/* With one line, the board already draws this stack and says how much is ordered. */}
                    {item && request.lines.length > 1 && (
                      <MaterialStack item={item} requested={line.qty} ordered={ordered} delivered={delivered} width={160} words="beside" />
                    )}
                    {pos.length === 0 && !request.queued && <p className="text-17 text-ink-soft">No PO for this line yet.</p>}
                    {pos.map((po) => {
                      const vendor = firm.vendors.find((v) => v.id === po.vendorId);
                      const qty = po.lines.find((l) => l.lineId === line.id)?.qty ?? 0;
                      return (
                        <p key={po.no} className="text-17">
                          {po.no} from {vendor?.name ?? po.vendor}
                          {vendor && (
                            <>
                              ,{" "}
                              <a href={`tel:${vendor.phone.replace(/\s/g, "")}`} className="link inline-flex min-h-14 items-center">
                                {vendor.phone}
                              </a>
                            </>
                          )}
                          . {qty.toLocaleString("en-IN")} {line.unit}, uploaded {formatStampShort(po.at)}.
                        </p>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <MaterialReport no={request.no} />
      </div>
    </div>
  );
}
