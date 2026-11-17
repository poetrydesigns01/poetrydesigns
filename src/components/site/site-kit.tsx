/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SamplePhoto } from "@/components/instruments/sample-photo";
import { StatusChip } from "@/components/register/status-chip";
import { TODAY } from "@/lib/demo-data";
import type { Firm, RequestView } from "@/lib/firm";
import type { PersonId, PhotoKind, ProjectId } from "@/lib/firm-data";
import { daysBetween, datePart, formatShortDate } from "@/lib/format";
import type { SiteStageView, SiteTaskView, TaskMaterialView, Tone } from "@/lib/portal";

// The small pieces every site screen shares: icons that stand in for words, the progress
// bar, a photo tile, a section head, and the sums a status chip needs.

// ---- Icons ----

const PATHS = {
  box: "M3 6.8 10 3.5l7 3.3v6.6L10 16.7l-7-3.3z M3 6.8l7 3.3 7-3.3 M10 10.1v6.6",
  crew: "M2.5 14.5h15 M4 14.5a6 6 0 0 1 12 0 M8.2 8.8V5.6h3.6v3.2",
  sheet: "M5 2.8h6.8l3.2 3.2v11.2H5z M11.8 2.8V6H15 M7.6 10h4.8 M7.6 13h4.8",
  camera: "M2.8 6.5h3.4l1.5-2.2h4.6l1.5 2.2h3.4v9.6H2.8z M10 13.6a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4z",
  plus: "M10 4.5v11 M4.5 10h11",
  lock: "M5.5 9h9v7.5h-9z M7.3 9V6.6a2.7 2.7 0 0 1 5.4 0V9",
  calendar: "M3.2 4.8h13.6v12H3.2z M3.2 8.6h13.6 M7 2.8v3.6 M13 2.8v3.6",
  check: "M4.5 10.5 8 14l7.5-8",
  chevron: "M6.5 8 10 11.5 13.5 8",
  back: "M12 4.5 6.5 10l5.5 5.5",
  flag: "M5.2 17.2V3 M5.2 3.4h9.3l-2 3.2 2 3.2H5.2",
  truck:
    "M2.5 5.5h9v8h-9z M11.5 8.5h3.4l2.6 2.8v2.2h-6 M5.5 15.8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M14.3 15.8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  clock: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M10 6.2V10l2.6 1.7",
  send: "M3.5 10 16.5 3.8 13 16.5l-3.3-5.2z M9.7 11.3 16.5 3.8",
  pencil: "M4 16l.9-3.6 8.6-8.6 2.7 2.7-8.6 8.6z M11.8 5.5l2.7 2.7",
  user: "M10 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M4 17a6 6 0 0 1 12 0",
  alert: "M10 3.2 17.6 16.6H2.4z M10 8.2v3.8 M10 14.3v.01",
  rupee: "M6 4h8 M6 7.5h8 M6 4h2.5a3.5 3.5 0 0 1 0 7H6l6 6",
  chart: "M3 17h14 M5.5 14V9 M10 14V5 M14.5 14v-6",
} as const;

export type IconName = keyof typeof PATHS;

/** A 20 px line icon in the text colour. Decorative: the words beside it carry the meaning. */
export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

// ---- Progress ----

const FILL: Record<"progress" | "done" | "late", string> = {
  progress: "bg-laterite",
  done: "bg-kota",
  late: "bg-brick",
};

/** A rounded bar that fills from the left. Only its transform moves. */
export function ProgressBar({
  value,
  tone = "progress",
  label,
  dark = false,
  className = "",
}: {
  value: number;
  tone?: "progress" | "done" | "late";
  /** For a screen reader. Leave it out when the bar sits inside a control that says the number. */
  label?: string;
  dark?: boolean;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`site-meter ${dark ? "site-meter-dark" : ""} ${className}`}
      role={label ? "progressbar" : undefined}
      aria-label={label}
      aria-valuenow={label ? Math.round(v) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-hidden={label ? undefined : true}
    >
      <div className={`site-meter-fill ${dark ? "bg-lime" : FILL[tone]}`} style={{ transform: `scaleX(${v / 100})` }} />
    </div>
  );
}

export function taskTone(task: SiteTaskView): "progress" | "done" | "late" {
  if (task.state === "done") return "done";
  return task.late ? "late" : "progress";
}

// ---- Photos ----

/** A sample site photo, filling its tile with rounded corners. */
export function PhotoTile({ kind, className = "", decorative = false }: { kind: PhotoKind; className?: string; decorative?: boolean }) {
  return (
    <span className={`site-photo ${className}`} aria-hidden={decorative ? true : undefined}>
      <SamplePhoto kind={kind} tag={false} />
    </span>
  );
}

// ---- Layout ----

/** A panel's head: a short title, an optional count, and one quiet link or control at the right. */
export function PanelHead({
  id,
  title,
  icon,
  count,
  children,
}: {
  id?: string;
  title: string;
  icon?: IconName;
  count?: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-1">
      <h2 id={id} className="flex items-center gap-2 text-17 font-semibold text-ink">
        {icon && <Icon name={icon} className="size-5 text-laterite" />}
        {title}
        {count !== undefined && <CountPill n={count} />}
      </h2>
      {children}
    </div>
  );
}

/** A small filled count beside a heading, so it never reads as part of the title. */
export function CountPill({ n }: { n: number }) {
  return (
    <span className="inline-grid h-6 min-w-6 place-items-center rounded-full bg-ink/10 px-2 text-13 font-semibold tabular-nums text-ink">
      {n}
    </span>
  );
}

export type StatItem = {
  icon: IconName;
  label: string;
  value: number | string;
  alert?: boolean;
  /** Opens the list the number counts. */
  href?: string;
};

/** A few numbers in one glass panel: an icon, the number, two words. Two by two on a phone. */
const STRIP_COLS: Record<number, string> = {
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "md:grid-cols-5",
};

/** A number or an amount is set as a figure; a word ("Yesterday", "None") as plain text. */
function isWord(value: number | string): boolean {
  return typeof value === "string" && /^[A-Za-z]/.test(value);
}

export function StatStrip({ label, items }: { label: string; items: StatItem[] }) {
  return (
    <section aria-label={label} className={`glass grid grid-cols-2 gap-1 p-1.5 ${STRIP_COLS[items.length] ?? "sm:grid-cols-4"}`}>
      {items.map((s, i) => {
        const odd = items.length % 2 === 1 && i === items.length - 1;
        const span = odd ? (items.length === 5 ? "max-md:col-span-2" : "max-sm:col-span-2") : "";
        const body = (
          <>
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-full ${s.alert ? "bg-brick/10 text-brick" : "bg-ink/5 text-laterite"} ${
                // Five in one row on a tablet leave no room for the icon beside the words.
                items.length === 5 ? "md:max-lg:hidden" : ""
              }`}
            >
              <Icon name={s.icon} className="size-4.5" />
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span
                className={`flex min-h-6 items-center leading-none ${isWord(s.value) ? "text-17 font-semibold" : "figure text-22"} ${
                  s.alert ? "late-text" : "text-ink"
                }`}
              >
                {s.value}
              </span>
              <span className="truncate text-13 text-ink-soft">{s.label}</span>
            </span>
          </>
        );
        const box = `flex min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2.5 sm:px-3 ${span}`;
        return s.href ? (
          <Link key={s.label} href={s.href} className={`${box} transition-colors duration-150 hover:bg-white/50`}>
            {body}
          </Link>
        ) : (
          <div key={s.label} className={box}>
            {body}
          </div>
        );
      })}
    </section>
  );
}

/** A row of filter buttons with counts, one pressed. On a phone it stays one row and scrolls
 *  sideways, fading at the right edge; from 640 px the glass bar is only as wide as its buttons. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  end,
}: {
  label: string;
  options: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  /** A quiet status at the right end of the bar. */
  end?: ReactNode;
}) {
  const row =
    "flex min-w-0 snap-x gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
    "max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-1.5rem),transparent)] sm:flex-wrap sm:overflow-visible";
  const group = (
    <div role="group" aria-label={label} className={end ? row : `glass w-full max-w-full p-1.5 sm:w-fit ${row}`}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`flex min-h-11 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-15 font-semibold transition-colors ${
              on ? "bg-rosewood text-lime" : "text-ink hover:bg-white/50"
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={`text-13 font-medium tabular-nums ${on ? "text-lime/75" : "text-ink-soft"}`}>{o.count}</span>
            )}
          </button>
        );
      })}
      {/* Room under the fade, so the last button scrolls clear of it. */}
      <span aria-hidden="true" className="w-4 shrink-0 sm:hidden" />
    </div>
  );
  if (!end) return group;
  return (
    <div className="glass flex w-full max-w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 p-1.5 sm:w-fit">
      {group}
      <div className="flex flex-wrap items-center gap-2 px-2 py-1">{end}</div>
    </div>
  );
}

// ---- Requests: where one stands ----

/** The four steps every request passes, the same words for the site and procurement. */
export const REQUEST_STEP_WORDS = ["Sent", "Seen", "PO sent", "Delivered"] as const;

/** A request's four steps with their dates: a tick on each one reached. */
export function RequestSteps({ r }: { r: RequestView }) {
  const firstPo = r.pos.map((po) => po.at).sort()[0];
  const dates = [r.queued ? undefined : r.sentAt || r.at, r.seenAt ?? firstPo, firstPo, r.deliveredAt];
  const reached = dates.filter(Boolean).length;
  return (
    <ol className="grid grid-cols-4" aria-label="Progress">
      {REQUEST_STEP_WORDS.map((label, i) => {
        const at = dates[i];
        const done = Boolean(at);
        return (
          <li key={label} className="relative grid justify-items-center gap-1.5 text-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-3.5 right-1/2 -left-1/2 h-0.5 ${i < reached ? "bg-kota" : "bg-ink/15"}`}
              />
            )}
            <span
              className={`relative grid size-7 place-items-center rounded-full border-2 ${
                done ? "border-kota bg-kota text-paper" : "border-ink/20 bg-white/70 text-ink-soft"
              }`}
            >
              {done ? <Icon name="check" className="size-4" /> : <span className="text-13 font-semibold tabular-nums">{i + 1}</span>}
            </span>
            <span className="text-13 font-semibold text-ink">
              {label}
              <span className="sr-only">{done ? ", done" : ", to come"}</span>
            </span>
            <span className="text-13 text-ink-soft">{at ? formatShortDate(at) : "—"}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** One fact in a details list: a quiet label at the left, its value at the right. */
export function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="glass-row flex min-h-11 items-center justify-between gap-3 px-3 py-2">
      <dt className="shrink-0 text-13 text-ink-soft">{label}</dt>
      <dd className="min-w-0 text-right text-15 text-ink">{children}</dd>
    </div>
  );
}

// ---- Dates ----

/** "9–14 Nov", "30 Nov – 3 Dec", or "19 Dec" for one day. */
export function dateSpan(from: string, to: string): string {
  if (from === to) return formatShortDate(from);
  const a = formatShortDate(from);
  const b = formatShortDate(to);
  const [da, ma] = a.split(" ");
  const [db, mb] = b.split(" ");
  return ma === mb ? `${da}–${db} ${mb}` : `${a} – ${b}`;
}

/** "Today", "Tomorrow", "In 5 d", "3 d ago". */
export function dayWords(iso: string): string {
  const d = daysBetween(TODAY, datePart(iso));
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  return d > 0 ? `In ${d} d` : `${-d} d ago`;
}

// ---- Tasks ----

/** Who looks after a task: the person the plan gives it to, else the site's lead engineer. */
export function ownerOf(task: SiteTaskView, firm: Firm): PersonId | undefined {
  return task.assignee ?? firm.project(task.projectId)?.team.engineers[0];
}

/** A task is someone's when the plan gives it to them, or when they run a crew on it. */
export function isMine(task: SiteTaskView, person: PersonId): boolean {
  return task.assignee === person || task.workOrders.some((w) => w.by === person);
}

/** Late, or waiting on something: a drawing, a crew, a delivery. */
export function heldUp(task: SiteTaskView): boolean {
  return task.state !== "done" && (task.late || task.blockers.length > 0);
}

/** A task the site should look at now: under way, late, blocked, or starting within ten days. */
export function isNow(task: SiteTaskView): boolean {
  if (task.state === "done") return false;
  if (task.state === "in-progress" || task.late || task.blockers.length > 0) return true;
  return daysBetween(TODAY, task.plannedStart) <= 10;
}

/** Most pressing first: late, then under way, then by start. Done ones last. */
export function byUrgency(a: SiteTaskView, b: SiteTaskView): number {
  const rank = (t: SiteTaskView) => (t.state === "done" ? 3 : t.late || t.blockers.length > 0 ? 0 : t.state === "in-progress" ? 1 : 2);
  return rank(a) - rank(b) || a.plannedStart.localeCompare(b.plannedStart) || a.title.localeCompare(b.title);
}

/** The link that opens the request form filled for one planned material. */
export function requestHref(task: SiteTaskView, m?: TaskMaterialView): string {
  const q = new URLSearchParams({ task: task.id });
  if (m) {
    q.set("m", m.material);
    q.set("sub", m.sub);
    q.set("qty", String(m.qty));
    q.set("need", m.neededBy);
  }
  return `/staff/site/request?${q.toString()}`;
}

export type Summary = { words: string; tone: Tone };

export function materialSummary(ms: TaskMaterialView[], firm?: Firm): Summary | null {
  if (ms.length === 0) return null;
  const toRequest = ms.filter((m) => m.status === "to-request");
  if (toRequest.length > 0) return { words: `${toRequest.length} to request`, tone: toRequest.some((m) => m.short) ? "late" : "waiting" };
  const sent = ms.filter((m) => m.status === "in-procurement");
  if (sent.length > 0) {
    // Procurement has not opened any of them yet: say so, so a slow answer shows.
    const unseen = firm ? sent.every((m) => !requestOf(m, firm)?.seenAt) : false;
    return { words: unseen ? NOT_SEEN : "In procurement", tone: "waiting" };
  }
  if (ms.some((m) => m.status === "po-sent")) return { words: "PO sent", tone: "progress" };
  return { words: "Delivered", tone: "done" };
}

export function labourSummary(task: SiteTaskView): Summary | null {
  const open = task.workOrders.filter((w) => w.status !== "done");
  const w = open[0] ?? task.workOrders[task.workOrders.length - 1];
  return w ? { words: w.statusWords, tone: w.tone } : null;
}

export function drawingSummary(task: SiteTaskView): Summary | null {
  if (task.drawings.length === 0) return null;
  const late = task.drawings.filter((d) => d.status === "awaited" && d.daysLate > 0);
  if (late.length > 0) return { words: `${late[0].sheet} ${late[0].daysLate} d late`, tone: "late" };
  if (task.drawings.some((d) => d.status === "awaited")) return { words: "Awaited", tone: "waiting" };
  return { words: "Received", tone: "done" };
}

/** The request a material line was sent on, if any. */
function requestOf(m: TaskMaterialView, firm: Firm): RequestView | undefined {
  return m.requestNo ? firm.requests.find((r) => r.no === m.requestNo) : undefined;
}

/** A material line's chip: "Not seen" while procurement has not opened its request. */
export function materialChip(m: TaskMaterialView, firm: Firm): Summary {
  if (m.status === "in-procurement") {
    const r = requestOf(m, firm);
    if (r && !r.queued) return requestStatus(r);
  }
  return { words: m.statusWords, tone: m.tone };
}

/** A resource line under a task title: its icon, its name for a screen reader, and its status. */
export function ResourceBadge({ icon, name, summary }: { icon: IconName; name: string; summary: Summary }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-soft">
      <Icon name={icon} className="size-4.5" />
      <span className="sr-only">{name}:</span>
      <StatusChip tone={summary.tone}>{summary.words}</StatusChip>
    </span>
  );
}

// ---- Requests ----

/** How a request stands, in the words and tone of a chip. */
export function requestStatus(r: RequestView): Summary {
  if (r.queued) return { words: "Not sent", tone: "locked" };
  if (r.status === "Delivered") return { words: "Delivered", tone: "done" };
  if (r.status === "PO uploaded") return { words: "PO sent", tone: "progress" };
  if (r.status === "PO in part") return { words: "PO in part", tone: "progress" };
  const tone: Tone = procurementDays(r) > 3 ? "late" : "waiting";
  // Sent but not yet opened by procurement; "In procurement" once it is seen.
  return { words: r.seenAt ? "In procurement" : NOT_SEEN, tone };
}

export const NOT_SEEN = "Not seen";

/** Sent and not delivered: what procurement is answering for on this site. */
export function isOpenRequest(r: RequestView): boolean {
  return !r.queued && r.status !== "Delivered";
}

/** Days from sending to the first PO, or to today while there is none: how quickly procurement answered. */
export function procurementDays(r: RequestView): number {
  const sent = datePart(r.sentAt || r.at);
  const firstPo = r.pos.map((po) => datePart(po.at)).sort()[0];
  return Math.max(0, daysBetween(sent, firstPo ?? TODAY));
}

/** The request's main material, said short: "Steel 12 mm". */
export function requestTitle(r: RequestView, firm: Firm): string {
  const first = r.lines[0];
  const item = firm.catalogueAll.find((c) => c.id === first.material);
  const name = (item?.name ?? first.material).replace(/\s*\(.*\)$/, "");
  const more = r.lines.length - 1;
  return `${name} ${first.sub}${more > 0 ? ` +${more}` : ""}`;
}

/** The site task a request was raised for, if any. */
export function taskOfRequest(r: RequestView, firm: Firm, projectId: ProjectId): SiteTaskView | undefined {
  const stage = firm.siteStage(projectId);
  return siteTasksOf(stage).find((t) => t.id === r.taskId || t.materials.some((m) => m.requestNo === r.no));
}

/** The milestone in hand's tasks, then the next milestone's. */
export function siteTasksOf(stage: SiteStageView | null): SiteTaskView[] {
  return stage ? [...stage.tasks, ...(stage.next?.tasks ?? [])] : [];
}

// ---- Gates ----

/** Whether a milestone waits on its own instalment (milestone n opens with instalment n). */
export function stageLock(firm: Firm, projectId: ProjectId, n: number): { locked: boolean; blockedBy: number | null } {
  const site = firm.siteStage(projectId);
  if (site && site.n === n) return { locked: site.locked, blockedBy: site.blockedBy };
  if (site?.next && site.next.n === n) return { locked: site.next.locked, blockedBy: site.next.blockedBy };
  const stage = firm.plan(projectId)?.stages.find((s) => s.milestone === n);
  return { locked: stage?.locked ?? false, blockedBy: stage?.locked ? n : null };
}

/** "Instalment 5 not in", for a lock chip or a disabled button. */
export function lockWords(blockedBy: number | null): string {
  return blockedBy !== null ? `Instalment ${blockedBy} not in` : "Instalment not in";
}

/** The rows that need a site engineer, less any "Mark stage done" for a milestone still locked by its instalment. */
export function openTurns<T extends { id: string }>(items: T[], firm: Firm): T[] {
  return items.filter((item) => {
    const m = /^stage:([^:]+):(\d+)$/.exec(item.id);
    return !m || !stageLock(firm, m[1] as ProjectId, Number(m[2])).locked;
  });
}

// ---- Photos ----

/** Site photos should go up at least this often. */
export const PHOTO_EVERY_DAYS = 3;

/** When this person last posted site photos on a project: "Today", "3 d ago", or null for never. */
export function lastPhotos(firm: Firm, projectId: ProjectId, person: PersonId): { words: string; days: number } | null {
  const last = firm.posts
    .filter((p) => p.projectId === projectId && p.by === person && (p.photos.length > 0 || (p.files?.length ?? 0) > 0))
    .map((p) => p.at)
    .sort()
    .pop();
  if (!last) return null;
  return { words: dayWords(last), days: Math.max(0, daysBetween(datePart(last), TODAY)) };
}
