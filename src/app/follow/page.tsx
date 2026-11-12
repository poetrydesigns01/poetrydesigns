"use client";

import Link from "next/link";
import { ChalkTick } from "@/components/staff/chalk-tick";
import { useDemo, useFirm, type DemoState, type FirmEvent } from "@/lib/demo-store";
import type { StaffRole } from "@/lib/firm-data";
import { datePart, formatShortDate, formatTime, inr } from "@/lib/format";

// Two threads through the portal, for showing the demo: one payment from the site to the
// bank, and one material request from the site to delivery. Each step says whether it is
// done (and when), whose turn it is, or that it comes later, from what was done in this tab.
// Each link opens the screen of the person whose step it is, seen as them.

const REQUEST = "MR-2026-0142";

type As =
  | { role: "client" }
  | { role: Exclude<StaffRole, "architect" | "site" | "finance"> }
  | { role: "architect"; person: DemoState["viewers"]["architect"] }
  | { role: "site"; person: DemoState["viewers"]["site"] }
  | { role: "finance"; person: DemoState["viewers"]["finance"] };

type Open = { label: string; href: string; as: As; focus?: string };

type State = { done: string } | { part: string } | null;

type Step = { words: string; state: State; open: Open[] };

function when(at: string): string {
  const time = formatTime(at);
  return time ? `${formatShortDate(datePart(at))} at ${time}` : formatShortDate(datePart(at));
}

/** The newest event of a kind that matches, if any. */
function lastOf<K extends FirmEvent["kind"]>(
  events: FirmEvent[],
  kind: K,
  match: (e: Extract<FirmEvent, { kind: K }>) => boolean,
): Extract<FirmEvent, { kind: K }> | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === kind && match(e as Extract<FirmEvent, { kind: K }>)) return e as Extract<FirmEvent, { kind: K }>;
  }
  return undefined;
}

function StepRow({ n, step, turn }: { n: number; step: Step; turn: boolean }) {
  const demo = useDemo();

  const open = (o: Open) => {
    const as = o.as;
    if (as.role === "architect") demo.setViewer("architect", as.person);
    if (as.role === "site") demo.setViewer("site", as.person);
    if (as.role === "finance") demo.setViewer("finance", as.person);
    // A shared staff route such as a project record shows the last role's places.
    if (as.role !== "client") demo.setLastRole(as.role);
    if (o.focus) demo.setFocusRow({ href: o.href.split("#")[0], id: o.focus });
  };

  const done = step.state && "done" in step.state ? step.state.done : null;
  const part = step.state && "part" in step.state ? step.state.part : null;

  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-x-6">
      <span className="lettering pt-1 text-ink-soft" aria-hidden="true">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-17">{step.words}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-15">
          {done ? (
            <>
              <ChalkTick className="size-4 shrink-0 text-kota" />
              <span className="text-ink-soft">Done on {done}</span>
            </>
          ) : turn ? (
            <span className="font-semibold">{part ? `${part} Your turn for the rest` : "Your turn"}</span>
          ) : (
            <span className="text-ink-soft">Not yet</span>
          )}
        </p>
      </div>
      <div className="col-start-2 mt-1 flex flex-wrap gap-x-4 sm:col-start-3 sm:mt-0 sm:justify-end">
        {step.open.map((o) => (
          <Link
            key={o.label}
            href={o.href}
            onClick={() => open(o)}
            className="link inline-flex min-h-11 items-center whitespace-nowrap text-15"
          >
            {o.label}
          </Link>
        ))}
      </div>
    </li>
  );
}

function Sheet({ title, steps }: { title: string; steps: Step[] }) {
  // The turn is the first step not yet done.
  const turn = steps.findIndex((step) => !step.state || !("done" in step.state));
  return (
    <section className="border border-sand bg-paper px-4 py-6 sm:px-8 sm:py-8">
      <h2 className="border-b border-ink pb-2 text-22 font-semibold">{title}</h2>
      <ol className="mt-5 grid gap-5">
        {steps.map((step, i) => (
          <StepRow key={step.words} n={i + 1} step={step} turn={i === turn} />
        ))}
      </ol>
    </section>
  );
}

export default function Follow() {
  const demo = useDemo();
  const firm = useFirm();
  const events = demo.events;

  // ---- One payment: Iyer Residence, milestone 3 ----
  const m = firm.project("iyer")?.milestones.find((x) => x.n === 3);
  const approved =
    m?.approvedAt ?? lastOf(events, "payment.approved", (e) => e.projectId === "iyer" && e.n === 3)?.at ?? null;
  const receipts = events.filter(
    (e): e is Extract<FirmEvent, { kind: "receipt.recorded" }> =>
      e.kind === "receipt.recorded" && e.receipt.projectId === "iyer" && e.receipt.n === 3,
  );
  const paid = m?.state === "paid";
  const paidAt = paid ? (receipts[receipts.length - 1]?.at ?? m?.paidOn ?? null) : null;
  const received = m?.received ?? 0;

  const payment: Step[] = [
    {
      words: "Suresh marks the first floor structure done.",
      state: m?.doneOn ? { done: when(m.doneOn) } : null,
      open: [
        { label: "Open as Suresh", href: "/staff/projects/iyer/programme", as: { role: "site", person: "suresh" } },
      ],
    },
    {
      words: "Vikram raises the payment.",
      state: m?.raisedAt ? { done: when(m.raisedAt) } : null,
      open: [
        {
          label: "Open as Vikram",
          href: "/staff/projects/iyer/programme",
          as: { role: "architect", person: "vikram" },
        },
      ],
    },
    {
      words: `Meera accepts the stage and approves the payment of ${inr(m?.total ?? 0)}.`,
      state: approved ? { done: when(approved) } : null,
      open: [{ label: "Open as Meera", href: "/client/payments#due", as: { role: "client" } }],
    },
    {
      words: "The demand letter is written for her bank.",
      state: approved ? { done: when(approved) } : null,
      open: [{ label: "Open as Meera", href: "/client/payments/letter/3", as: { role: "client" } }],
    },
    {
      words: "Divya records the bank's part and Meera's part.",
      state: paidAt ? { done: when(paidAt) } : received > 0 ? { part: `${inr(received)} recorded.` } : null,
      open: [
        {
          label: "Open as Divya",
          href: "/staff/finance/money",
          as: { role: "finance", person: "divya" },
          focus: "pay:iyer:3",
        },
      ],
    },
    {
      words: "The joints of the first floor set, on Meera's house and on Shalini's board.",
      state: paidAt ? { done: when(paidAt) } : null,
      open: [
        { label: "Open as Meera", href: "/client/payments", as: { role: "client" } },
        { label: "Open as Shalini", href: "/staff/admin", as: { role: "admin" } },
      ],
    },
  ];

  // ---- One material request: the next one Suresh sends ----
  const request = firm.requests.find((r) => r.no === REQUEST);
  const raised = request && !request.queued ? request.sentAt : null;
  const seen = lastOf(events, "request.seen", (e) => e.no === REQUEST)?.at ?? null;
  const po = lastOf(events, "po.linked", (e) => e.po.requestNo === REQUEST)?.at ?? null;
  const delivered = lastOf(events, "request.delivered", (e) => e.no === REQUEST)?.at ?? null;
  const ordered = request?.status === "PO uploaded" || request?.status === "Delivered";

  const material: Step[] = [
    {
      words: "Suresh sends a request for material from site.",
      state: raised ? { done: when(raised) } : null,
      open: [{ label: "Open as Suresh", href: "/staff/site/request", as: { role: "site", person: "suresh" } }],
    },
    {
      words: "Prakash marks it seen.",
      state: seen ? { done: when(seen) } : null,
      open: [
        {
          label: "Open as Prakash",
          href: "/staff/finance/requests",
          as: { role: "finance", person: "prakash" },
          focus: `mr:${REQUEST}`,
        },
      ],
    },
    {
      words: "Prakash links the purchase order from Zoho Books.",
      state: ordered && po ? { done: when(po) } : po ? { part: "Part of it is ordered." } : null,
      open: [
        {
          label: "Open as Prakash",
          href: `/staff/finance/requests/${REQUEST}`,
          as: { role: "finance", person: "prakash" },
        },
      ],
    },
    {
      words: "Suresh sees the order and marks it delivered.",
      state: delivered ? { done: when(delivered) } : null,
      open: [
        {
          label: "Open as Suresh",
          href: "/staff/site/requests",
          as: { role: "site", person: "suresh" },
          focus: `mr:${REQUEST}`,
        },
      ],
    },
  ];

  return (
    <main className="flex flex-1 flex-col bg-lime">
      <header className="on-dark bg-rosewood text-lime">
        <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6 sm:px-8 sm:pt-10">
          <Link href="/" className="display inline-flex min-h-11 items-center text-22 leading-none">
            Poetry Designs
          </Link>
          <h1 className="display mt-8 text-32 sm:mt-12">Follow one thing through the portal</h1>
          <p className="mt-3 max-w-[52ch] text-15 text-lime/80">
            Each step opens the screen of the person whose turn it is.
          </p>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:px-8 sm:py-12">
        <Sheet title="One payment, from site to bank" steps={payment} />
        <Sheet title="One material request, from site to delivery" steps={material} />
        <p className="text-15 text-ink-soft">
          <Link href="/" className="link inline-flex min-h-11 items-center">
            Pick a person
          </Link>
        </p>
      </div>
    </main>
  );
}
