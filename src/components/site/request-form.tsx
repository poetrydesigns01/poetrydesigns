/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState, type MouseEvent } from "react";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { useScope } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo, useFirm, useViewer } from "@/lib/demo-store";
import type { ProjectId, RequestLine } from "@/lib/firm-data";
import { addDays, formatShortDate, shortWeekdayDate } from "@/lib/format";
import { checkLeadTime } from "@/lib/portal";
import { REQUEST_LEAD_DAYS } from "@/lib/portal-data";
import { Icon, PanelHead, materialChip, requestHref, requestStatus, siteTasksOf } from "./site-kit";
import { PRESETS, STEP, howManyWords, nextRequestNo, underWay } from "./site-words";
import "./site.css";

// A material request from site, with the thumb: the task, the material, the grade, how
// many, and the day it is needed, at least seven days out. Sending waits five seconds
// like every other write. A task card's Request button opens it filled in.

type Line = Omit<RequestLine, "id">;
type Prefill = { task: string | null; m: string | null; sub: string | null; qty: number | null; need: string | null };

const LEAD_CHOICES = [REQUEST_LEAD_DAYS, 10, 14];
/** Rows of "Due to request" shown before "All N". */
const DUE_SHOWN = 5;

/** Reads the task card's link and starts a fresh form for each one. */
export function RequestFormFromParams() {
  const params = useSearchParams();
  const qty = Number(params.get("qty"));
  const need = params.get("need");
  return (
    <RequestForm
      key={params.toString()}
      prefill={{
        task: params.get("task"),
        m: params.get("m"),
        sub: params.get("sub"),
        qty: Number.isFinite(qty) && qty > 0 ? qty : null,
        need: need && /^\d{4}-\d{2}-\d{2}$/.test(need) ? need : null,
      }}
    />
  );
}

function unitLabel(unit: string, n: number): string {
  return unit === "nos" ? n.toLocaleString("en-IN") : `${n.toLocaleString("en-IN")} ${unit}`;
}

export function RequestForm({ prefill }: { prefill: Prefill }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const me = useViewer("site");
  const scope = useScope("site");
  const ids = useId();
  const projectId: ProjectId = scope === "all" ? "iyer" : scope;
  const project = firm.project(projectId);
  const stage = firm.siteStage(projectId);
  // The milestone in hand's tasks, then the next one's: its material is asked for ahead.
  const tasks = siteTasksOf(stage).filter((t) => t.state !== "done" && t.track !== "design");
  const groups = [stage, stage?.next]
    .filter((m) => m != null)
    .map((m) => ({ m, tasks: tasks.filter((t) => t.n === m.n) }))
    .filter((g) => g.tasks.length > 0);

  const preItem = firm.catalogue.find((c) => c.id === prefill.m);
  const [taskId, setTaskId] = useState(tasks.some((t) => t.id === prefill.task) ? (prefill.task as string) : "");
  const [material, setMaterial] = useState<string | null>(preItem?.id ?? null);
  const [chosenSub, setChosenSub] = useState<string | null>(
    preItem && prefill.sub && preItem.subs.includes(prefill.sub) ? prefill.sub : null,
  );
  const [qty, setQty] = useState<number | null>(preItem ? prefill.qty : null);
  const [qtyText, setQtyText] = useState(preItem && prefill.qty ? String(prefill.qty) : "");
  const [lines, setLines] = useState<Line[]>([]);
  const [neededBy, setNeededBy] = useState(prefill.need ?? addDays(TODAY, REQUEST_LEAD_DAYS));
  const [other, setOther] = useState(false);
  const [error, setError] = useState<"task" | "qty" | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [allDue, setAllDue] = useState(false);

  const item = firm.catalogue.find((c) => c.id === material);
  const sub = item ? (chosenSub && item.subs.includes(chosenSub) ? chosenSub : (item.usual ?? item.subs[0])) : "";
  const draft: Line | null = item && qty ? { material: item.id, sub, qty, unit: item.unit, outsideEstimate: false } : null;
  const items = draft ? [...lines, draft] : lines;
  const lead = checkLeadTime(neededBy);
  const choices = LEAD_CHOICES.map((d) => addDays(TODAY, d));
  const isOther = other || !choices.includes(neededBy);
  const task = tasks.find((t) => t.id === taskId);
  const n = task?.n ?? stage?.n ?? (project ? (underWay(project)?.n ?? 1) : 1);
  const busy = pause.pending !== null;
  const canSend = items.length > 0 && lead.ok && Boolean(taskId);
  // Planned materials not yet asked for, soonest request-by first: the 7-day rule at a glance.
  const due = tasks
    .flatMap((t) => t.materials.filter((x) => x.status === "to-request" && !x.requestNo).map((x) => ({ task: t, m: x })))
    .sort((a, b) => a.m.requestBy.localeCompare(b.m.requestBy) || a.task.title.localeCompare(b.task.title));

  const clearDraft = () => {
    setMaterial(null);
    setChosenSub(null);
    setQty(null);
    setQtyText("");
  };

  const setQuantity = (value: number | null, text: string) => {
    setQty(value);
    setQtyText(text);
    setError(null);
  };

  const send = (event: MouseEvent<HTMLButtonElement>) => {
    if (busy || !project) return;
    if (!taskId) {
      setError("task");
      return;
    }
    if (items.length === 0 || !lead.ok) return;
    const sending = items;
    const target = { projectId: project.id, n, neededBy, taskId };
    const { record } = demo;
    setError(null);
    pause.start({
      verb: "Sending",
      what: `Material request for ${task?.title ?? project.name}`,
      origin: event.currentTarget,
      commit: () => {
        const now = getDemoSnapshot();
        const no = nextRequestNo(now.events);
        record({
          kind: "request.raised",
          no,
          ...target,
          lines: sending.map((l, i) => ({ ...l, id: `${no.slice(-4)}-${i + 1}` })),
          queued: now.offline ? true : undefined,
          by: me.id,
        });
        setLines([]);
        clearDraft();
        setSent(no);
      },
    });
  };

  const sentRequest = sent ? firm.requests.find((r) => r.no === sent) : undefined;
  const sentStatus = sentRequest ? requestStatus(sentRequest) : null;

  return (
    <div className="site-screen">
      <StaffBoard place="Request" headline="Request material" />

      {sentRequest && (
        <div className="glass-strong flex flex-wrap items-center gap-3 px-4 py-3" role="status">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-kota/15 text-kota">
            <Icon name="check" />
          </span>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="text-15 font-semibold text-ink">Sent · {sentRequest.no.replace("MR-2026-", "MR ")}</p>
            <p className="text-13 text-ink-soft">Need {formatShortDate(sentRequest.neededBy)}</p>
          </div>
          {sentStatus && <StatusChip tone={sentStatus.tone}>{sentStatus.words}</StatusChip>}
          <Link href={`/staff/site/requests/${sentRequest.no}`} className="link inline-flex min-h-11 items-center text-15 text-ink">
            Open
          </Link>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="glass-strong grid gap-6 p-4 sm:p-6">
          <div>
            <label htmlFor={`${ids}-task`} className="text-15 font-semibold text-ink">
              Task
            </label>
            <select
              id={`${ids}-task`}
              value={taskId}
              onChange={(e) => {
                setTaskId(e.target.value);
                setError(null);
              }}
              className={`${field} mt-2`}
              aria-invalid={error === "task" ? true : undefined}
              aria-describedby={error === "task" ? `${ids}-task-error` : undefined}
            >
              <option value="">Choose a task</option>
              {groups.map((g) => (
                <optgroup key={g.m.n} label={`${g.m.name}${g.m.locked ? " · Locked" : ""}`}>
                  {g.tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {error === "task" && (
              <p id={`${ids}-task-error`} className="late-text mt-1.5 text-15" role="alert">
                Choose a task
              </p>
            )}
          </div>

          {lines.length > 0 && (
            <ul className="grid gap-1.5" aria-label="In this request">
              {lines.map((l, i) => {
                const c = firm.catalogue.find((x) => x.id === l.material);
                return (
                  <li key={`${l.material}-${l.sub}-${i}`} className="glass-inner flex items-center justify-between gap-3 py-1 pr-1 pl-3">
                    <span className="min-w-0 text-15 text-ink">
                      {c?.name ?? l.material}, {l.sub} · <span className="tabular-nums">{unitLabel(l.unit, l.qty)}</span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-glass btn-sm"
                      aria-label={`Remove ${c?.name ?? l.material}`}
                      onClick={() => setLines((current) => current.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <ChipGroup label="Material" columns={3}>
            {firm.catalogue.map((c) => (
              <Chip
                key={c.id}
                pressed={material === c.id}
                onClick={() => {
                  if (c.id !== material) {
                    setMaterial(c.id);
                    setChosenSub(null);
                    setQuantity(null, "");
                  }
                }}
              >
                {c.name.replace(/\s*\(.*\)$/, "")}
              </Chip>
            ))}
          </ChipGroup>

          {item && (
            <>
              {item.subs.length > 1 && (
                <ChipGroup label="Grade">
                  {item.subs.map((s) => (
                    <Chip key={s} pressed={sub === s} onClick={() => setChosenSub(s)}>
                      {s}
                    </Chip>
                  ))}
                </ChipGroup>
              )}

              <div className="grid gap-2">
                <ChipGroup label={`How many ${howManyWords(item)}`}>
                  {PRESETS[item.unit].map((preset) => (
                    <Chip key={preset} pressed={qty === preset} onClick={() => setQuantity(preset, String(preset))}>
                      {unitLabel(item.unit, preset)}
                    </Chip>
                  ))}
                </ChipGroup>
                <div className="flex items-stretch gap-2 sm:max-w-sm">
                  <button
                    type="button"
                    className="btn btn-glass btn-icon"
                    aria-label={`${STEP[item.unit]} fewer`}
                    onClick={() => {
                      const next = Math.max(0, (qty ?? 0) - STEP[item.unit]);
                      setQuantity(next > 0 ? next : null, next > 0 ? String(next) : "");
                    }}
                  >
                    −
                  </button>
                  <label htmlFor={`${ids}-qty`} className="sr-only">
                    Quantity in {howManyWords(item)}
                  </label>
                  <input
                    id={`${ids}-qty`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={qtyText}
                    placeholder="Or type"
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setQuantity(event.target.value && Number.isFinite(value) && value > 0 ? value : null, event.target.value);
                    }}
                    className={`${field} min-w-0 flex-1 text-center`}
                  />
                  <button
                    type="button"
                    className="btn btn-glass btn-icon"
                    aria-label={`${STEP[item.unit]} more`}
                    onClick={() => {
                      const next = (qty ?? 0) + STEP[item.unit];
                      setQuantity(next, String(next));
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-glass btn-sm gap-1.5"
                  onClick={() => {
                    if (!draft) {
                      setError("qty");
                      return;
                    }
                    setLines((current) => [...current, draft]);
                    clearDraft();
                  }}
                >
                  <Icon name="plus" className="size-4.5" />
                  Add another
                </button>
                {error === "qty" && (
                  <p className="late-text mt-1.5 text-15" role="alert">
                    Choose how many
                  </p>
                )}
              </div>
            </>
          )}

          <div className="grid gap-2">
            {/* Two by two on a phone, so no date is left alone on a second line; one row from 640 px. */}
            <div role="group" aria-labelledby={`${ids}-need`}>
              <p id={`${ids}-need`} className="text-15 font-semibold">
                Needed on site
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {choices.map((day, i) => (
                  <Chip
                    key={day}
                    pressed={!isOther && neededBy === day}
                    onClick={() => {
                      setOther(false);
                      setNeededBy(day);
                    }}
                  >
                    {shortWeekdayDate(day)}
                    <span className="sr-only">, in {LEAD_CHOICES[i]} days</span>
                  </Chip>
                ))}
                <Chip pressed={isOther} onClick={() => setOther(true)}>
                  Other
                </Chip>
              </div>
            </div>
            {isOther && (
              <div className="sm:max-w-sm">
                <label htmlFor={`${ids}-date`} className="sr-only">
                  Needed on site
                </label>
                <input
                  id={`${ids}-date`}
                  type="date"
                  min={lead.earliestNeededBy}
                  value={neededBy}
                  onChange={(event) => event.target.value && setNeededBy(event.target.value)}
                  className={field}
                  aria-describedby={lead.ok ? undefined : `${ids}-lead`}
                />
              </div>
            )}
            {lead.ok && (
              <p>
                <StatusChip tone="done">{REQUEST_LEAD_DAYS}-day lead · OK</StatusChip>
              </p>
            )}
            {!lead.ok && (
              <div id={`${ids}-lead`} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-brick/10 px-3 py-2" role="alert">
                <Icon name="clock" className="size-5 text-brick" />
                <p className="min-w-0 flex-1 text-15">
                  <span className="late-text">Too late · under {REQUEST_LEAD_DAYS} d</span>
                  <span className="text-ink"> · earliest {shortWeekdayDate(lead.earliestNeededBy)}</span>
                </p>
                <button
                  type="button"
                  className="btn btn-glass btn-sm"
                  onClick={() => {
                    setOther(false);
                    setNeededBy(lead.earliestNeededBy);
                  }}
                >
                  Use {formatShortDate(lead.earliestNeededBy)}
                </button>
              </div>
            )}
          </div>

          <div className="site-send-bar">
            <button
              type="button"
              onClick={send}
              aria-disabled={!canSend || busy ? true : undefined}
              className="btn btn-primary w-full gap-2 shadow-lg"
            >
              <Icon name="send" />
              {items.length === 0
                ? "Send request"
                : `Send ${items.length} ${items.length === 1 ? "item" : "items"} · ${formatShortDate(neededBy)}`}
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:sticky lg:top-4">
          {task && (
            <section className="glass p-2 sm:p-3" aria-labelledby={`${ids}-for`}>
              <PanelHead id={`${ids}-for`} title={task.title} icon="box" />
              {task.materials.length === 0 ? (
                <p className="px-2 pb-2 text-15 text-ink-soft">Nothing yet</p>
              ) : (
                <ul className="grid gap-1">
                  {task.materials.map((x) => (
                    <li key={x.key} className="glass-row flex items-center justify-between gap-3 px-3 py-2.5">
                      <span className="grid min-w-0 gap-0.5">
                        <span className="text-15 text-ink">{x.label}</span>
                        <span className="text-13 text-ink-soft">Need {formatShortDate(x.neededBy)}</span>
                      </span>
                      <StatusChip tone={materialChip(x, firm).tone}>{materialChip(x, firm).words}</StatusChip>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="glass p-2 sm:p-3" aria-labelledby={`${ids}-due`}>
            <PanelHead id={`${ids}-due`} title="Due to request" icon="clock" count={due.length} />
            {due.length === 0 ? (
              <p className="px-2 pb-2 text-15 text-ink-soft">All requested</p>
            ) : (
              <ul className="grid gap-1">
                {(allDue ? due : due.slice(0, DUE_SHOWN)).map(({ task: t, m: x }) => {
                  const late = x.daysToRequest < 0;
                  const name = x.label.split(",")[0].replace(/\s*\(.*\)$/, "");
                  return (
                    <li key={x.key} className="glass-row">
                      <Link
                        href={requestHref(t, x)}
                        className="flex min-h-11 items-center justify-between gap-3 px-3 py-2.5"
                        aria-label={`Fill the form: ${x.label}, for ${t.title}`}
                      >
                        <span className="grid min-w-0 gap-0.5">
                          <span className="truncate text-15 text-ink">
                            {name} {x.sub}
                          </span>
                          <span className="truncate text-13 text-ink-soft">
                            {t.title} · need {formatShortDate(x.neededBy)}
                          </span>
                        </span>
                        <StatusChip tone={late ? "late" : x.daysToRequest <= 2 ? "waiting" : "locked"}>
                          {late ? `${-x.daysToRequest} d late` : x.daysToRequest === 0 ? "Today" : `By ${formatShortDate(x.requestBy)}`}
                        </StatusChip>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {due.length > DUE_SHOWN && (
              <button
                type="button"
                className="link mt-1 inline-flex min-h-11 w-full items-center justify-center text-15 text-ink"
                aria-expanded={allDue}
                onClick={() => setAllDue(!allDue)}
              >
                {allDue ? "Fewer" : `All ${due.length}`}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
