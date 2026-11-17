/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import "./chat.css";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm, type FirmEvent } from "@/lib/demo-store";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { addDays, datePart, formatDate, formatTime, shortWeekdayDate } from "@/lib/format";
import type { ChatPost } from "@/lib/portal";
import { ChatComposer } from "./composer";
import { HouseIcon, SealIcon, SheetIcon, Ticks } from "./icons";
import { colourOf, roleWords } from "./people";
import { Lightbox, PhotoGrid, photosOf, type ChatPhoto } from "./photos";

// A project's update log as a chat. The viewer's own messages sit on the right, everyone
// else's on the left with their name; approvals, letters and payments are centred notes.
// Oldest at the top, it opens at the latest, and opening it marks the other side's
// messages read.

function dayWords(date: string): string {
  if (date === TODAY) return "Today";
  if (date === addDays(TODAY, -1)) return "Yesterday";
  return date.slice(0, 4) === TODAY.slice(0, 4) ? shortWeekdayDate(date) : formatDate(date);
}

/**
 * Oldest first. Stamps are to the minute, so messages sent in the same minute keep the
 * order they were recorded in.
 */
function inRecordOrder(posts: ChatPost[], events: FirmEvent[]): ChatPost[] {
  const order = new Map<string, number>();
  events.forEach((e, i) => order.set(e.kind === "post.added" ? e.post.id : `p-${e.id}`, i));
  return posts
    .map((post, i) => ({ post, i }))
    .sort((a, b) => a.post.at.localeCompare(b.post.at) || (order.get(a.post.id) ?? -1) - (order.get(b.post.id) ?? -1) || a.i - b.i)
    .map(({ post }) => post);
}

type Day = { date: string; posts: ChatPost[] };

function byDay(posts: ChatPost[]): Day[] {
  const days: Day[] = [];
  for (const post of posts) {
    const date = datePart(post.at);
    const last = days[days.length - 1];
    if (last && last.date === date) last.posts.push(post);
    else days.push({ date, posts: [post] });
  }
  return days;
}

export function Chat({
  projectId,
  viewer,
  title,
  heading = "h2",
  fill,
}: {
  projectId: ProjectId;
  viewer: PersonId;
  title: string;
  heading?: "h1" | "h2";
  /** How the panel takes its height: the client's full screen or a staff tab. */
  fill: "client" | "staff";
}) {
  const demo = useDemo();
  const firm = useFirm();
  const chat = inRecordOrder(firm.chat(projectId), demo.events);
  const lastId = chat[chat.length - 1]?.id;
  const [lightbox, setLightbox] = useState<{ photos: ChatPhoto[]; index: number; caption: string; from: string } | null>(
    null,
  );
  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const openedAt = useRef(0);

  // Opening the chat, and each new message while it is open, marks it read.
  const markRead = useEffectEvent(() => demo.readThread(projectId, viewer));
  useEffect(() => {
    markRead();
  }, [projectId, viewer, lastId]);

  // Open at the latest; follow new messages while the reader is at the bottom. A message
  // that arrives once the chat has settled rises in.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const now = performance.now();
    if (openedAt.current === 0) openedAt.current = now;
    else if (now - openedAt.current > 800) {
      const last = el.lastElementChild?.lastElementChild?.lastElementChild;
      if (last instanceof HTMLElement && !last.classList.contains("chat-new")) last.classList.add("chat-new");
    }
    if (stick.current) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  // On a staff tab the panel takes the rest of the screen under the project board, so the
  // composer sits at its foot; where too little is left it keeps its own height and the
  // page scrolls to it.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (fill !== "staff" || !panel) return;
    const fit = () => {
      const top = panel.getBoundingClientRect().top + window.scrollY;
      const tabBar = window.innerWidth < 1024 ? 72 : 0;
      const room = window.innerHeight - top - tabBar - 24;
      panel.style.height = room >= 416 ? `${Math.min(room, 960)}px` : "";
      const el = scrollRef.current;
      if (el && stick.current) el.scrollTop = el.scrollHeight;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fill]);

  const people = [...new Set(chat.filter((p) => p.side !== "system").map((p) => p.by))];
  const others = people.filter((id) => id !== viewer).map((id) => firm.person(id)?.first ?? id);
  const members = [...others.slice(0, 4), ...(others.length > 4 ? [`+${others.length - 4}`] : []), "You"].join(", ");
  const Heading = heading;

  return (
    <section
      ref={panelRef}
      className={`glass flex flex-col overflow-hidden ${fill === "client" ? "chat-fill-client" : "chat-fill-staff"}`}
      aria-label={title}
    >
      <header className="flex items-center gap-3 border-b border-ink/10 px-4 py-3">
        <span className="grid size-11 flex-none place-items-center rounded-full bg-rosewood text-lime" aria-hidden>
          <HouseIcon size={22} />
        </span>
        <div className="min-w-0">
          <Heading className="truncate text-17 font-semibold text-ink">
            {heading === "h1" && <span className="sr-only">Updates, </span>}
            {title}
          </Heading>
          <p className="truncate text-13 text-ink-soft">{members}</p>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="chat-scroll min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-4 sm:px-5"
        role="log"
        aria-label="Messages"
        tabIndex={0}
        onScroll={(event) => {
          const el = event.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
        }}
      >
        {chat.length === 0 ? (
          <p className="grid h-full place-items-center text-15 text-ink-soft">No messages yet</p>
        ) : (
          byDay(chat).map((day) => (
            <section key={day.date} className="relative pt-2" aria-label={dayWords(day.date)}>
              <p className="chat-day pb-2">
                <span className="chat-day-fade" aria-hidden />
                <span className="chat-day-pill">{dayWords(day.date)}</span>
              </p>
              <ol className="grid">
                {day.posts.map((post, i) => {
                  const before = day.posts[i - 1];
                  if (post.side === "system") {
                    return (
                      <li key={post.id} className="my-2 flex justify-center">
                        <p className={`chat-note ${post.kind === "decision" ? "" : "chat-note-version"}`}>
                          {post.kind === "decision" ? (
                            <SealIcon size={16} className="mt-px flex-none text-kota" />
                          ) : (
                            <SheetIcon size={16} className="mt-px flex-none text-brass-deep" />
                          )}
                          <span>
                            {post.kind !== "decision" && (
                              <>
                                <b className="font-semibold">{post.by === viewer ? "You" : post.first}</b>
                                {" · "}
                              </>
                            )}
                            {post.by === viewer && post.selfText ? post.selfText : post.text}{" "}
                            <time dateTime={post.at} className="whitespace-nowrap text-ink-soft">
                              {formatTime(post.at)}
                            </time>
                          </span>
                        </p>
                      </li>
                    );
                  }
                  const own = post.by === viewer;
                  const first = !before || before.side === "system" || before.by !== post.by;
                  const person = firm.person(post.by);
                  const photos = photosOf(post);
                  const caption = `${own ? "You" : post.name}, ${dayWords(day.date)} ${formatTime(post.at)}`;
                  // The photos' own text: whose they are and when, as the caption says it.
                  const from = `${own ? "Your photo" : `Photo from ${post.name}`}, ${dayWords(day.date)} ${formatTime(post.at)}`;
                  return (
                    <li key={post.id} className={`flex ${own ? "justify-end" : "justify-start"} ${first ? "mt-2.5" : "mt-1"}`}>
                      <article
                        className={`chat-bubble ${own ? "chat-bubble-own" : "chat-bubble-other"} ${first ? "chat-first" : ""} ${photos.length > 0 ? "chat-has-photos" : ""}`}
                      >
                        {own ? (
                          <span className="sr-only">You: </span>
                        ) : first ? (
                          <p className={`truncate text-13 ${photos.length > 0 ? "px-1.5 pt-0.5 pb-1" : ""}`}>
                            <span className="font-semibold" style={{ color: colourOf(post.by) }}>
                              {post.name}
                            </span>
                            {person && <span className="text-ink-soft"> · {roleWords(person)}</span>}
                          </p>
                        ) : (
                          <span className="sr-only">{post.name}: </span>
                        )}
                        {photos.length > 0 && (
                          <PhotoGrid
                            photos={photos}
                            from={from}
                            onOpen={(index) => setLightbox({ photos, index, caption, from })}
                          />
                        )}
                        {post.text && (
                          <p className={`text-15 whitespace-pre-wrap text-ink ${photos.length > 0 ? "px-1.5 pt-1 pb-0.5" : ""}`}>
                            {post.text}
                            <span className="chat-time-room" aria-hidden />
                          </p>
                        )}
                        <span className={`chat-time ${post.text ? "" : "chat-time-on-photo"}`}>
                          <time dateTime={post.at}>{formatTime(post.at)}</time>
                          {own && post.ticks && <Ticks state={post.ticks} />}
                        </span>
                      </article>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))
        )}
      </div>

      <ChatComposer
        projectId={projectId}
        by={viewer}
        onSent={() => {
          stick.current = true;
        }}
      />

      <Lightbox
        open={lightbox !== null}
        photos={lightbox?.photos ?? []}
        index={lightbox?.index ?? 0}
        caption={lightbox?.caption ?? ""}
        from={lightbox?.from}
        onIndex={(index) => setLightbox((box) => (box ? { ...box, index } : box))}
        onClose={() => setLightbox(null)}
      />
    </section>
  );
}
