"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useState, type MouseEvent } from "react";
import { SamplePhoto } from "@/components/instruments/sample-photo";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { useScope } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { SampleTag } from "@/components/register/sample-tag";
import { StaffBoard } from "@/components/register/staff-board";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm, useViewer } from "@/lib/demo-store";
import { ageWords, daysSince } from "@/lib/firm";
import type { PhotoKind, ProjectId } from "@/lib/firm-data";
import { datePart, formatStamp } from "@/lib/format";
import { PHOTO_WORDS, lastDone, lowerFirst, photoChoices, sitesFor, stageName, stageShort, storeysOf, underWay, upperFirst } from "./site-words";
import "./site.css";

// Marking a stage's work done is what starts the money: the Project Head raises the
// payment from it, and its photos go with the demand letter as proof. So it asks for two
// or three photos and a note, then asks once more before the pause.

export function StageForm() {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const me = useViewer("site");
  const scope = useScope("site");
  const ids = useId();

  const sites = sitesFor(firm, me.id);
  // The site comes from the address ("Your turn" passes ?project=nair), else the one in view.
  const asked = params.get("project");
  const project = sites.find((p) => p.id === asked) ?? sites.find((p) => p.id === scope) ?? sites[0];

  const [photos, setPhotos] = useState<PhotoKind[]>([]);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<{ field: "photos" | "note"; words: string } | null>(null);

  if (!project) {
    return (
      <div className="site-screen">
        <StaffBoard place="Stage" headline="Mark a stage done" chip={false} />
        <p className="text-17 text-ink-soft">You are not on a site that is being built.</p>
      </div>
    );
  }

  const m = underWay(project);
  const done = lastDone(project);
  const head = firm.person(project.team.head);
  const ready = Boolean(m?.siteNote);
  const name = m ? lowerFirst(stageName(project, m.n)) : "";
  const covers = m ? project.milestones.find((x) => x.n === m.n)?.covers : undefined;
  const key = m ? `${project.id}:${m.n}` : null;
  const set = pause.pending !== null;

  const choose = (id: ProjectId) => {
    setConfirming(null);
    setError(null);
    router.replace(`${pathname}?project=${id}`, { scroll: false });
  };

  const toggle = (kind: PhotoKind) => {
    if (!photos.includes(kind) && photos.length >= 3) {
      setError({ field: "photos", words: "Three photos at most. Take one off first." });
      return;
    }
    setPhotos((current) =>
      current.includes(kind) ? current.filter((p) => p !== kind) : current.length >= 3 ? current : [...current, kind],
    );
    setError(null);
  };

  const ask = () => {
    if (!ready || set) return;
    if (photos.length < 2) {
      setError({ field: "photos", words: "Choose two or three photos of the finished work." });
      return;
    }
    if (!note.trim()) {
      setError({ field: "note", words: "Write a note on what was finished." });
      return;
    }
    setError(null);
    setConfirming(key);
  };

  const confirm = (event: MouseEvent<HTMLButtonElement>) => {
    if (!m || set) return;
    const what = { projectId: project.id, n: m.n, note: note.trim(), photos };
    const { record } = demo;
    pause.start({
      what: `Milestone ${m.n} at ${project.name}, marked done`,
      origin: event.currentTarget,
      commit: () => {
        record({ kind: "stage.done", ...what, by: me.id });
        // The draft is cleared once it is recorded: Cancel keeps it to put right.
        setPhotos([]);
        setNote("");
        setConfirming(null);
      },
    });
  };

  const markedToday = done && done.doneBy === me.id && done.doneOn && datePart(done.doneOn) === TODAY;
  const doneRowId = done ? `pay:${project.id}:${done.n}` : "";

  return (
    <div className="site-screen">
      <StaffBoard
        place="Stage"
        headline="Mark a stage done"
        state={
          m
            ? `${project.name}. ${head?.name ?? "The Project Head"} raises the payment once a stage is marked done.`
            : `Every stage at ${project.name} so far is marked done.`
        }
        chip={false}
      />

      {sites.length > 1 && (
        <ChipGroup label="Site" columns={2} className="sm:max-w-[32rem]">
          {sites.map((p) => (
            <Chip key={p.id} size="site" pressed={p.id === project.id} onClick={() => choose(p.id)}>
              {p.name}
            </Chip>
          ))}
        </ChipGroup>
      )}

      <div className="staff-columns">
        <div className="grid content-start gap-8">
          {m && (
            <section aria-labelledby={`${ids}-now`} className="grid gap-2">
              <h2 id={`${ids}-now`} className="text-22 font-semibold">
                Milestone {m.n}, {name} <SampleTag />
              </h2>
              {covers && <p className="text-17 text-ink-soft">{covers}</p>}
              <p className="text-17 font-semibold">
                {ready && m.siteNote ? `${upperFirst(m.siteNote)}.` : "Not finished yet."}
              </p>
            </section>
          )}

          {m && ready && (
            <>
              <div className="grid gap-2">
                <ChipGroup label="Photos of the finished work, two or three" columns={3}>
                  {photoChoices(project.id).map((kind, i) => (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={photos.includes(kind)}
                      onClick={() => toggle(kind)}
                      className="chip chip-site"
                      style={{ flexDirection: "column", alignItems: "flex-start", padding: 8 }}
                    >
                      <SamplePhoto kind={kind} tag={i === 0} />
                      <span className="px-1">{PHOTO_WORDS[kind]}</span>
                    </button>
                  ))}
                </ChipGroup>
                {error?.field === "photos" && (
                  <p className="text-17 font-semibold text-brick" role="alert">
                    {error.words}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={`${ids}-note`} className="block text-17 font-semibold">
                  Note for {head?.first ?? "the Project Head"}
                </label>
                <textarea
                  id={`${ids}-note`}
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Verandah and wet areas tiled, grouted and cleaned."
                  className={`${field} mt-1.5 py-3`}
                  aria-invalid={error?.field === "note" ? true : undefined}
                  aria-describedby={error?.field === "note" ? `${ids}-note-error` : undefined}
                />
                {error?.field === "note" && (
                  <p id={`${ids}-note-error`} className="mt-1.5 text-17 font-semibold text-brick" role="alert">
                    {error.words}
                  </p>
                )}
              </div>
            </>
          )}

          {m && (
            <div className="grid gap-3">
              {confirming === key && ready ? (
                <div className="grid gap-3 bg-sand-2 p-4">
                  <p className="text-17">
                    Mark milestone {m.n}, {name}, done at {project.name}? {head?.name ?? "The Project Head"} is asked to raise
                    the payment, with your photos as proof.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-primary w-full sm:w-auto" aria-disabled={set} onClick={confirm}>
                      Yes, mark it done
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet w-full bg-paper sm:w-auto"
                      onClick={() => {
                        if (set) pause.cancel();
                        setConfirming(null);
                      }}
                    >
                      Not yet
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    className="btn btn-primary w-full sm:w-auto"
                    aria-disabled={!ready || set ? true : undefined}
                    aria-describedby={ready ? undefined : `${ids}-why`}
                    onClick={ask}
                  >
                    Mark {name} done
                  </button>
                  {!ready && (
                    <p id={`${ids}-why`} className="mt-2 text-17 text-ink-soft">
                      {project.category !== "farmhouse" && storeysOf(project, m.n).length > 0
                        ? `The ${stageShort(project, m.n)} is still going up.`
                        : "The work on this stage is still going on."}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {done && (
          <div className="grid content-start gap-3">
            <Register title={markedToday ? "Marked done today" : "Last marked done"}>
              <RegisterRow
                id={doneRowId}
                margin={ageWords(daysSince(done.doneOn ?? TODAY))}
                title={`Milestone ${done.n}, ${lowerFirst(stageName(project, done.n))}`}
                sentence={
                  markedToday
                    ? `${head?.first ?? "The Project Head"} raises the payment next.`
                    : `Marked done on ${formatStamp(done.doneOn ?? TODAY)}.`
                }
                stamps={firm.stampsFor(doneRowId)}
              >
                {done.photos && done.photos.length > 0 && (
                  <div className="grid gap-2">
                    <div className="flex flex-wrap gap-2">
                      {done.photos.map((kind, i) => (
                        <SamplePhoto key={kind} kind={kind} tag={!m || !ready ? i === 0 : false} />
                      ))}
                    </div>
                    <p className="text-17 text-ink-soft">These photos travel with the demand letter as stage proof.</p>
                  </div>
                )}
              </RegisterRow>
            </Register>
          </div>
        )}
      </div>
    </div>
  );
}
