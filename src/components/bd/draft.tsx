"use client";

import { useRef, useState, type ReactNode } from "react";
import { EmailPreview } from "@/components/register/email-preview";
import { usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { DraftView } from "@/lib/firm";
import { ageWords, daysSince } from "@/lib/firm";
import type { DraftId } from "@/lib/firm-data";
import { formatDate, formatShortDate, formatStampShort, formatTime } from "@/lib/format";
import { BoardPlot } from "./board-plot";
import { draftName, firstNames, onboardedWords, THIS_MONTH } from "./bd-words";
import {
  STEP_NAMES,
  StepAgreement,
  StepClient,
  StepEstimate,
  StepTeam,
  stepsDone,
  type StepNo,
  type StepProps,
} from "./draft-steps";

// One client's workspace being set up, in four steps. The plot on the board gets a stake
// for each step saved; with all four the outline closes and the workspace can be opened,
// which invites the client and counts as one onboarded client.

const STEPS: StepNo[] = [1, 2, 3, 4];

const FORMS: Record<StepNo, (props: StepProps) => ReactNode> = {
  1: StepClient,
  2: StepEstimate,
  3: StepAgreement,
  4: StepTeam,
};

/** A surveyor's stake: driven (a square with a cross) once the step is saved, a chalk ring before. */
function Stake({ driven }: { driven: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} className="shrink-0" aria-hidden="true" focusable="false">
      {driven ? (
        <>
          <rect x="5" y="5" width="6" height="6" style={{ fill: "currentColor" }} />
          <path d="M1 8h14M8 1v14" style={{ stroke: "currentColor", strokeWidth: 1.2 }} />
        </>
      ) : (
        <circle cx="8" cy="8" r="3.5" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.2, strokeDasharray: "2 1.5" }} />
      )}
    </svg>
  );
}

/** The invite the client would get, shown as a preview. */
function invitePreview(draft: DraftView, poc: string | undefined) {
  const name = draftName(draft);
  const clients = draft.step1?.clients ?? [];
  return (
    <EmailPreview
      label="See the invite"
      to={`${clients.join(" and ") || "The client"} <${draft.step1?.email ?? "no email yet"}>`}
      subject={`Your Poetry Designs workspace for ${name}`}
      body={[
        `Dear ${firstNames(clients)},`,
        `${name} is ready for you on the Poetry Designs portal. Your designs, payments, changes and advisory hours are all kept there.`,
        "Use the link in this email to set your password and sign in. It works for 7 days; if it runs out, ask us for a new one.",
        ...(poc ? [`${poc} is your point of contact.`] : []),
        "Rohan Menon, Poetry Designs",
      ]}
    />
  );
}

function OpenWorkspace({ draft, ready }: { draft: DraftView; ready: boolean }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const rowId = `draft:${draft.id}`;
  const name = draftName(draft);
  const clients = draft.step1?.clients ?? [];
  const poc = draft.step4?.poc ? firm.person(draft.step4.poc)?.name : undefined;
  // Only Kulkarni Eco Home has a project waiting for it in this demo.
  const openable = draft.id === "kulkarni";
  const waiting = pause.pending !== null;
  const days = daysSince(draft.openedAt || draft.startedAt || TODAY);

  const sentence = draft.opened
    ? `Opened. ${name} is in your projects and on the admin's board.`
    : !openable
      ? "This demo opens Kulkarni Eco Home only. This draft stays saved in this tab."
      : ready
        ? `All four steps are done. The invite goes to ${draft.step1?.email ?? "the client"}.`
        : `${draft.missing} All four steps must be done before it can be opened.`;

  return (
    <Register title="Open the workspace">
      <RegisterRow
        id={rowId}
        margin={draft.opened ? ageWords(days) : ready ? "Ready" : "Not yet"}
        title={name}
        // The opening's carbon copies Shalini, so its own line offers to see it as her.
        sentence={sentence}
        stamps={firm.stampsFor(rowId)}
        action={
          !draft.opened && openable ? (
            <button
              type="button"
              className={`btn ${ready ? "btn-primary" : "btn-quiet"}`}
              aria-disabled={!ready || waiting}
              onClick={(event) => {
                if (!ready || waiting) return;
                const { record } = demo;
                pause.start({
                  what: `The workspace for ${name}, and the invite to ${firstNames(clients)}`,
                  origin: event.currentTarget,
                  commit: () => record({ kind: "workspace.opened", draftId: draft.id, projectId: "kulkarni", by: "rohan" }),
                });
              }}
            >
              Open the workspace and invite {firstNames(clients)}
            </button>
          ) : undefined
        }
      >
        {!draft.opened && openable && invitePreview(draft, poc)}
      </RegisterRow>
    </Register>
  );
}

export function DraftPage({ id }: { id: DraftId }) {
  const demo = useDemo();
  const firm = useFirm();
  const draft = firm.drafts.find((d) => d.id === id);
  const [chosen, setChosen] = useState<StepNo | null>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<HTMLDivElement>(null);
  if (!draft) return null;

  const done = stepsDone(draft);
  const open: StepNo = chosen ?? ((draft.nextStep as StepNo | null) ?? 4);
  const ready = STEPS.every((n) => done[n]);
  const pegs = (draft.opened ? 4 : draft.stepsDone) as 0 | 1 | 2 | 3 | 4;
  const name = draftName(draft);

  // The last save of each step keys its form, so a form takes up what was saved when the
  // tab wakes, and starts again from the record after it is saved.
  const lastSave = (step: StepNo) =>
    demo.events.findLast((e) => e.kind === "draft.saved" && e.draftId === draft.id && e.step === step)?.id ?? "seed";
  const lastAny = demo.events.findLast((e) => e.kind === "draft.saved" && e.draftId === draft.id);
  const savedAt = lastAny?.at ?? draft.startedAt;
  const savedWords = savedAt
    ? `Saved on ${formatShortDate(savedAt)}${formatTime(savedAt) ? ` at ${formatTime(savedAt)}` : ""}.`
    : "Nothing saved yet.";

  const state = draft.opened
    ? `Workspace opened ${draft.openedAt ? formatStampShort(draft.openedAt) : "today"}. ${onboardedWords(firm.onboardedIn(THIS_MONTH).length)}`
    : `Step ${open} of 4, ${STEP_NAMES[open].toLowerCase()}. ${savedWords}`;

  const onSaved = (step: StepNo) => {
    // The next step still to do, counting this one as done.
    const next = STEPS.find((n) => n !== step && !done[n]);
    setChosen(next ?? step);
    // The save button goes with its form: bring the next step, or with none left the
    // opening, into view and give it the focus.
    const target = next ? stepsRef.current : openRef.current;
    target?.scrollIntoView({ block: "start" });
    target?.focus({ preventScroll: true });
  };

  const Form = FORMS[open];

  return (
    <>
      <StaffBoard
        place="Onboard"
        headline={name}
        state={state}
        chip={false}
        picture={<BoardPlot pegs={pegs} />}
        pictureWords={draft.opened ? "All four stakes driven; the plot is closed." : `${draft.stepsDone} of 4 steps done.`}
      />
      <div className="mt-8 grid gap-12">
        <div
          ref={stepsRef}
          tabIndex={-1}
          className="grid scroll-mt-4 gap-8 outline-none lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12"
        >
          <nav aria-label="Steps">
            <ol className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-1">
              {STEPS.map((n) => (
                <li key={n}>
                  <button
                    type="button"
                    className="chip w-full justify-between"
                    aria-pressed={open === n}
                    aria-current={open === n ? "step" : undefined}
                    onClick={() => setChosen(n)}
                  >
                    <span className="flex min-w-0 items-center gap-2 py-1.5">
                      <Stake driven={done[n]} />
                      <span className="min-w-0">
                        <span className="block">
                          {n}. {STEP_NAMES[n]}
                        </span>
                        <span className="chip-detail">{done[n] ? "Done" : "To do"}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            {draft.startedAt && (
              <p className="lettering mt-3 text-ink-soft">Started {formatDate(draft.startedAt)} by Rohan Menon.</p>
            )}
          </nav>
          <Form key={`${draft.id}-${open}-${lastSave(open)}`} draft={draft} locked={draft.opened} onSaved={onSaved} />
        </div>
        <div ref={openRef} tabIndex={-1} className="scroll-mt-4 outline-none">
          <OpenWorkspace draft={draft} ready={ready} />
        </div>
      </div>
    </>
  );
}
