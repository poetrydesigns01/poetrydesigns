/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { field } from "@/components/register/chips";
import { DropZone } from "@/components/register/drop-zone";
import { projectsFor } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { Firm, ProjectView } from "@/lib/firm";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import type { DesignItemView, Tone } from "@/lib/portal";
import type { PlanStageView, PlanTaskView, PlanView } from "@/lib/workflow-plan";
import { useArchitect, type ArchitectView } from "./common";
import { day, dayTime, Empty, IconChat, IconCheck, IconEye, IconHistory, IconUpload, Panel, rowBtn } from "./glass-ui";
import { inWeek, lateWords, planChip, weekNowLabel, weeksLabel } from "./plan-bits";

// The design track of one project, as Poetry's workflow lays it out: drafts and options,
// approvals and the BOM, technical drawings, MEP, and the selections each milestone needs.
// Each task shows its planned weeks, who has it and where it stands; a client item also
// shows its version, when the client viewed it and what they decided. The next draft or
// option is uploaded in its row.

export const DESIGNS_HREF = "/staff/architect/designs";

/** Columns from 1280 px: task, weeks, version, viewed, status, actions. */
const COLS = "xl:grid xl:grid-cols-[minmax(0,1fr)_4.5rem_2.75rem_5.75rem_9.5rem_7.5rem]";

/** The design and approval tasks of the workbook. */
export function isDesignTrack(t: Pick<PlanTaskView, "track">): boolean {
  return t.track === "design" || t.track === "approval";
}

/** A client design item's state as one chip, with the plan's timing when nothing is uploaded. */
export function itemChip(item: DesignItemView, plan: PlanView, t: PlanTaskView | undefined): { tone: Tone; words: string } {
  if (item.status === "approved") return { tone: "done", words: item.decidedAt ? `Approved ${day(item.decidedAt)}` : "Approved" };
  if (item.status === "waiting") return { tone: "waiting", words: "With client" };
  if (item.status === "modify") return { tone: "progress", words: "Modify asked" };
  if (t?.late) return { tone: "late", words: lateWords(t.daysLate) };
  if (t && inWeek(plan, t)) return { tone: "waiting", words: "Upload this week" };
  return { tone: "locked", words: "To upload" };
}

/** Design items by their template id, with whether they are locked (their stage, or an earlier draft or option still open). */
function itemsOf(firm: Firm, id: ProjectId): Map<string, { item: DesignItemView; locked: boolean }> {
  const map = new Map<string, { item: DesignItemView; locked: boolean }>();
  for (const s of firm.designStages(id)) {
    // Drafts and options go in order: one not uploaded waits for the one before to be approved.
    const ordered = s.stage === "floor-plan" || s.stage === "elevation";
    let waiting = false;
    for (const item of s.items) {
      map.set(item.id, { item, locked: s.locked || (ordered && waiting && item.status === "not-uploaded") });
      if (item.status !== "approved") waiting = true;
    }
  }
  return map;
}

/**
 * The next draft, option or selection to upload: a version the client asked to modify,
 * else the first not uploaded in an open stage. Drafts and options go in order, so the
 * one before must be approved first.
 */
export function nextUpload(firm: Firm, id: ProjectId): DesignItemView | null {
  const stages = firm.designStages(id).filter((s) => !s.locked);
  const all = stages.flatMap((s) => s.items);
  const modify = all.find((i) => i.status === "modify");
  if (modify) return modify;
  for (const s of stages) {
    const ordered = s.stage === "floor-plan" || s.stage === "elevation";
    for (let i = 0; i < s.items.length; i++) {
      const item = s.items[i];
      if (item.status !== "not-uploaded") continue;
      if (ordered && i > 0 && s.items[i - 1].status !== "approved") break;
      return item;
    }
  }
  return null;
}

function UploadForm({ item, by, onDone }: { item: DesignItemView; by: PersonId; onDone: () => void }) {
  const demo = useDemo();
  const pause = usePause();
  const noteId = useId();
  const version = (item.version ?? 0) + 1;
  const [files, setFiles] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const stem = `${item.sheet} v${version}`;

  const send = (origin: HTMLElement) => {
    if (pause.pending !== null) return;
    if (files.length === 0) return setError("Choose the file");
    if (version > 1 && note.trim().length < 3) return setError("Say what changed");
    setError("");
    const { record } = demo;
    const chosen = [...files];
    const words = note.trim();
    pause.start({
      what: `${item.title} v${version}, sent to the client`,
      origin,
      commit: () => {
        record({
          kind: "design.uploaded",
          projectId: item.projectId,
          designId: item.id,
          version,
          note: words,
          files: chosen,
          ...(item.neededBy ? { neededBefore: item.neededBy } : {}),
          by,
        });
        onDone();
      },
    });
  };

  return (
    <div className="glass-inner mt-2 grid gap-3 p-3 sm:grid-cols-2">
      <DropZone
        label={`${item.sheet}, version ${version}`}
        samples={[`${stem}.pdf`, `${stem} render.png`]}
        accept="pdf-or-images"
        chosen={files}
        onChoose={(next) => {
          setFiles(next);
          setError("");
        }}
      />
      <div className="grid content-start gap-1.5">
        <label htmlFor={noteId} className="text-15 font-semibold">
          {version > 1 ? "What changed" : "Note"}
        </label>
        <textarea id={noteId} className={`${field} min-h-20 py-2`} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && (
        <p className="text-15 font-semibold text-brick sm:col-span-2" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button
          type="button"
          className="btn btn-primary min-h-11 gap-1.5 px-4 text-15"
          aria-disabled={pause.pending !== null}
          onClick={(e) => send(e.currentTarget)}
        >
          <IconUpload /> Send v{version}
        </button>
        <button
          type="button"
          className="btn btn-glass min-h-11 px-4 text-15"
          onClick={() => {
            if (pause.pending !== null) pause.cancel();
            onDone();
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Every version with its dates: the proof of what the client saw and decided. */
function History({ item }: { item: DesignItemView }) {
  return (
    <ol className="glass-inner mt-2 grid gap-1 p-2" aria-label={`${item.title}, versions`}>
      {[...item.versions].reverse().map((v) => (
        <li key={v.version} className="grid gap-1 rounded-xl px-2 py-1.5 sm:grid-cols-[3rem_minmax(0,1fr)]">
          <span className="figure text-15 text-ink">v{v.version}</span>
          <div className="grid gap-1">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-13 text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <IconUpload label="Uploaded" /> {dayTime(v.uploadedAt)}
              </span>
              {v.viewedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <IconEye label="Viewed" /> {dayTime(v.viewedAt)}
                </span>
              )}
              {v.decidedAt && v.status !== "waiting" && (
                <StatusChip tone={v.status === "approved" ? "done" : "progress"}>
                  {v.status === "approved" ? "Approved" : "Modify"} {dayTime(v.decidedAt)}
                </StatusChip>
              )}
            </p>
            {v.comment && (
              <p className="flex items-start gap-1.5 text-15 text-ink">
                <IconChat className="mt-1 text-ink-soft" />
                <q>{v.comment}</q>
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

type Open = { id: string; kind: "upload" | "history" } | null;

function TaskRow({
  t,
  plan,
  entry,
  me,
  head,
  open,
  setOpen,
  rowRef,
}: {
  t: PlanTaskView;
  plan: PlanView;
  entry: { item: DesignItemView; locked: boolean } | undefined;
  me: ArchitectView;
  head: boolean;
  open: Open;
  setOpen: (o: Open) => void;
  rowRef: (el: HTMLLIElement | null) => void;
}) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const item = entry?.item;
  const mine = t.assignee === me.id || item?.preparedBy === me.id;
  const canAct = me.senior || head || mine;
  const who = t.assignee ? (firm.person(t.assignee)?.first ?? "") : "";
  const chip = item ? itemChip(item, plan, t) : planChip(plan, t);
  const kind = open && open.id === t.id ? open.kind : null;
  const canUpload = !!item && canAct && !entry?.locked && item.status !== "approved";
  // Plain tasks are marked done by whoever has them, or by the Project Head when the architect manages them.
  const canFinish =
    !item && t.state !== "done" && t.state !== "locked" && (t.assignee === me.id || (t.manager === "architect" && (me.senior || head)));
  const next = (item?.version ?? 0) + 1;

  const toggle = (k: "upload" | "history") => {
    if (kind === "upload" && pause.pending !== null) pause.cancel();
    setOpen(kind === k ? null : { id: t.id, kind: k });
  };

  const finish = (origin: HTMLElement) => {
    if (pause.pending !== null) return;
    const { record } = demo;
    pause.start({
      what: `${t.name}, done`,
      origin,
      commit: () => record({ kind: "site-task.progress", projectId: t.projectId, taskId: t.id, percent: 100, by: me.id }),
    });
  };

  return (
    <li ref={rowRef} className="glass-row scroll-mt-28 px-3 py-2.5">
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 xl:gap-x-3 ${COLS} xl:items-center`}>
        <div className="min-w-0 basis-full xl:basis-auto">
          <p className="truncate text-15 font-semibold text-ink">{item?.title ?? t.name}</p>
          <p className="truncate text-13 text-ink-soft">{[item?.sheet, who].filter(Boolean).join(" · ") || "—"}</p>
        </div>
        <span className="figure text-13 text-ink">{weeksLabel(t.clock, t.fromWeek, t.toWeek)}</span>
        <span className="figure text-15 text-ink">{item?.version ? `v${item.version}` : <span className="text-ink-soft">—</span>}</span>
        {item ? (
          <span className={`inline-flex items-center gap-1.5 text-13 ${item.viewed ? "text-ink" : "text-ink-soft"}`}>
            <IconEye label={item.viewed ? "Viewed" : "Not viewed"} className={item.viewed ? "text-kota" : ""} />
            {item.viewedAt ? day(item.viewedAt) : "—"}
          </span>
        ) : (
          <span className="hidden xl:block" />
        )}
        <span>
          <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
        </span>
        <span className="ml-auto flex justify-end gap-2 xl:ml-0">
          {item && item.versions.length > 0 && (
            <button
              type="button"
              className="btn btn-glass size-11 min-h-11 shrink-0 p-0"
              aria-expanded={kind === "history"}
              aria-label={`${item.title}, history`}
              title="History"
              onClick={() => toggle("history")}
            >
              <IconHistory />
            </button>
          )}
          {canUpload && (
            <button
              type="button"
              className={rowBtn}
              aria-expanded={kind === "upload"}
              aria-label={`Upload ${item.title}, version ${next}`}
              onClick={() => toggle("upload")}
            >
              <IconUpload /> v{next}
            </button>
          )}
          {canFinish && (
            <button
              type="button"
              className={rowBtn}
              aria-disabled={pause.pending !== null}
              aria-label={`Mark ${t.name} done`}
              onClick={(e) => finish(e.currentTarget)}
            >
              <IconCheck /> Done
            </button>
          )}
        </span>
      </div>
      {item?.status === "modify" && item.comment && kind !== "history" && (
        <p className="mt-2 flex items-start gap-1.5 text-15 text-ink">
          <IconChat className="mt-1 text-ink-soft" />
          <q>{item.comment}</q>
        </p>
      )}
      {item && kind === "history" && <History item={item} />}
      {item && kind === "upload" && <UploadForm item={item} by={me.id} onDone={() => setOpen(null)} />}
    </li>
  );
}

/** A stage's design tasks: how many are done, and one chip for where they stand. */
function stageSummary(plan: PlanView, s: PlanStageView, tasks: PlanTaskView[], done: (t: PlanTaskView) => boolean) {
  const count = tasks.filter(done).length;
  const late = tasks.filter((t) => !done(t) && t.late).length;
  let chip: { tone: Tone; words: string };
  if (count === tasks.length) chip = { tone: "done", words: "Done" };
  else if (late > 0) chip = { tone: "late", words: `${late} late` };
  else if (tasks.some((t) => !done(t) && inWeek(plan, t))) chip = { tone: "waiting", words: "This week" };
  else chip = { tone: s.state === "current" ? "progress" : "locked", words: s.state === "current" ? "Under way" : "Upcoming" };
  return { count, late, chip };
}

function Track({ p, me, focus }: { p: ProjectView; me: ArchitectView; focus: string | null }) {
  const firm = useFirm();
  const plan = firm.plan(p.id);
  const items = itemsOf(firm, p.id);
  const head = p.team.head === me.id;
  const rows = useRef(new Map<string, HTMLLIElement>());

  const doneOf = (t: PlanTaskView) => {
    const entry = items.get(t.templateId);
    return entry ? entry.item.status === "approved" : t.state === "done";
  };
  const stages = (plan?.stages ?? [])
    .map((s) => ({ s, tasks: s.tasks.filter(isDesignTrack) }))
    .filter((x) => x.tasks.length > 0);

  const next = nextUpload(firm, p.id);
  const focusTask = focus ? plan?.tasks.find((t) => t.templateId === focus) : undefined;

  const [open, setOpen] = useState<Open>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const start = new Set<string>();
    if (!plan) return start;
    for (const { s, tasks } of stages) {
      const live = tasks.filter((t) => !doneOf(t));
      if (live.some((t) => t.late || inWeek(plan, t) || items.get(t.templateId)?.item.status === "modify")) start.add(s.id);
      if (s.state === "current" && live.length > 0) start.add(s.id);
    }
    if (focusTask) start.add(focusTask.stage);
    if (start.size === 0) {
      const first = stages.find(({ tasks }) => tasks.some((t) => !doneOf(t)));
      if (first) start.add(first.s.id);
    }
    return start;
  });

  // A row asked for from the desk: scroll to it once.
  const focusId = focusTask?.id ?? null;
  useEffect(() => {
    if (focusId) rows.current.get(focusId)?.scrollIntoView({ block: "center" });
  }, [focusId]);

  if (!plan) {
    return (
      <section className="glass p-4">
        <Empty>No plan yet</Empty>
      </section>
    );
  }

  const designTasks = stages.flatMap((x) => x.tasks);
  const approved = designTasks.filter(doneOf).length;
  const withClient = [...items.values()].filter((e) => e.item.status === "waiting");
  const viewed = withClient.filter((e) => e.item.viewed).length;
  const late = designTasks.filter((t) => !doneOf(t) && t.late).length;
  const nextTask = next ? plan.tasks.find((t) => t.templateId === next.id) : undefined;
  const drawings = firm.siteDrawings.filter((d) => d.projectId === p.id && d.status === "awaited");
  const drawingsLate = drawings.filter((d) => d.daysLate > 0).length;

  const toggleStage = (id: string) => {
    setExpanded((prev) => {
      const out = new Set(prev);
      if (out.has(id)) out.delete(id);
      else out.add(id);
      return out;
    });
  };

  const uploadNext = () => {
    if (!nextTask || !next) return;
    setExpanded((prev) => new Set(prev).add(nextTask.stage));
    setOpen({ id: nextTask.id, kind: "upload" });
    requestAnimationFrame(() => rows.current.get(nextTask.id)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };

  const canUploadNext =
    !!next && (me.senior || head || next.preparedBy === me.id || nextTask?.assignee === me.id);

  return (
    <div className="grid gap-4">
      <section className="glass-dark grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end" aria-label="Design track">
        <div className="grid min-w-0 gap-1">
          <p className="lettering text-lime/75">
            {p.code} · {weekNowLabel(plan)}
          </p>
          {next ? (
            <>
              <p className="display text-22 text-lime sm:text-32">{next.title}</p>
              <p className="flex flex-wrap items-center gap-2 text-15 text-lime/75">
                <span>
                  {[`v${(next.version ?? 0) + 1}`, next.milestone ? `Milestone ${next.milestone}` : next.stageLabel, next.neededBy ? `by ${day(next.neededBy)}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {next.status === "modify" && <StatusChip tone="progress">Modify asked</StatusChip>}
              </p>
            </>
          ) : (
            <p className="display flex items-center gap-2 text-22 text-lime sm:text-32">
              {withClient.length > 0 ? (
                <>
                  <IconEye /> With the client
                </>
              ) : (
                <>
                  <IconCheck /> All uploaded
                </>
              )}
            </p>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-2 text-lime lg:min-w-[22rem]">
          <div className="glass-inner p-2.5">
            <dt className="lettering text-lime/75">Done</dt>
            <dd className="figure text-22">
              {approved}/{designTasks.length}
            </dd>
          </div>
          <div className="glass-inner p-2.5">
            <dt className="lettering text-lime/75">Client</dt>
            <dd className="figure flex items-center gap-1.5 text-22">
              {withClient.length}
              {withClient.length > 0 && (
                <span className="inline-flex items-center gap-1 text-13">
                  <IconEye label="Viewed" /> {viewed}
                </span>
              )}
            </dd>
          </div>
          <div className="glass-inner p-2.5">
            <dt className="lettering text-lime/75">Site waits</dt>
            <dd className="figure flex items-center gap-1.5 text-22">
              {drawings.length}
              {drawingsLate > 0 && <span className="text-13 text-brass-light">{drawingsLate} late</span>}
            </dd>
          </div>
        </dl>
        {next && canUploadNext && (
          <div className="lg:col-span-2">
            <button type="button" className="btn btn-primary min-h-12 gap-2" onClick={uploadNext}>
              <IconUpload /> Upload v{(next.version ?? 0) + 1}
            </button>
          </div>
        )}
      </section>

      <Panel title="Design track" aside={late > 0 ? <StatusChip tone="late">{`${late} late`}</StatusChip> : undefined}>
        <div aria-hidden="true" className={`lettering hidden gap-x-3 px-3 pb-1 text-ink-soft ${COLS}`}>
          <span>Task</span>
          <span>Weeks</span>
          <span>Ver.</span>
          <span>Viewed</span>
          <span>Status</span>
          <span />
        </div>
        <ol className="grid gap-2">
          {stages.map(({ s, tasks }) => {
            const sum = stageSummary(plan, s, tasks, doneOf);
            const isOpen = expanded.has(s.id);
            const panelId = `stage-${p.id}-${s.id}`;
            return (
              <li key={s.id} className="grid gap-1">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleStage(s.id)}
                  className="flex min-h-12 w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-left hover:bg-white/45"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width={16}
                    height={16}
                    aria-hidden="true"
                    className={`shrink-0 text-ink-soft transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 3.5 4.5 4.5L6 12.5" />
                  </svg>
                  <span className="min-w-0 flex-[1_1_10rem]">
                    <span className="block truncate text-15 font-semibold text-ink">{s.name}</span>
                    {s.milestone !== null && <span className="block truncate text-13 text-ink-soft">{s.short}</span>}
                  </span>
                  <span className="figure text-13 text-ink-soft">{weeksLabel(s.clock, s.fromWeek, s.toWeek)}</span>
                  <span className="figure text-15 text-ink">
                    {sum.count}/{tasks.length}
                  </span>
                  <StatusChip tone={sum.chip.tone}>{sum.chip.words}</StatusChip>
                </button>
                {isOpen && (
                  <ul id={panelId} className="grid grid-cols-1 gap-1">
                    {tasks.map((t) => (
                      <TaskRow
                        key={`${t.id}-${items.get(t.templateId)?.item.version ?? 0}`}
                        t={t}
                        plan={plan}
                        entry={items.get(t.templateId)}
                        me={me}
                        head={head}
                        open={open}
                        setOpen={setOpen}
                        rowRef={(el) => {
                          if (el) rows.current.set(t.id, el);
                          else rows.current.delete(t.id);
                        }}
                      />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}

/** The project with the most design work in hand now, the architect's own counting double. */
function busiest(firm: Firm, projects: ProjectView[], me: PersonId): ProjectView | undefined {
  const score = (p: ProjectView) => {
    const plan = firm.plan(p.id);
    if (!plan) return -1;
    const items = itemsOf(firm, p.id);
    let total = 0;
    for (const t of plan.tasks) {
      if (!isDesignTrack(t) || t.state === "done" || t.state === "locked") continue;
      const item = items.get(t.templateId)?.item;
      if (item?.status === "approved") continue;
      if (!(t.late || inWeek(plan, t) || item?.status === "modify")) continue;
      total += t.assignee === me || item?.preparedBy === me ? 2 : 1;
    }
    return total;
  };
  return [...projects].sort((a, b) => score(b) - score(a))[0];
}

export function ArchitectDesigns() {
  const firm = useFirm();
  const demo = useDemo();
  const me = useArchitect();
  const projects = projectsFor("architect", me.id, firm).filter(
    (p) => (me.scope === "all" || p.id === me.scope) && firm.plan(p.id) !== null,
  );

  // A row asked for from the desk ("iyer:m4-door-frames"), kept for this visit.
  const asked = demo.focusRow && demo.focusRow.href === DESIGNS_HREF ? demo.focusRow.id : null;
  const [focus] = useState(asked);
  const [picked, setPicked] = useState<ProjectId | null>(() => (asked ? (asked.split(":")[0] as ProjectId) : null));
  const { setFocusRow } = demo;
  useEffect(() => {
    if (asked) setFocusRow(null);
  }, [asked, setFocusRow]);

  const current = projects.find((p) => p.id === picked) ?? busiest(firm, projects, me.id);
  const focusItem = focus && current && focus.startsWith(`${current.id}:`) ? focus.slice(current.id.length + 1) : null;

  return (
    <>
      <StaffBoard place="Designs" headline={current ? current.name : "Design track"} />
      <div className="mt-6 grid gap-4 lg:mt-8">
        {projects.length > 1 && (
          <nav aria-label="Projects" className="glass flex gap-1.5 overflow-x-auto p-1.5">
            {projects.map((p) => {
              const on = p.id === current?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked(p.id)}
                  className={`min-h-11 shrink-0 rounded-xl px-3.5 text-left text-15 ${on ? "bg-rosewood text-lime" : "text-ink hover:bg-white/55"}`}
                >
                  {p.name}
                </button>
              );
            })}
          </nav>
        )}
        {current ? (
          <Track key={current.id} p={current} me={me} focus={focusItem} />
        ) : (
          <section className="glass p-4">
            <Empty>No design work here yet</Empty>
          </section>
        )}
      </div>
    </>
  );
}
