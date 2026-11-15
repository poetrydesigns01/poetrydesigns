"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { field } from "@/components/register/chips";
import { useScope } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { useDemo, useFirm, useViewer } from "@/lib/demo-store";
import type { ProjectView } from "@/lib/firm";
import type { PhotoKind } from "@/lib/firm-data";
import type { SiteStageView } from "@/lib/portal";
import { StageMeter, milestoneLine } from "./milestone";
import { Icon, PhotoTile, lockWords, stageLock, type IconName } from "./site-kit";
import { PHOTO_WORDS, photoChoices, sitesFor } from "./site-words";
import "./site.css";

// Marking the milestone in hand done makes the next instalment due: the Project Head raises
// the demand letter from it, with these photos as proof. One checklist: the milestone's own
// instalment received, its work, two or three photos. The button opens only when all are met.

type Check = { key: string; icon: IconName; label: string; value: string; met: boolean; blocked?: boolean };

function CheckTile({ check }: { check: Check }) {
  const tone = check.met ? "bg-kota/15 text-kota" : check.blocked ? "bg-ink/10 text-ink" : "bg-brass/15 text-brass-deep";
  return (
    <li className="glass-inner flex min-w-0 items-center gap-3 px-3 py-3">
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}>
        <Icon name={check.met ? "check" : check.blocked ? "lock" : check.icon} />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="lettering text-ink-soft">{check.label}</span>
        <span className="truncate text-17 font-semibold text-ink">
          {check.value}
          <span className="sr-only">{check.met ? ", done" : ", not yet"}</span>
        </span>
      </span>
    </li>
  );
}

function Checklist({ project, stage }: { project: ProjectView; stage: SiteStageView }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const me = useViewer("site");
  const ids = useId();
  const [photos, setPhotos] = useState<PhotoKind[]>([]);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [noteError, setNoteError] = useState(false);
  const yes = useRef<HTMLButtonElement>(null);

  // The confirm replaces the button that asked for it: keep the keyboard on it.
  useEffect(() => {
    if (confirming) yes.current?.focus();
  }, [confirming]);

  const n = stage.n;
  const m = project.milestones.find((row) => row.n === n);
  const gate = stageLock(firm, project.id, n);
  const tasksDone = stage.tasks.filter((t) => t.state === "done").length;
  const worked = Boolean(m?.siteNote) || stage.percent >= 100;
  const busy = pause.pending !== null;

  const checks: Check[] = [
    {
      key: "pay",
      icon: "lock",
      label: `Instalment ${n}`,
      value: gate.locked ? "Not in" : "Received",
      met: !gate.locked,
      blocked: gate.locked,
    },
    {
      key: "work",
      icon: "flag",
      label: "Tasks",
      value: worked ? "Work finished" : `${tasksDone} of ${stage.tasks.length} done`,
      met: worked,
    },
    { key: "photos", icon: "camera", label: "Photos", value: `${photos.length} of 2–3`, met: photos.length >= 2 },
  ];
  const ready = checks.every((c) => c.met);
  // The first check not met says why the button is shut.
  const reason = gate.locked
    ? `Locked · ${lockWords(gate.blockedBy)}`
    : !worked
      ? "Work in progress"
      : photos.length < 2
        ? "Choose 2 photos"
        : null;
  const canPick = !gate.locked && worked;

  const toggle = (kind: PhotoKind) => {
    if (!photos.includes(kind) && photos.length >= 3) return;
    setPhotos((current) => (current.includes(kind) ? current.filter((p) => p !== kind) : [...current, kind]));
  };

  const ask = () => {
    if (!ready || busy) return;
    if (!note.trim()) return setNoteError(true);
    setNoteError(false);
    setConfirming(true);
  };

  const confirm = (event: MouseEvent<HTMLButtonElement>) => {
    if (busy || stageLock(firm, project.id, n).locked) return;
    const what = { projectId: project.id, n, note: note.trim(), photos };
    const { record } = demo;
    pause.start({
      what: `Milestone ${n} at ${project.name}, done`,
      origin: event.currentTarget,
      commit: () => {
        record({ kind: "stage.done", ...what, by: me.id });
        setPhotos([]);
        setNote("");
        setConfirming(false);
      },
    });
  };

  return (
    <section className="glass-strong grid gap-5 p-4 sm:p-6" aria-labelledby={`${ids}-title`}>
      <h2 id={`${ids}-title`} className="sr-only">
        Milestone {n} checklist, {project.name}
      </h2>

      <ul className="grid gap-2 sm:grid-cols-3" aria-label="Checks">
        {checks.map((c) => (
          <CheckTile key={c.key} check={c} />
        ))}
      </ul>

      {canPick && (
        <>
          <div role="group" aria-label="Proof photos" className="grid grid-cols-3 gap-2 lg:grid-cols-6">
            {photoChoices(project.id).map((kind) => (
              <button key={kind} type="button" aria-pressed={photos.includes(kind)} onClick={() => toggle(kind)} className="site-pick">
                <PhotoTile kind={kind} decorative />
                <span className="site-pick-tick" aria-hidden="true">
                  <Icon name="check" className="size-4" />
                </span>
                <span className="sr-only">{PHOTO_WORDS[kind]}</span>
              </button>
            ))}
          </div>

          <div>
            <label htmlFor={`${ids}-note`} className="sr-only">
              What was finished
            </label>
            <input
              id={`${ids}-note`}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setNoteError(false);
              }}
              placeholder="What was finished"
              className={field}
              aria-invalid={noteError ? true : undefined}
              aria-describedby={noteError ? `${ids}-note-error` : undefined}
            />
            {noteError && (
              <p id={`${ids}-note-error`} className="late-text mt-1.5 text-15" role="alert">
                Add one line
              </p>
            )}
          </div>
        </>
      )}

      {confirming && ready ? (
        <div className="glass-inner grid gap-3 p-3" role="group" aria-label="Confirm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-15 font-semibold text-ink">Mark milestone {n} done?</p>
            {n < 10 && <span className="lettering text-ink-soft">Instalment {n + 1} falls due</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn btn-glass btn-sm"
              onClick={() => {
                if (busy) pause.cancel();
                setConfirming(false);
              }}
            >
              Not yet
            </button>
            <button ref={yes} type="button" className="btn btn-primary btn-sm" aria-disabled={busy ? true : undefined} onClick={confirm}>
              Yes, done
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-primary w-full gap-2" aria-disabled={!ready || busy ? true : undefined} onClick={ask}>
          <Icon name={reason && gate.locked ? "lock" : "flag"} />
          {reason ?? "Mark milestone done"}
        </button>
      )}
    </section>
  );
}

export function StageForm() {
  const demo = useDemo();
  const firm = useFirm();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const me = useViewer("site");
  const scope = useScope("site");

  const sites = sitesFor(firm, me.id);
  const asked = params.get("project");
  const askedSite = sites.find((p) => p.id === asked);

  // A link may name the site (?project=nair): make it the board's project, then drop it
  // from the address so the board's project pill decides from here on.
  useEffect(() => {
    if (!askedSite) return;
    if (scope !== askedSite.id) demo.setScope("site", askedSite.id);
    router.replace(pathname, { scroll: false });
  }, [askedSite, scope, demo, router, pathname]);

  const project = askedSite ?? sites.find((p) => p.id === scope) ?? sites[0];

  if (!project) {
    return (
      <div className="site-screen">
        <StaffBoard place="Milestone" headline="Milestone done" chip={false} />
        <p className="glass px-4 py-3 text-15 text-ink">No site under way</p>
      </div>
    );
  }

  const stage = firm.siteStage(project.id);

  return (
    <div className="site-screen">
      <StaffBoard
        place="Milestone done"
        headline={stage ? stage.short : "All milestones done"}
        state={stage ? milestoneLine(stage) : undefined}
        picture={stage ? <StageMeter stage={stage} /> : undefined}
      />

      {stage && <Checklist key={`${project.id}-${stage.n}`} project={project} stage={stage} />}
    </div>
  );
}
