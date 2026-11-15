/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { Fragment, useEffect, useId, useState, type FormEvent } from "react";
import { field } from "@/components/register/chips";
import { useScope } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { stampNow } from "@/lib/clock";
import { getDemoSnapshot, useDemo, useFirm, useViewer } from "@/lib/demo-store";
import type { PhotoKind, ProjectId } from "@/lib/firm-data";
import { TODAY } from "@/lib/demo-data";
import { datePart, formatShortDate, formatTime, listWords } from "@/lib/format";
import type { ChatPost, Tick } from "@/lib/portal";
import { Icon, PanelHead, PhotoTile } from "./site-kit";
import { PHOTO_WORDS, groupOf, photoChoices, underWay } from "./site-words";
import "./site.css";

// Site photos, a tap each, posted into the project's chat with an optional line. The chat
// under it reads like a phone's messenger: mine at the right with ticks, others at the left.

/** One tick sent, two delivered, two in laterite read. */
function Ticks({ tick }: { tick: Tick }) {
  const words = { sent: "Sent", delivered: "Delivered", read: "Read" }[tick];
  return (
    <span className={`inline-flex ${tick === "read" ? "text-laterite" : "text-ink-soft"}`} title={words}>
      <svg viewBox="0 0 22 14" className="h-3.5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1.5 7.5 5 11l7-8" />
        {tick !== "sent" && <path d="M9 11l7-8 M7.6 9.6 9 11" />}
      </svg>
      <span className="sr-only">{words}</span>
    </span>
  );
}

function Bubble({ post, mine }: { post: ChatPost; mine: boolean }) {
  if (post.side === "system") {
    return (
      <li className="justify-self-center rounded-full bg-white/60 px-3 py-1 text-center text-13 text-ink">
        {post.text} · {formatTime(post.at)}
      </li>
    );
  }
  return (
    <li className={`site-bubble grid gap-1.5 ${mine ? "site-bubble-mine" : "site-bubble-theirs"}`}>
      {!mine && <p className="text-13 font-semibold text-laterite">{post.name}</p>}
      {post.photos.length > 0 && (
        <div className={`grid gap-1 ${post.photos.length > 1 ? "grid-cols-2" : ""}`}>
          {post.photos.map((kind) => (
            <PhotoTile key={kind} kind={kind} />
          ))}
        </div>
      )}
      {post.files && post.files.length > 0 && (
        <p className="flex items-center gap-1.5 text-13 text-ink">
          <Icon name="camera" className="size-4" />
          {post.files.join(", ")}
        </p>
      )}
      {post.text && <p className="text-15 text-ink">{post.text}</p>}
      <p className="flex items-center justify-end gap-1 text-13 text-ink-soft">
        {formatTime(post.at)}
        {mine && post.ticks && <Ticks tick={post.ticks} />}
      </p>
    </li>
  );
}

export function SiteUpdate() {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const me = useViewer("site");
  const scope = useScope("site");
  const ids = useId();
  const projectId: ProjectId = scope === "all" ? "iyer" : scope;
  const project = firm.project(projectId);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<PhotoKind[]>([]);
  const [error, setError] = useState(false);

  const chat = firm.chat(projectId);
  const recent = chat.slice(-8);
  const lastId = recent[recent.length - 1]?.id;

  // The thread is on screen: the other side's posts count as read.
  const { readThread } = demo;
  useEffect(() => {
    readThread(projectId, me.id);
  }, [readThread, projectId, me.id, lastId]);

  if (!project) return null;
  const m = underWay(project);
  const choices = photoChoices(projectId);
  const busy = pause.pending !== null;

  const toggle = (kind: PhotoKind) => {
    setPhotos((current) => (current.includes(kind) ? current.filter((p) => p !== kind) : [...current, kind]));
    setError(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const words = text.trim();
    if (photos.length === 0 && !words) {
      setError(true);
      return;
    }
    setError(false);
    const draft = {
      projectId,
      text: words || listWords(photos.map((p) => PHOTO_WORDS[p])),
      photos,
      storey: m ? groupOf(project, m.n) : null,
    };
    const { record } = demo;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    pause.start({
      verb: "Sending",
      what: `Site photos for ${project.name}`,
      origin: submitter instanceof HTMLElement ? submitter : null,
      commit: () => {
        const count = getDemoSnapshot().events.filter((e) => e.kind === "post.added").length;
        record({
          kind: "post.added",
          post: { id: `p-live-${count + 1}`, by: me.id, at: stampNow(), kind: "post", ...draft },
          by: me.id,
        });
        setText("");
        setPhotos([]);
      },
    });
  };

  return (
    <div className="site-screen">
      <StaffBoard place="Site photos" headline="Post site photos" />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <form onSubmit={submit} noValidate className="glass-strong grid gap-5 p-4 sm:p-6">
          <div role="group" aria-labelledby={`${ids}-photos`} className="grid gap-2">
            <p id={`${ids}-photos`} className="flex items-center justify-between gap-2 text-15 font-semibold text-ink">
              <span className="flex items-center gap-2">
                <Icon name="camera" className="size-5 text-laterite" />
                Photos
              </span>
              <span className="figure text-15 text-ink-soft">{photos.length} chosen</span>
            </p>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-6 xl:grid-cols-3">
              {choices.map((kind) => (
                <button key={kind} type="button" aria-pressed={photos.includes(kind)} onClick={() => toggle(kind)} className="site-pick">
                  <PhotoTile kind={kind} decorative />
                  <span className="site-pick-tick" aria-hidden="true">
                    <Icon name="check" className="size-4" />
                  </span>
                  <span className="sr-only">{PHOTO_WORDS[kind]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor={`${ids}-text`} className="sr-only">
              Caption
            </label>
            <input
              id={`${ids}-text`}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setError(false);
              }}
              placeholder="Caption (optional)"
              className={field}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${ids}-error` : undefined}
            />
            {error && (
              <p id={`${ids}-error`} className="late-text mt-1.5 text-15" role="alert">
                Choose a photo
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-primary w-full gap-2" aria-disabled={busy ? true : undefined}>
            <Icon name="send" />
            {photos.length > 0 ? `Post ${photos.length} ${photos.length === 1 ? "photo" : "photos"}` : "Post"}
          </button>
        </form>

        <section className="glass grid gap-2 p-2 sm:p-3" aria-labelledby={`${ids}-chat`}>
          <PanelHead id={`${ids}-chat`} title={`${project.name} chat`} />
          {recent.length === 0 ? (
            <p className="px-2 pb-2 text-15 text-ink-soft">No messages</p>
          ) : (
            <ul className="grid gap-2 px-1 pb-1" aria-live="polite">
              {recent.map((post, i) => {
                const day = datePart(post.at);
                const newDay = i === 0 || datePart(recent[i - 1].at) !== day;
                return (
                  <Fragment key={post.id}>
                    {newDay && (
                      <li className="justify-self-center px-2 py-0.5 text-13 font-semibold text-ink-soft">
                        {day === TODAY ? "Today" : formatShortDate(day)}
                      </li>
                    )}
                    <Bubble post={post} mine={post.by === me.id} />
                  </Fragment>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
