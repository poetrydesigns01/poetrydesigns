"use client";

import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { CategoryId, Template } from "@/lib/firm-data";
import { datePart, formatShortDate, formatTime, inr } from "@/lib/format";
import { milestoneStage } from "@/lib/workflow-template";
import { templateChangeWords, templatesOf, type TemplateView } from "./admin-data";

// A category template: the rate per sq ft (the one thing the admin edits here), the sign-up
// share, the ten instalments at the agreed split with the milestone each opens (names and
// contents read from the workflow, so payments and milestones always agree), and the Part B
// items. The strip draws each share to scale. New projects only.

const r1 = (v: number) => Math.round(v * 10) / 10;

/** The schedule as one strip, each cell as wide as its percentage of the contract. */
function ShareStrip({ shares }: { shares: { percent: number }[] }) {
  const w = 600;
  const h = 28;
  const gap = 2;
  const total = Math.max(
    100,
    shares.reduce((sum, s) => sum + s.percent, 0),
  );
  const cells: { x: number; w: number }[] = [];
  let x = 0;
  for (const s of shares) {
    const cw = Math.max((s.percent / total) * w - gap, 0);
    cells.push({ x, w: cw });
    x += cw + gap;
  }
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className="block h-auto w-full max-w-[600px]"
      aria-hidden="true"
      focusable="false"
    >
      {cells.map((c, i) => (
        <rect
          key={i}
          x={r1(c.x)}
          y={0}
          width={r1(c.w)}
          height={h}
          style={{ fill: i === 0 ? "var(--color-rosewood)" : "var(--color-laterite)" }}
        />
      ))}
      {x < w && (
        <rect
          x={r1(x)}
          y={1}
          width={r1(w - x - 1)}
          height={h - 2}
          vectorEffect="non-scaling-stroke"
          style={{ fill: "none", stroke: "var(--color-ink-soft)", strokeWidth: 1, strokeDasharray: "4 3" }}
        />
      )}
    </svg>
  );
}

function totalWords(total: number): string {
  if (total === 100) return "Adds to 100%.";
  if (total < 100) return `Adds to ${total}%. ${100 - total}% left to place.`;
  return `Adds to ${total}%. ${total - 100}% too much.`;
}

export function TemplatesTab() {
  const demo = useDemo();
  const firm = useFirm();
  const views = useMemo(() => templatesOf(firm.templates, demo.events), [firm.templates, demo.events]);
  const [chosen, setChosen] = useState<CategoryId>("city-villa");
  const view = views.find((t) => t.id === chosen) ?? views[0];

  // The category is chosen in the editor's own header, so the page keeps one row of tabs.
  const chooser = (
    <label className="block">
      <span className="sr-only">Category</span>
      <select
        className={`${field} w-auto min-w-44 cursor-pointer font-semibold`}
        value={chosen}
        onChange={(e) => setChosen(e.target.value as CategoryId)}
      >
        {views.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );

  /* Keyed by the template and its last change, so a saved template starts a fresh draft. */
  return <TemplateEditor key={`${view.id}-${view.changed?.at ?? "seed"}`} view={view} chooser={chooser} />;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`size-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

function TemplateEditor({ view, chooser }: { view: TemplateView; chooser: ReactNode }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const ids = useId();
  const [draft, setDraft] = useState<Template>(() => ({ ...view, milestones: view.milestones.map((m) => ({ ...m })) }));
  const [error, setError] = useState("");
  const [opened, setOpened] = useState<number[]>([]);
  const toggle = (n: number) => setOpened((o) => (o.includes(n) ? o.filter((x) => x !== n) : [...o, n]));

  const total =
    draft.signUpPercent + draft.milestones.reduce((sum, m) => sum + (Number.isFinite(m.percent) ? m.percent : 0), 0);
  const change = templateChangeWords(view, draft);
  const ready = total === 100 && change !== null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    if (total !== 100) {
      setError(`The shares must add to 100% before it can be saved. ${totalWords(total)}`);
      return;
    }
    if (!change) {
      setError("Nothing has been changed yet.");
      return;
    }
    setError("");
    pause.start({
      what: `The ${draft.name} template`,
      commit: () => {
        // The whole template after the change, Part B included, so the firm takes it as it is.
        const saved: TemplateView = { ...draft, milestones: draft.milestones.map((m) => ({ ...m })) };
        delete saved.changed;
        demo.record({ kind: "template.changed", templateId: draft.id, change, template: saved, by: "shalini" });
      },
    });
  };

  return (
    <form onSubmit={submit} className="glass-strong grid gap-5 p-4 sm:p-5" aria-label={`${view.name} template`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {chooser}
        <span className="flex flex-wrap gap-1.5">
          <StatusChip tone="locked">New projects only</StatusChip>
          {view.changed && (
            <StatusChip tone="done">
              {firm.person(view.changed.by)?.first}, {formatShortDate(datePart(view.changed.at))} {formatTime(view.changed.at)}
            </StatusChip>
          )}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${ids}-rate`} className="block text-15 font-semibold">
            Rate per sq ft, before GST
          </label>
          <span className="mt-1.5 flex items-center gap-2">
            <span className="text-17">₹</span>
            <input
              id={`${ids}-rate`}
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              className={field}
              value={draft.ratePerSqFt}
              onChange={(e) => {
                setError("");
                setDraft({ ...draft, ratePerSqFt: Math.max(0, Math.round(Number(e.target.value) || 0)) });
              }}
            />
          </span>
        </div>
        <div className="glass-inner self-end px-3 py-2">
          <p className="lettering text-ink-soft">Sign-up</p>
          <p className="figure text-17">{draft.signUpPercent}%</p>
        </div>
      </div>

      <section aria-label="Instalments" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-15 font-semibold">Instalments</h3>
          <StatusChip tone="locked">From the workflow</StatusChip>
        </div>
        <ol className="glass-inner grid px-2">
          {draft.milestones.map((m) => {
            const open = opened.includes(m.n);
            const coversId = `${ids}-covers-${m.n}`;
            // Names and contents are the workflow's own, so payments and milestones agree.
            const name = milestoneStage(m.n)?.short ?? m.name;
            return (
              <li
                key={m.n}
                className="grid grid-cols-[2rem_minmax(0,1fr)_auto_auto] items-center gap-x-2 border-b border-ink/10 py-1.5 last:border-b-0 sm:gap-x-3"
              >
                <span className="figure text-center text-15 text-ink-soft">M{m.n}</span>
                <span className="min-w-0 truncate text-15">{name}</span>
                <span className="figure text-15">{Number.isFinite(m.percent) ? m.percent : 0}%</span>
                <button
                  type="button"
                  className="inline-grid size-11 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors duration-150 hover:bg-white/60 hover:text-ink"
                  aria-expanded={open}
                  aria-controls={open ? coversId : undefined}
                  aria-label={`What ${name} covers`}
                  onClick={() => toggle(m.n)}
                >
                  <Chevron open={open} />
                </button>
                {open && (
                  <p id={coversId} className="col-span-4 pb-1 text-13 text-ink-soft sm:col-start-2 sm:col-span-3">
                    {m.covers || "–"}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        <ShareStrip shares={[{ percent: draft.signUpPercent }, ...draft.milestones]} />
      </section>

      <section aria-label="Part B" className="grid gap-2">
        <h3 className="text-15 font-semibold">Part B</h3>
        <ul className="glass-inner grid px-3">
          {draft.partB.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink/10 py-2 last:border-b-0"
            >
              <span className="text-15">{item.name}</span>
              <span className="text-15 text-ink-soft">{item.formula}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-2">
        {error && (
          <p className="text-15 font-semibold text-brick" role="alert">
            {error}
          </p>
        )}
        <div>
          <button
            type="submit"
            className="btn btn-primary min-h-12 w-full sm:w-auto"
            aria-disabled={!ready || pause.pending !== null ? true : undefined}
          >
            Save the {draft.name.toLowerCase()} template
          </button>
        </div>
        {change && (
          <p className="lettering text-ink-soft">{change.replace(/^Changed the .+ template: /, "To save: ")}</p>
        )}
        {!change && (
          <p className="lettering text-ink-soft">Rate {inr(draft.ratePerSqFt)} per sq ft. Nothing changed yet.</p>
        )}
      </div>
    </form>
  );
}
