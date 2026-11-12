"use client";

import { ProgrammeStrip } from "@/components/instruments/programme-strip";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { TODAY } from "@/lib/demo-data";
import { useFirm } from "@/lib/demo-store";
import { ageWords } from "@/lib/firm";
import { formatDate } from "@/lib/format";
import { monthName, phaseMargin, pipeline, signInWords, THIS_MONTH } from "./bd-words";

// The pipeline Rohan built: every project he onboarded, where it stands, and whether the
// client has signed in. Each opened workspace is one onboarded client, the billing event,
// so the foot counts them by month.

export function BdProjects() {
  const firm = useFirm();
  const projects = pipeline(firm.projects);
  const thisMonth = projects.filter((p) => (p.onboardedOn ?? "").startsWith(THIS_MONTH)).length;

  // This year's onboardings by month, newest first: "November 2026: 1. October: 1."
  const year = TODAY.slice(0, 4);
  const months = new Map<string, number>();
  for (const p of projects) {
    const month = (p.onboardedOn ?? "").slice(0, 7);
    if (month.startsWith(year)) months.set(month, (months.get(month) ?? 0) + 1);
  }
  const monthLine = [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, n], i) => `${monthName(`${month}-01`)}${i === 0 ? ` ${year}` : ""}: ${n}.`)
    .join(" ");

  return (
    <>
      <StaffBoard
        place="Projects"
        headline={`${projects.length} projects, ${thisMonth} onboarded in ${monthName(TODAY)}.`}
        state="Every workspace you opened, newest first. Each one opens on its project record."
        chip={false}
      />
      <div className="mt-8 grid max-w-[60rem] gap-10">
        <Register title="Your projects" limit={12} empty="No projects onboarded yet.">
          {projects.map((p) => {
            const { margin, sub } = phaseMargin(p);
            // "Invited" over how long ago; the sentence says it is not signed in yet.
            const invited = p.phase === "invited" && !p.clientSignedInOn;
            return (
              <RegisterRow
                key={p.id}
                id={`project:${p.id}`}
                margin={margin}
                marginSub={invited ? ageWords(p.daysAtStage) : sub}
                title={p.name}
                sentence={`Onboarded ${p.onboardedOn ? formatDate(p.onboardedOn) : "before the portal"}. ${signInWords(p)}`}
                href={`/staff/projects/${p.id}`}
                instrument={<ProgrammeStrip cells={p.strip} size={120} />}
              />
            );
          })}
        </Register>
        {monthLine && (
          <section aria-labelledby="bd-months">
            <h2 id="bd-months" className="text-17 font-semibold">
              Onboarded this year
            </h2>
            <p className="mt-1 text-17">{monthLine}</p>
            <details className="mt-2 text-15">
              <summary className="link inline-flex min-h-11 cursor-pointer items-center">How clients are counted</summary>
              <p className="max-w-[60ch] text-ink-soft">
                Each new workspace counts as one onboarded client, in the month it was opened.
              </p>
            </details>
          </section>
        )}
      </div>
    </>
  );
}
