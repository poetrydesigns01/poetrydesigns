"use client";

import { PlotOutline } from "@/components/instruments/plot-outline";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { TODAY } from "@/lib/demo-data";
import { useFirm } from "@/lib/demo-store";
import { ageWords, daysSince } from "@/lib/firm";
import { countWord, formatDate } from "@/lib/format";
import { draftName } from "./bd-words";

// Onboard: the workspaces being set up, each a plot with a stake for every step saved, and
// the ones opened, with their stamp. A new client starts from the board.

export function OnboardList() {
  const firm = useFirm();
  const drafts = firm.drafts.filter((d) => d.by === "rohan");
  const working = drafts.filter((d) => !d.opened && d.stepsDone > 0);
  const opened = drafts.filter((d) => d.opened);
  const n = working.length;

  return (
    <>
      <StaffBoard
        place="Onboard"
        headline={n === 0 ? "Nothing is being set up." : `${countWord(n, true)} ${n === 1 ? "project is" : "projects are"} being set up.`}
        state="A signed client gets a workspace in four steps: client and site, estimate, agreement, team."
        primary={{ label: "Start a new project", href: "/staff/bd/onboard/new" }}
        chip={false}
      />
      <div className="mt-8 grid max-w-[60rem] gap-10">
        <Register title="Being set up" empty="Nothing is being set up. Start a new project when a client signs.">
          {working.map((d) => (
            <RegisterRow
              key={d.id}
              id={`draft:${d.id}`}
              margin={ageWords(daysSince(d.startedAt || TODAY))}
              title={draftName(d)}
              sentence={`${d.stepsDone} of 4 steps done. ${d.missing}`}
              href={`/staff/bd/onboard/${d.id}`}
              instrument={<PlotOutline pegs={d.stepsDone as 0 | 1 | 2 | 3 | 4} size={72} />}
              stamps={firm.stampsFor(`draft:${d.id}`)}
            />
          ))}
        </Register>
        <Register title="Opened">
          {opened.map((d) => (
            <RegisterRow
              key={d.id}
              id={`draft:${d.id}`}
              margin={ageWords(daysSince(d.openedAt || TODAY))}
              title={draftName(d)}
              sentence={`Opened ${d.openedAt ? formatDate(d.openedAt) : "today"}. The client has been invited.`}
              href={`/staff/bd/onboard/${d.id}`}
              instrument={<PlotOutline pegs={4} size={72} />}
              stamps={firm.stampsFor(`draft:${d.id}`)}
            />
          ))}
        </Register>
      </div>
    </>
  );
}
