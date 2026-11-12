"use client";

import { useId, useState, type FormEvent } from "react";
import { SamplePhoto } from "@/components/instruments/sample-photo";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { EmailPreview } from "@/components/register/email-preview";
import { useScope } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { SampleTag } from "@/components/register/sample-tag";
import { StaffBoard } from "@/components/register/staff-board";
import { stampNow } from "@/lib/clock";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo, useFirm, useViewer } from "@/lib/demo-store";
import type { StampView } from "@/lib/firm";
import type { PersonId, PhotoKind, Post } from "@/lib/firm-data";
import { datePart, listWords } from "@/lib/format";
import type { StoreyGroup } from "@/lib/projection";
import { PHOTO_WORDS, groupOf, lowerFirst, photoChoices, stageName, underWay } from "./site-words";
import "./site.css";

// A site update for the client's thread, from a phone: up to three photos, one line, and
// the floor it is about. The client is emailed (a preview here; the demo sends nothing).
// Posting waits five seconds like every other write, then it is in the thread.

const FLOORS: { value: StoreyGroup | "whole"; label: string }[] = [
  { value: "ground", label: "Ground floor" },
  { value: "first", label: "First floor" },
  { value: "second", label: "Second floor and roof" },
  { value: "whole", label: "Whole house" },
];

const FLOOR_WORDS: Record<StoreyGroup, string> = {
  ground: "Ground floor",
  first: "First floor",
  second: "Second floor and roof",
};

export function SiteUpdate() {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const me = useViewer("site");
  const scope = useScope("site");
  const ids = useId();
  const project = firm.project(scope === "all" ? "iyer" : scope);

  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<PhotoKind[]>([]);
  // Null means "as it stands": the floor going up.
  const [floor, setFloor] = useState<StoreyGroup | "whole" | null>(null);
  const [error, setError] = useState<{ field: "text" | "photos"; words: string } | null>(null);

  if (!project) return null;
  const m = underWay(project);
  const villa = project.category !== "farmhouse";
  const floorNow: StoreyGroup | "whole" = floor ?? (m ? (groupOf(project, m.n) ?? "whole") : "whole");
  const choices = photoChoices(project.id);

  // Who is emailed: the client only. Meera is in the portal; other clients are named.
  const meera = project.id === "iyer" || project.id === "iyer-cottage";
  const clientNames = meera ? ["Meera Iyer"] : project.clients;
  const posted = firm.posts
    .filter((p) => p.projectId === project.id && p.by === me.id && datePart(p.at) === TODAY && p.kind === "post")
    .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));

  const stampOf = (post: Post): StampView => ({
    words: "Posted",
    at: post.at,
    by: post.by,
    carbon: {
      to: meera ? (["meera"] as PersonId[]) : [],
      others: meera ? [] : project.clients,
      href: "/client/updates",
      rowId: `post:${post.id}`,
    },
  });

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

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Set aside, not disabled, while a pause runs, so the button keeps focus for Cancel.
    if (pause.pending !== null) return;
    const words = text.trim();
    if (!words) {
      setError({ field: "text", words: "Write one line about what happened on site." });
      return;
    }
    setError(null);
    const draft = {
      text: words,
      photos,
      storey: villa && floorNow !== "whole" ? floorNow : null,
      projectId: project.id,
    };
    const { record } = demo;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    pause.start({
      what: `Your update to ${project.name}`,
      origin: submitter instanceof HTMLElement ? submitter : null,
      commit: () => {
        // The id is counted at the moment of recording, so two posts never share one.
        const count = getDemoSnapshot().events.filter((e) => e.kind === "post.added").length;
        record({
          kind: "post.added",
          post: { id: `p-live-${count + 1}`, by: me.id, at: stampNow(), kind: "post", ...draft },
          by: me.id,
        });
        // The draft is cleared once it is recorded: Cancel keeps it to put right.
        setText("");
        setPhotos([]);
        setFloor(null);
      },
    });
  };

  return (
    <div className="site-screen">
      <StaffBoard
        place="Site update"
        headline="Post a site update"
        state={`For the ${project.name} thread. ${listWords(clientNames)} ${clientNames.length === 1 ? "sees" : "see"} it there.`}
      />

      <div className="staff-columns">
        <form onSubmit={submit} noValidate className="grid content-start gap-8">
          <div className="grid gap-2">
            <ChipGroup label="Take photos, one to three" columns={3}>
              {choices.map((kind, i) => (
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
            <p className="text-17 text-ink-soft">
              The camera opens here on a phone. <SampleTag>Demo</SampleTag> These are sample drawings.
            </p>
            {error?.field === "photos" && (
              <p className="text-17 font-semibold text-brick" role="alert">
                {error.words}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${ids}-text`} className="block text-17 font-semibold">
              What happened on site
            </label>
            <input
              id={`${ids}-text`}
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Second floor column steel finished on the north side."
              className={`${field} mt-1.5`}
              aria-invalid={error?.field === "text" ? true : undefined}
              aria-describedby={error?.field === "text" ? `${ids}-error` : undefined}
            />
            {error?.field === "text" && (
              <p id={`${ids}-error`} className="mt-1.5 text-17 font-semibold text-brick" role="alert">
                {error.words}
              </p>
            )}
          </div>

          {villa ? (
            <ChipGroup label="Which floor is it about?" columns={2}>
              {FLOORS.map((f) => (
                <Chip key={f.value} size="site" pressed={floorNow === f.value} onClick={() => setFloor(f.value)}>
                  {f.label}
                </Chip>
              ))}
            </ChipGroup>
          ) : (
            m && (
              <p className="text-17">
                About milestone {m.n}, {lowerFirst(stageName(project, m.n))}. <SampleTag />
              </p>
            )
          )}

          <div className="grid gap-1">
            <p className="text-17">{listWords(clientNames)} will be emailed.</p>
            <EmailPreview
              to={project.clientEmail}
              subject={`A new site update for ${project.name}`}
              body={[
                `${me.name} posted an update from site.`,
                text.trim() ? `“${text.trim()}”` : "Their line will be here.",
                photos.length > 0
                  ? `With ${photos.length} ${photos.length === 1 ? "photo" : "photos"}. Open the portal to see them.`
                  : "Open the portal to see it.",
              ]}
            />
          </div>

          <div>
            <button type="submit" className="btn btn-primary w-full sm:w-auto" aria-disabled={pause.pending !== null}>
              Post to {project.name} updates
            </button>
          </div>
        </form>

        <Register title="Posted today" empty="Nothing posted from this site today.">
          {posted.map((post) => (
            <RegisterRow
              key={post.id}
              id={`post:${post.id}`}
              margin="Today"
              title={post.text}
              sentence={
                post.storey
                  ? `${FLOOR_WORDS[post.storey]}${post.photos.length > 0 ? `, ${post.photos.length} ${post.photos.length === 1 ? "photo" : "photos"}` : ""}.`
                  : post.photos.length > 0
                    ? `${post.photos.length} ${post.photos.length === 1 ? "photo" : "photos"}.`
                    : undefined
              }
              stamps={[stampOf(post)]}
            >
              {post.photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.photos.map((kind) => (
                    <SamplePhoto key={kind} kind={kind} tag={false} />
                  ))}
                </div>
              )}
            </RegisterRow>
          ))}
        </Register>
      </div>
    </div>
  );
}
