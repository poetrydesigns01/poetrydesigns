/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { DuplicateView } from "@/lib/desk";
import type { PersonId } from "@/lib/firm-data";
import { formatDate } from "@/lib/format";
import { UNDER_DISCUSSION, type ProspectView } from "@/lib/prospects";
import { GlassTable, Initials, Panel, ROW_ACTION, Segments } from "./glass-kit";

// The admin's list of leads: who holds each prospect's phone and email, since when and until
// when (12 months from registration). A lead stays with the BD person who registered it; only
// the admin gives it to someone else, with a reason. A quick check finds who holds a number.

type Filter = "active" | "dropped" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "active", label: UNDER_DISCUSSION },
  { id: "dropped", label: "Dropped" },
  { id: "all", label: "All" },
];

function Reassign({ prospect, onDone }: { prospect: ProspectView; onDone: () => void }) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const id = useId();
  const sendRef = useRef<HTMLButtonElement>(null);
  // A dropped lead can also go back to the person who holds it: that reopens it with them.
  const dropped = prospect.status === "dropped";
  const others = firm.people.filter((p) => p.role === "bd" && (dropped || p.id !== prospect.advisor));
  const [to, setTo] = useState<PersonId | null>(others.length === 1 ? others[0].id : null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const what = `${prospect.owner} to ${to ? (firm.person(to)?.first ?? to) : "someone else"}`;

  const send = () => {
    if (!to) return setError("Choose who takes it");
    if (reason.trim().length < 3) return setError("Add a reason");
    const target = to;
    const why = reason;
    pause.start({
      what,
      origin: sendRef.current,
      commit: () => {
        flushSync(() => {
          if (target === prospect.advisor) demo.reopenProspect(prospect.id, "shalini", why);
          else demo.reassignProspect(prospect.id, target, why, "shalini");
        });
        onDone();
      },
    });
  };

  return (
    <div role="group" aria-labelledby={`${id}-title`} className="glass-inner enter-row mb-3 grid gap-3 p-3">
      <p id={`${id}-title`} className="text-15 font-semibold">
        {dropped ? `Reopen ${prospect.owner}` : `Reassign ${prospect.owner}`}
      </p>
      <ChipGroup label="Give to">
        {others.map((p) => (
          <Chip
            key={p.id}
            pressed={to === p.id}
            onClick={() => {
              setTo(p.id);
              setError("");
            }}
          >
            {p.name}
          </Chip>
        ))}
      </ChipGroup>
      <label className="grid max-w-xl gap-1.5">
        <span className="text-15 font-semibold">Reason</span>
        <input
          value={reason}
          maxLength={120}
          onChange={(e) => {
            setReason(e.target.value);
            setError("");
          }}
          className={field}
        />
      </label>
      {error && (
        <p role="alert" className="late-text text-15">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button ref={sendRef} type="button" className="btn btn-primary" onClick={send}>
          {dropped ? "Reopen" : "Reassign"}
        </button>
        <button type="button" className="btn btn-glass" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function HolderCheck() {
  const firm = useFirm();
  const id = useId();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  // The numbers checked; who holds them is read from the firm as it stands (a reassignment shows at once).
  const [query, setQuery] = useState<{ phone: string; email: string } | null>(null);
  const result: DuplicateView | null | undefined = query ? firm.findDuplicate(query.phone, query.email) : undefined;

  return (
    <Panel title="Who holds it?">
      <form
        className="grid items-end gap-3 px-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(phone.trim() || email.trim() ? { phone, email } : null);
        }}
      >
        <label className="grid gap-1.5" htmlFor={`${id}-phone`}>
          <span className="text-15 font-semibold">Phone</span>
          <input
            id={`${id}-phone`}
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setQuery(null);
            }}
            className={field}
          />
        </label>
        <label className="grid gap-1.5" htmlFor={`${id}-email`}>
          <span className="text-15 font-semibold">Email</span>
          <input
            id={`${id}-email`}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setQuery(null);
            }}
            className={field}
          />
        </label>
        <button type="submit" className="btn btn-glass min-h-12">
          Check
        </button>
      </form>
      <div aria-live="polite" className="px-1 pt-3">
        {result === null && <StatusChip tone="done">Free to register</StatusChip>}
        {result && (
          <p className="flex flex-wrap items-center gap-2 text-15">
            <StatusChip tone="late">{result.kind === "customer" ? "Customer" : "Prospect"}</StatusChip>
            <span className="font-semibold">{result.name}</span>
            <span className="text-ink-soft">
              Held by {result.holderName} since {formatDate(result.since)} · until {formatDate(result.until)}
            </span>
          </p>
        )}
      </div>
    </Panel>
  );
}

export function LeadsPage() {
  const firm = useFirm();
  const [filter, setFilter] = useState<Filter>("active");
  const [open, setOpen] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  // A lead holds its phone and email for 12 months from registration, dropped or not.
  const holding = firm.prospects.filter((p) => p.status !== "converted" && p.holdsUntil >= TODAY);
  const rows = holding.filter((p) => filter === "all" || p.status === filter);
  const openRow = open ? holding.find((p) => p.id === open) : undefined;
  const count = (f: Filter) => holding.filter((p) => f === "all" || p.status === f).length;

  return (
    <>
      <StaffBoard place="Leads" headline={UNDER_DISCUSSION} chip={false} />
      <div className="mt-6 grid gap-5">
        <HolderCheck />
        <Panel
          title="Held leads"
          aside={
            <Segments<Filter>
              label="Show"
              value={filter}
              onChange={setFilter}
              options={FILTERS.map((f) => ({ ...f, count: count(f.id) }))}
            />
          }
          strong
        >
          <div ref={editorRef} className="scroll-mt-24">
            {openRow && <Reassign key={openRow.id} prospect={openRow} onDone={() => setOpen(null)} />}
          </div>
          <GlassTable<ProspectView>
            caption="Held leads"
            rows={rows}
            rowKey={(p) => p.id}
            wide="lg"
            empty="No leads"
            chip={(p) => <StatusChip tone={p.tone}>{p.status === "active" ? p.levelLabel : p.statusWords}</StatusChip>}
            columns={[
              {
                label: "Prospect",
                cell: (p) => (
                  <span className="grid min-w-0">
                    <span className="truncate">{p.owner}</span>
                    <span className="truncate text-13 font-normal text-ink-soft">
                      {p.layoutShort} · {p.locality}
                    </span>
                  </span>
                ),
              },
              {
                label: "Stage",
                width: "w-40",
                phone: false,
                cell: (p) => <StatusChip tone={p.tone}>{p.status === "active" ? `${p.levelLabel} · ${p.levelName}` : p.statusWords}</StatusChip>,
              },
              {
                label: "Held by",
                width: "w-48",
                cell: (p) => (
                  <span className="flex items-center gap-2 font-normal">
                    <Initials name={firm.person(p.advisor)?.name ?? p.advisor} />
                    {firm.person(p.advisor)?.name ?? p.advisor}
                  </span>
                ),
              },
              { label: "Since", width: "w-28", cell: (p) => <span className="figure font-normal">{formatDate(p.registeredOn)}</span> },
              { label: "Until", width: "w-28", cell: (p) => <span className="figure font-normal">{formatDate(p.holdsUntil)}</span> },
              {
                label: "Action",
                align: "right",
                width: "w-36",
                bare: true,
                cell: (p) => (
                  <button
                    type="button"
                    className={ROW_ACTION}
                    aria-expanded={open === p.id}
                    onClick={() => {
                      flushSync(() => setOpen(open === p.id ? null : p.id));
                      editorRef.current?.scrollIntoView({ block: "nearest" });
                    }}
                  >
                    {p.status === "dropped" ? "Reopen" : "Reassign"}
                  </button>
                ),
              },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
