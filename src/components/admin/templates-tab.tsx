"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { SampleTag } from "@/components/register/sample-tag";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { CategoryId, Template } from "@/lib/firm-data";
import { datePart, formatShortDate, formatTime, inr } from "@/lib/format";
import { templateChangeWords, templatesOf, type TemplateView } from "./admin-data";

// A category template: the rate per sq ft, the 5% sign-up, ten milestones with what each
// covers and its share, and the Part B items with their formulas. The strip under the
// milestones is drawn with each cell as wide as its share, so a gap shows before the
// words say it. Saving waits until the shares add to 100%, and applies to new projects only.

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

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ChipGroup label="Category">
          {views.map((t) => (
            <Chip key={t.id} pressed={t.id === chosen} onClick={() => setChosen(t.id)}>
              {t.name}
            </Chip>
          ))}
        </ChipGroup>
      </div>
      {/* Keyed by the template and its last change, so a saved template starts a fresh draft. */}
      <TemplateEditor key={`${view.id}-${view.changed?.at ?? "seed"}`} view={view} />
    </div>
  );
}

function TemplateEditor({ view }: { view: TemplateView }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const ids = useId();
  const [draft, setDraft] = useState<Template>(() => ({ ...view, milestones: view.milestones.map((m) => ({ ...m })) }));
  const [error, setError] = useState("");

  const total =
    draft.signUpPercent + draft.milestones.reduce((sum, m) => sum + (Number.isFinite(m.percent) ? m.percent : 0), 0);
  const change = templateChangeWords(view, draft);
  const ready = total === 100 && change !== null;

  const setMilestone = (n: number, patch: Partial<Template["milestones"][number]>) => {
    setError("");
    setDraft((d) => ({ ...d, milestones: d.milestones.map((m) => (m.n === n ? { ...m, ...patch } : m)) }));
  };

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

  const cell = "px-2 py-2 align-top";

  return (
    <form onSubmit={submit} className="grid gap-6" aria-label={`${view.name} template`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="register-title flex-1">{view.name}</h2>
        <SampleTag>Sample, to be confirmed by Poetry</SampleTag>
      </div>
      {view.note && <p className="text-15 text-ink-soft">{view.note}</p>}
      {view.changed && (
        <p className="lettering text-ink-soft">
          Last changed by {firm.person(view.changed.by)?.name}, {formatShortDate(datePart(view.changed.at))} at{" "}
          {formatTime(view.changed.at)}.
        </p>
      )}

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
        <p className="self-end text-17">Sign-up, {draft.signUpPercent}% on signing the agreement.</p>
      </div>

      <section aria-label="Milestones" className="grid gap-3">
        <h3 className="text-17 font-semibold">Ten milestones</h3>
        <div className="grid border-t border-sand">
          {draft.milestones.map((m) => (
            <div
              key={m.n}
              className="border-b border-sand py-2 grid gap-2 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1.4fr)_6rem] sm:items-start sm:gap-3"
            >
              <span className={`${cell} figure text-17`}>{m.n}</span>
              <label className="block">
                <span className="sr-only">Milestone {m.n} name</span>
                <input className={field} value={m.name} onChange={(e) => setMilestone(m.n, { name: e.target.value })} />
              </label>
              <label className="block">
                <span className="sr-only">What milestone {m.n} covers</span>
                <input
                  className={`${field} text-15`}
                  value={m.covers}
                  onChange={(e) => setMilestone(m.n, { covers: e.target.value })}
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="sr-only">Milestone {m.n} share</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  className={`${field} text-right`}
                  value={Number.isFinite(m.percent) ? m.percent : ""}
                  onChange={(e) => setMilestone(m.n, { percent: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                />
                <span className="text-17">%</span>
              </label>
            </div>
          ))}
        </div>
        <ShareStrip shares={[{ percent: draft.signUpPercent }, ...draft.milestones]} />
        <p className="text-17 font-semibold" aria-live="polite">
          {totalWords(total)}
        </p>
      </section>

      <section aria-label="Part B" className="grid gap-2">
        <h3 className="text-17 font-semibold">Part B, outside the main contract</h3>
        <ul className="sheet-rows ruled">
          {draft.partB.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-17">{item.name}</span>
              <span className="text-15 text-ink-soft">{item.formula}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-2">
        <p className="text-15 text-ink-soft">Changes apply to new projects only.</p>
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
