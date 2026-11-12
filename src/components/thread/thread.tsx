"use client";

import { useState, type FormEvent } from "react";
import { SealGlyph } from "@/components/instruments/glyphs";
import { SamplePhoto } from "@/components/instruments/sample-photo";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { DropZone } from "@/components/register/drop-zone";
import { usePause } from "@/components/register/recording-pause";
import { getDemoSnapshot, useDemo, useFirm } from "@/lib/demo-store";
import type { PersonId, PhotoKind, Post, ProjectId } from "@/lib/firm-data";
import { datePart, formatDate, formatTime, weekdayDate } from "@/lib/format";
import type { StoreyGroup } from "@/lib/projection";
import { stampNow } from "@/lib/clock";
import { TODAY } from "@/lib/demo-data";

// A project's thread: what was said, by whom and when, newest first, grouped by day. Site
// posts carry up to three sample photos and the floor they are about. A decision is set
// apart with the client's seal and no author line. Posting waits five seconds like every
// other write, then is recorded with the time.

const STOREY_WORDS: Record<StoreyGroup, string> = {
  ground: "Ground floor",
  first: "First floor",
  second: "Second floor",
};

const PHOTO_FILES: Record<PhotoKind, string> = {
  "slab-pour": "slab-pour.jpg",
  shuttering: "shuttering.jpg",
  curing: "curing.jpg",
  columns: "column-steel.jpg",
  blocks: "block-wall.jpg",
  tiles: "tiling.jpg",
  steel: "steel-bundle.jpg",
  sand: "sand-heap.jpg",
};

function dayHeading(date: string): string {
  if (date === TODAY) return `Today, ${weekdayDate(date)}`;
  return date.slice(0, 4) === TODAY.slice(0, 4) ? weekdayDate(date) : formatDate(date);
}

/** One post. */
export function ThreadPost({ post, firstPhoto = true }: { post: Post; firstPhoto?: boolean }) {
  const firm = useFirm();
  const person = firm.person(post.by);
  const time = formatTime(post.at);
  const decision = post.kind === "decision";

  return (
    <article className={decision ? "flex gap-3 bg-sand-2 px-4 py-3" : "grid gap-1"}>
      {decision ? (
        <>
          <SealGlyph size={24} className="mt-0.5" />
          <div className="min-w-0">
            <p className="text-17">{post.text}</p>
            <p className="lettering mt-1 text-ink-soft">
              {time ? `Recorded at ${time}` : "Recorded"}
              {post.storey && `. ${STOREY_WORDS[post.storey]}`}
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-17 font-semibold">{person?.name ?? post.by}</span>
            <span className="text-15 text-ink-soft">
              {person?.title}
              {time && `, ${time}`}
            </span>
          </p>
          <p className="max-w-[56ch] text-17">{post.text}</p>
          {post.photos.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {post.photos.slice(0, 3).map((kind, i) => (
                <SamplePhoto key={`${kind}-${i}`} kind={kind} tag={firstPhoto && i === 0} />
              ))}
            </div>
          )}
          {post.storey && <p className="lettering text-ink-soft">{STOREY_WORDS[post.storey]}</p>}
        </>
      )}
    </article>
  );
}

/** Posts newest first, grouped by day. `filter` keeps one floor's posts. */
export function ThreadList({
  posts,
  filter = null,
  limit,
  empty = "Nothing has been posted yet.",
}: {
  posts: Post[];
  filter?: StoreyGroup | null;
  limit?: number;
  empty?: string;
}) {
  const shown = [...posts]
    .filter((post) => !filter || post.storey === filter)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, limit);

  if (shown.length === 0) {
    return (
      <p className="py-4 text-17 text-ink-soft">
        {filter ? `Nothing has been posted about the ${STOREY_WORDS[filter].toLowerCase()} yet.` : empty}
      </p>
    );
  }

  const days: { date: string; posts: Post[] }[] = [];
  for (const post of shown) {
    const date = datePart(post.at);
    const last = days[days.length - 1];
    if (last && last.date === date) last.posts.push(post);
    else days.push({ date, posts: [post] });
  }
  const firstWithPhoto = shown.find((p) => p.photos.length > 0)?.id;

  return (
    <div className="grid gap-8">
      {days.map((day) => (
        <section key={day.date} aria-label={dayHeading(day.date)}>
          <h3 className="lettering border-b border-sand pb-1 text-ink-soft">{dayHeading(day.date)}</h3>
          <ul className="mt-4 grid gap-6">
            {day.posts.map((post) => (
              <li key={post.id}>
                <ThreadPost post={post} firstPhoto={post.id === firstWithPhoto} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Writing to the thread. `label` names the box ("Write to Meera"); `note` says who is
 * emailed. With `storeyChips` the post can be tied to a floor; with `photos` it can carry
 * up to three sample photos.
 */
export function Composer({
  projectId,
  by,
  label,
  storeyChips = false,
  photos = false,
  note,
}: {
  projectId: ProjectId;
  by: PersonId;
  label: string;
  storeyChips?: boolean;
  photos?: boolean;
  note?: string;
}) {
  const demo = useDemo();
  const pause = usePause();
  const [text, setText] = useState("");
  const [storey, setStorey] = useState<StoreyGroup | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState("");
  const id = `composer-${projectId}-${by}`;

  const kinds = (Object.keys(PHOTO_FILES) as PhotoKind[]).filter((kind) => chosen.includes(PHOTO_FILES[kind]));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Set aside, not disabled, while a pause runs, so the button keeps focus for Cancel.
    if (pause.pending !== null) return;
    const words = text.trim();
    if (!words) {
      setError("Write something first.");
      return;
    }
    setError("");
    const post = { text: words, storey, photos: kinds.slice(0, 3) };
    const { record } = demo;
    pause.start({
      what: "Your post",
      origin: event.nativeEvent instanceof SubmitEvent && event.nativeEvent.submitter instanceof HTMLElement ? event.nativeEvent.submitter : null,
      commit: () => {
        // The id is counted at the moment of recording, so two posts never share one.
        const count = getDemoSnapshot().events.filter((e) => e.kind === "post.added").length;
        record({
          kind: "post.added",
          post: { id: `p-live-${count + 1}`, projectId, by, at: stampNow(), text: post.text, photos: post.photos, storey: post.storey, kind: "post" },
          by,
        });
        // The draft is cleared once it is recorded: Cancel keeps it to put right.
        setText("");
        setStorey(null);
        setChosen([]);
      },
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div>
        <label htmlFor={id} className="block text-15 font-semibold">
          {label}
        </label>
        <textarea
          id={id}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          className={`${field} mt-1.5 py-2.5`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p id={`${id}-error`} className="mt-1.5 text-15 font-semibold text-brick" role="alert">
            {error}
          </p>
        )}
      </div>
      {storeyChips && (
        <ChipGroup label="Which floor is it about?">
          {(Object.keys(STOREY_WORDS) as StoreyGroup[]).map((group) => (
            <Chip key={group} pressed={storey === group} onClick={() => setStorey(storey === group ? null : group)}>
              {STOREY_WORDS[group]}
            </Chip>
          ))}
        </ChipGroup>
      )}
      {photos && (
        <DropZone
          label="Photos, up to three"
          samples={Object.values(PHOTO_FILES)}
          accept="images"
          chosen={chosen}
          onChoose={(files) => setChosen(files.slice(0, 3))}
          multiple
        />
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="submit" className="btn btn-quiet" aria-disabled={pause.pending !== null}>
          Post
        </button>
        {note && <p className="text-15 text-ink-soft">{note}</p>}
      </div>
    </form>
  );
}
