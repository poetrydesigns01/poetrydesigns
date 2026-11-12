"use client";

import Link from "next/link";
import { ProgrammeStrip } from "@/components/instruments/programme-strip";
import { useScope } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { TurnItem } from "@/lib/firm";
import { countWord, formatDate } from "@/lib/format";
import { BoardPlot } from "./board-plot";
import { draftName, onboardedWords, phaseMargin, pipeline, THIS_MONTH } from "./bd-words";

// Rohan's Today. Which signed clients still need setting up, who has not signed in, who
// asked for hours, and how many clients were onboarded this month. The board's picture is
// the plot being set out for the draft he is working on: a stake for each step done.

function headlineFor(n: number): string {
  if (n === 0) return "Nothing needs you today, Rohan.";
  return `${countWord(n, true)} ${n === 1 ? "thing needs" : "things need"} you today, Rohan.`;
}

/** The invite row's one action: send it again, after the pause. */
function ResendInvite({ item }: { item: TurnItem }) {
  const demo = useDemo();
  const pause = usePause();
  const projectId = item.projectId;
  if (!projectId) return null;
  return (
    <button
      type="button"
      className="btn btn-quiet"
      aria-disabled={pause.pending !== null}
      onClick={(event) => {
        if (pause.pending !== null) return;
        const { record } = demo;
        pause.start({
          what: `The invite for ${item.title}, sent again`,
          origin: event.currentTarget,
          commit: () => record({ kind: "invite.resent", projectId, by: "rohan" }),
        });
      }}
    >
      Send the invite again
    </button>
  );
}

function TurnRow({ item, boardDraft }: { item: TurnItem; boardDraft?: string }) {
  const demo = useDemo();
  const kind = item.id.split(":")[0];
  let action = null;
  let sentence = item.sentence;
  if (kind === "draft") {
    // The board picture already says how many steps are done; the row says what is missing.
    sentence = sentence.replace(/^\d of 4 steps done\. /, "");
    // The board's one button already continues the draft it shows; only another draft
    // gets its own Continue here.
    if (item.id !== `draft:${boardDraft}`) {
      action = (
        <Link href={item.href} className="btn btn-quiet">
          Continue
        </Link>
      );
    }
  } else if (kind === "hours") {
    action = (
      <Link
        href={`/staff/bd/hours#${item.id}`}
        className="btn btn-quiet"
        onClick={() => demo.setFocusRow({ href: "/staff/bd/hours", id: item.id })}
      >
        Add hours
      </Link>
    );
  } else if (kind === "invite") {
    action = <ResendInvite item={item} />;
  }
  return (
    <RegisterRow
      id={item.id}
      margin={item.margin}
      marginSub={item.marginSub}
      client={item.client}
      overdue={item.overdue}
      title={item.title}
      sentence={sentence}
      figure={item.figure}
      action={action}
      stamps={item.stamps}
    />
  );
}

export function BdToday() {
  const firm = useFirm();
  const scope = useScope("bd");
  const turns = firm.turns("rohan", scope);
  const onboarded = firm.onboardedIn(THIS_MONTH).length;
  const current = scope === "all" ? null : firm.project(scope);

  // The plot on the board is the draft being set up: Kulkarni first, then a new one.
  const drafts = firm.drafts.filter((d) => d.by === "rohan");
  const working = drafts.find((d) => !d.opened && d.stepsDone > 0);
  const shown = working ?? drafts.find((d) => d.id === "kulkarni");
  const pegs = (shown ? (shown.opened ? 4 : shown.stepsDone) : 0) as 0 | 1 | 2 | 3 | 4;
  const pictureWords = shown
    ? shown.opened
      ? `${draftName(shown)}, workspace opened${shown.openedAt ? ` ${formatDate(shown.openedAt)}` : ""}.`
      : `${draftName(shown)}, ${shown.stepsDone} of 4 steps done.`
    : undefined;

  const projects = pipeline(firm.projects).filter((p) => scope === "all" || p.id === scope);
  const state = `${current ? `${current.name}. ` : ""}${onboardedWords(onboarded)}`;

  return (
    <>
      <StaffBoard
        place="Today"
        headline={headlineFor(turns.length)}
        state={state}
        primary={
          working
            ? { label: `Continue ${draftName(working)}`, href: `/staff/bd/onboard/${working.id}` }
            : { label: "Start a new project", href: "/staff/bd/onboard/new" }
        }
        picture={<BoardPlot pegs={pegs} />}
        pictureWords={pictureWords}
      />
      <div className="staff-columns mt-8">
        <Register title="Your turn" empty="Nothing needs you today.">
          {turns.map((item) => (
            <TurnRow key={item.id} item={item} boardDraft={working?.id} />
          ))}
        </Register>
        {/* The pipeline at a glance: where each project stands, in the margin, and its strip.
            The full list, with sign-ins and dates, is on Projects. */}
        <Register title="Your projects" limit={4} empty="No projects onboarded yet.">
          {projects.map((p) => {
            const { margin, sub } = phaseMargin(p);
            // An invite not yet taken up waits in Your turn with its age; here it is only "Invited".
            const invited = p.phase === "invited" && !p.clientSignedInOn;
            return (
              <RegisterRow
                key={p.id}
                id={`project:${p.id}`}
                margin={invited ? "Invited" : margin}
                marginSub={invited ? undefined : sub}
                title={p.name}
                href={`/staff/projects/${p.id}`}
                instrument={<ProgrammeStrip cells={p.strip} size={120} />}
              />
            );
          })}
        </Register>
      </div>
    </>
  );
}
