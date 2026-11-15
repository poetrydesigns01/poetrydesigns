/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useRef, useState, type ReactNode } from "react";
import { dated, IconCheck, IconSend, Panel } from "@/components/architect/glass-ui";
import { EmailPreview } from "@/components/register/email-preview";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { DraftView } from "@/lib/firm";
import type { DraftId } from "@/lib/firm-data";
import { draftName, firstNames } from "./bd-words";
import { PlanPanel } from "./plan-panel";
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

// One client's workspace being set up, in four steps shown as a stepper. With all four
// saved the workspace can be opened, which invites the client and gives the project its
// code; onboarding ends with the plan generated from the workflow template.

const STEPS: StepNo[] = [1, 2, 3, 4];

const FORMS: Record<StepNo, (props: StepProps) => ReactNode> = {
  1: StepClient,
  2: StepEstimate,
  3: StepAgreement,
  4: StepTeam,
};

function Stepper({
  open,
  done,
  onChoose,
}: {
  open: StepNo;
  done: Record<StepNo, boolean>;
  onChoose: (n: StepNo) => void;
}) {
  return (
    <nav aria-label="Steps" className="glass p-2">
      <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {STEPS.map((n) => {
          const current = open === n;
          return (
            <li key={n} className="min-w-0">
              <button
                type="button"
                aria-current={current ? "step" : undefined}
                onClick={() => onChoose(n)}
                className={`flex min-h-12 w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left ${
                  current ? "bg-rosewood text-lime" : "text-ink hover:bg-white/55"
                }`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-13 font-semibold ${
                    done[n] ? (current ? "bg-lime text-rosewood" : "bg-kota text-lime") : current ? "border border-lime/60" : "border border-ink/30"
                  }`}
                >
                  {done[n] ? <IconCheck /> : n}
                </span>
                <span className="min-w-0 text-15 leading-tight">
                  {STEP_NAMES[n]}
                  <span className="sr-only">{done[n] ? ", done" : ", to do"}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function OpenWorkspace({ draft, ready }: { draft: DraftView; ready: boolean }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const name = draftName(draft);
  const clients = draft.step1?.clients ?? [];
  const poc = draft.step4?.poc ? firm.person(draft.step4.poc)?.name : undefined;
  // Only Kulkarni Eco Home has a project waiting for it.
  const openable = draft.id === "kulkarni";
  const waiting = pause.pending !== null;

  return (
    <Panel
      title="Workspace"
      aside={
        draft.opened ? (
          <>
            {draft.projectId && <span className="figure text-15 text-ink">{firm.project(draft.projectId)?.code}</span>}
            <StatusChip tone="done">{draft.openedAt ? `Opened ${dated(draft.openedAt)}` : "Opened"}</StatusChip>
          </>
        ) : (
          <StatusChip tone={ready ? "done" : "locked"}>{ready ? "Ready" : `${draft.stepsDone}/4 steps`}</StatusChip>
        )
      }
    >
      {!draft.opened && openable && (
        <div className="grid gap-2 px-1 pb-1">
          <div>
            <button
              type="button"
              className={`btn ${ready ? "btn-primary" : "btn-glass"} min-h-12 gap-2`}
              aria-disabled={!ready || waiting}
              onClick={(event) => {
                if (!ready || waiting) return;
                const { record } = demo;
                pause.start({
                  what: `Workspace for ${name}, invite to ${firstNames(clients)}`,
                  origin: event.currentTarget,
                  commit: () => record({ kind: "workspace.opened", draftId: draft.id, projectId: "kulkarni", by: "rohan" }),
                });
              }}
            >
              <IconSend /> Open and invite {firstNames(clients)}
            </button>
          </div>
          <EmailPreview
            label="See the invite"
            to={`${clients.join(" and ") || "The client"} <${draft.step1?.email ?? "no email yet"}>`}
            subject={`Your Poetry Designs workspace for ${name}`}
            body={[
              `Dear ${firstNames(clients)},`,
              `${name} is ready for you on the Poetry Designs portal.`,
              "Use the link in this email to set your password. It works for 7 days.",
              ...(poc ? [`${poc} is your point of contact.`] : []),
              "Rohan Menon, Poetry Designs",
            ]}
          />
        </div>
      )}
    </Panel>
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
  const name = draftName(draft);

  // The last save of each step keys its form, so a form starts again from the record after it is saved.
  const lastSave = (step: StepNo) =>
    demo.events.findLast((e) => e.kind === "draft.saved" && e.draftId === draft.id && e.step === step)?.id ?? "seed";

  const onSaved = (step: StepNo) => {
    const next = STEPS.find((n) => n !== step && !done[n]);
    setChosen(next ?? step);
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
        chip={false}
        back={{ label: "Onboard", href: "/staff/bd/onboard" }}
      />
      <div className="mt-6 grid gap-4 lg:mt-8">
        <div ref={stepsRef} tabIndex={-1} className="grid scroll-mt-4 gap-4 outline-none">
          <Stepper open={open} done={done} onChoose={setChosen} />
          <Form key={`${draft.id}-${open}-${lastSave(open)}`} draft={draft} locked={draft.opened} onSaved={onSaved} primary={!ready} />
        </div>
        <div ref={openRef} tabIndex={-1} className="grid scroll-mt-4 gap-4 outline-none">
          <OpenWorkspace draft={draft} ready={ready} />
          <PlanPanel draft={draft} />
        </div>
      </div>
    </>
  );
}
