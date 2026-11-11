"use client";

import { PageBand, Section, Status } from "@/components/page-band";
import { contacts, credits } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";
import { formatDate, hours } from "@/lib/format";

export default function HoursPage() {
  const { creditsRequested, requestCredits } = useDemo();
  const { preConstruction, construction, entries } = credits;
  const constructionLeft = construction.granted - construction.used;
  const contact = contacts[0].name.split(" ")[0];

  return (
    <>
      <PageBand
        title="Consultation hours"
        lede="Your home includes 20 hours of one-to-one time with your architect and engineers: 12 before construction and 8 during it. One credit is one hour."
      />

      <Section title="Where your hours stand">
        <div className="grid gap-x-16 gap-y-10 border-t border-ink pt-8 md:grid-cols-2">
          <HoursMeter title="Before construction" granted={preConstruction.granted} used={preConstruction.used} note="This allowance closed when construction began." />
          <HoursMeter
            title="During construction"
            granted={construction.granted}
            used={construction.used}
            note="For decisions on site, such as electrical points, plumbing and railings."
            warn={constructionLeft <= 3}
          />
        </div>

        <div className="mt-10 bg-sand-2 p-5 sm:p-7">
          {creditsRequested ? (
            <p className="reveal text-[1.125rem]">
              <Status tone="done">Request sent.</Status> {contact} will confirm the price with you before any hours are
              added.
            </p>
          ) : (
            <div className="grid gap-x-10 gap-y-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <p className="text-[1.125rem]">
                <Status tone="due">You have {hours(constructionLeft)} left.</Status> Sessions still go ahead when the
                allowance runs out, and the extra time is charged separately. You can add hours now.
              </p>
              <button type="button" className="btn btn-primary" onClick={requestCredits}>
                Ask for more hours
              </button>
            </div>
          )}
        </div>
      </Section>

      <div className="bg-sand-2">
        <Section title="Every session so far">
          <ul className="border-t border-ink">
            {entries.map((entry) => (
              <li
                key={`${entry.date}-${entry.topic}`}
                className="grid gap-x-8 gap-y-1 border-b border-sand py-4 md:grid-cols-[8rem_minmax(0,1fr)_12rem_6rem] md:items-baseline"
              >
                <p className="text-ink-soft">{formatDate(entry.date)}</p>
                <p className="font-semibold">{entry.topic}</p>
                <p className="text-ink-soft">
                  With {entry.with}
                  <span className="md:hidden">, {entry.phase.toLowerCase()}</span>
                </p>
                <p className="figure text-[1.125rem] md:text-right">{hours(entry.hours)}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}

/** One block per credit, so the allowance can be counted at a glance. */
function HoursMeter({ title, granted, used, note, warn }: { title: string; granted: number; used: number; note: string; warn?: boolean }) {
  const left = granted - used;

  return (
    <div>
      <h3 className="text-[1.125rem] font-semibold">{title}</h3>
      <p className="mt-2">
        <span className="figure text-[2.75rem] leading-none">{left}</span>
        <span className="text-ink-soft"> of {granted} hours left</span>
      </p>
      <div
        className="mt-4 flex gap-1"
        role="img"
        aria-label={`${used} of ${granted} hours used, ${left} left`}
      >
        {Array.from({ length: granted }, (_, index) => {
          const fill = Math.max(0, Math.min(1, used - index));
          return (
            <span key={index} className="relative h-9 flex-1 overflow-hidden border border-ink/50">
              <span
                className={`absolute inset-y-0 left-0 ${warn ? "bg-brass" : "bg-rosewood"}`}
                style={{ width: `${fill * 100}%` }}
              />
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-ink-soft">
        {hours(used)} used. {note}
      </p>
    </div>
  );
}
