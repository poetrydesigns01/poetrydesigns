"use client";

import Link from "next/link";
import { SampleTag } from "@/components/register/sample-tag";
import { StaffBoard } from "@/components/register/staff-board";
import { useFirm } from "@/lib/demo-store";
import type { ProjectView } from "@/lib/firm";
import { inr, inrDelta, inrSigned, percent } from "@/lib/format";
import { dayWords, healthWords, worstFirst } from "./admin-data";
import { CourseTrench } from "./course-trench";

// The profit view, built to answer one question first: which projects lose money. Each
// project leads with its course and trench (the margin so far laid above the ground line,
// the cash it is short dug below it), all at one scale, and its health in words. Losing
// projects come first, then those short of cash. Then the figures, all before GST: contract
// value, work done, costs so far, margin so far, received, spent and the cash position.
// One ruled table from 1280 px; narrower, each project stacks into plain sentences.

function History({ p }: { p: ProjectView }) {
  return (
    <details className="mt-1 text-left">
      <summary className="lettering inline-flex min-h-11 min-w-11 cursor-pointer items-center text-ink-soft underline decoration-1 underline-offset-4">
        History
      </summary>
      <ul className="grid gap-1 pb-2 text-15">
        {p.valueHistory.map((step, i) => (
          <li key={`${step.label}-${i}`}>
            {step.label}, {i === 0 ? inr(step.amount) : inrDelta(step.amount)}
            {step.at ? `, ${dayWords(step.at)}` : ""}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** A word joiner after the minus sign keeps it on the same line as its figure. */
function nowrap(figure: string): string {
  return figure.replace(String.fromCharCode(0x2212), String.fromCharCode(0x2212, 0x2060));
}

/** Whether a row's health needs the owner: losing money, or short of cash. */
function troubled(p: ProjectView): boolean {
  return p.margin !== null && p.phase !== "handed-over" && (p.margin < 0 || p.cash < 0);
}

export function ProfitTable() {
  const firm = useFirm();
  const rows = worstFirst(firm.projects.filter((p) => p.phase !== "draft").map((p) => ({ p })));
  const n = rows.length;
  // One scale for every drawing, so a deep trench reads as deep beside a shallow one.
  const scale = Math.max(1, ...rows.flatMap(({ p }) => [Math.abs(p.margin ?? 0), Math.abs(p.cash)]));

  const head = "whitespace-nowrap px-2 py-2 align-bottom text-15 font-semibold";
  const th = `${head} text-right`;
  const td = "px-2 py-3 text-right align-top";
  const fig = "figure block whitespace-nowrap text-17";
  const sub = "block whitespace-nowrap text-15 text-ink-soft";

  return (
    <>
      <StaffBoard
        place="Projects"
        headline={`Profit across ${n} projects.`}
        state="Before GST. Margin is worked out on the work done so far."
        chip={false}
      />

      <section aria-label="Profit by project" className="mt-8">
        <h2 className="register-title flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span>Losing money first</span>
          <SampleTag>Definition to confirm</SampleTag>
        </h2>

        {/* From 1280 px, where all eight columns fit: one ruled table. */}
        <div className="hidden xl:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-sand">
                <th scope="col" className={`${head} pl-0 text-left`}>
                  Project
                </th>
                <th scope="col" className={th}>
                  Contract value
                </th>
                <th scope="col" className={th}>
                  Work done
                </th>
                <th scope="col" className={th}>
                  Costs so far
                </th>
                <th scope="col" className={th}>
                  Margin so far
                </th>
                <th scope="col" className={th}>
                  Received
                </th>
                <th scope="col" className={th}>
                  Spent
                </th>
                <th scope="col" className={th}>
                  Cash
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p }) => {
                const alert = troubled(p);
                return (
                  <tr key={p.id} className="border-b border-sand">
                    <th scope="row" className="w-56 min-w-56 py-3 pr-2 text-left align-top font-normal">
                      <CourseTrench
                        margin={p.margin}
                        cash={p.cash}
                        inDesign={p.margin === null}
                        scale={scale}
                        width={120}
                        height={64}
                      />
                      <Link
                        href={`/staff/projects/${p.id}/money`}
                        className="link mt-2 block whitespace-nowrap text-17 font-semibold"
                      >
                        {p.name}
                      </Link>
                      <span className={`block text-17 ${alert ? "font-semibold" : "text-ink-soft"}`}>
                        {healthWords(p, p)}
                      </span>
                    </th>
                    <td className={td}>
                      <span className={fig}>{inr(p.contractValue)}</span>
                      {p.valueHistory.length > 1 && <History p={p} />}
                    </td>
                    {p.margin === null ? (
                      <td colSpan={3} className="px-2 py-3 align-top text-17 text-ink-soft">
                        In design. The margin is worked out once building starts.
                      </td>
                    ) : (
                      <>
                        <td className={td}>
                          <span className={fig}>{inr(p.workDone)}</span>
                          <span className={sub}>{p.workDonePercent}% of the house</span>
                        </td>
                        <td className={td}>
                          <span className={fig}>{inr(p.costs)}</span>
                        </td>
                        <td className={td}>
                          <span className={`${fig} ${p.margin < 0 ? "font-semibold" : ""}`}>{inrSigned(p.margin)}</span>
                          <span className={sub}>{percent(p.marginPercent ?? 0)}</span>
                        </td>
                      </>
                    )}
                    <td className={td}>
                      <span className={fig}>{inr(p.received)}</span>
                    </td>
                    <td className={td}>
                      <span className={fig}>{inr(p.spent)}</span>
                    </td>
                    <td className={td}>
                      <span className={`${fig} ${p.cash < 0 ? "font-semibold" : ""}`}>{inrSigned(p.cash)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Narrower: each project stacks. On a phone the drawing stands at the right of the name;
            from 768 px it leads the row, as in the table, with the figures beside it. */}
        <ul className="xl:hidden">
          {rows.map(({ p }) => (
            <li
              key={p.id}
              className="grid gap-1 border-b border-sand py-4 md:grid-cols-[120px_minmax(0,1fr)] md:gap-x-8"
            >
              <div className="flex items-start justify-between gap-4 md:contents">
                <div className="min-w-0 md:col-start-2 md:row-start-1">
                  <Link
                    href={`/staff/projects/${p.id}/money`}
                    className="link inline-flex min-h-11 items-center text-17 font-semibold"
                  >
                    {p.name}
                  </Link>
                  <p className={`text-17 ${troubled(p) ? "font-semibold" : ""}`}>{healthWords(p, p)}</p>
                </div>
                <CourseTrench
                  margin={p.margin}
                  cash={p.cash}
                  inDesign={p.margin === null}
                  scale={scale}
                  width={120}
                  height={64}
                  className="md:col-start-1 md:row-span-3 md:row-start-1 md:mt-1"
                />
              </div>
              <p className="max-w-[56ch] text-15 text-ink-soft md:col-start-2">
                Contract {inr(p.contractValue)}.{" "}
                {p.margin === null
                  ? "In design."
                  : `Work done ${inr(p.workDone)}, ${p.workDonePercent}%. Costs so far ${inr(p.costs)}. Margin so far ${nowrap(inrSigned(p.margin))}, ${percent(p.marginPercent ?? 0)}.`}
              </p>
              <p className="max-w-[56ch] text-15 text-ink-soft md:col-start-2">
                Received {inr(p.received)}, spent {inr(p.spent)}, cash{" "}
                <span className="whitespace-nowrap">{inrSigned(p.cash)}</span>.
              </p>
              {p.valueHistory.length > 1 && (
                <div className="md:col-start-2">
                  <History p={p} />
                </div>
              )}
            </li>
          ))}
        </ul>

        <details className="mt-4 max-w-[68ch]">
          <summary className="lettering inline-flex min-h-11 cursor-pointer items-center underline decoration-1 underline-offset-4">
            How the figures are worked out
          </summary>
          <p className="max-w-[56ch] text-15 text-ink-soft">
            Work done counts every milestone built, the sign-up included. Costs so far are bills plus orders not yet
            billed. Margin so far is work done less costs so far. Received counts payments and hours bought; cash is
            received less spent. In each drawing the left course is the margin so far and the right one the cash: laid
            above the line when it is in hand, dug below it when it is short.
          </p>
        </details>
      </section>
    </>
  );
}
