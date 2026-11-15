"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { stampNow } from "@/lib/clock";
import { getDemoSnapshot, useDemo } from "@/lib/demo-store";
import type { PersonId, PhotoKind, ProjectId } from "@/lib/firm-data";
import { AttachIcon, CameraIcon, CheckIcon, CloseIcon, SendIcon } from "./icons";
import { PhotoArt, photoWords, rememberDevicePhoto, SAMPLE_KINDS, type ChatPhoto } from "./photos";

// The message box at the foot of the chat: attach photos, write, send. Sending is immediate.

const MAX_PHOTOS = 6;

export function ChatComposer({ projectId, by, onSent }: { projectId: ProjectId; by: PersonId; onSent: () => void }) {
  const demo = useDemo();
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<ChatPhoto[]>([]);
  const [tray, setTray] = useState(false);
  const attachRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const firstPickRef = useRef<HTMLButtonElement>(null);
  const trayId = useId();
  const inputId = useId();

  // Opening the tray takes the focus into it, so the keyboard reaches the photos first.
  useEffect(() => {
    if (tray) firstPickRef.current?.focus();
  }, [tray]);

  const ready = text.trim().length > 0 || chosen.length > 0;
  const isChosen = (kind: PhotoKind) => chosen.some((p) => p.type === "sample" && p.kind === kind);

  const toggleSample = (kind: PhotoKind) =>
    setChosen((list) =>
      list.some((p) => p.type === "sample" && p.kind === kind)
        ? list.filter((p) => !(p.type === "sample" && p.kind === kind))
        : list.length >= MAX_PHOTOS
          ? list
          : [...list, { type: "sample", kind }],
    );

  const fromDevice = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])].filter((f) => f.type.startsWith("image/"));
    for (const file of files) rememberDevicePhoto(file.name, file);
    setChosen((list) => [...list, ...files.map((f): ChatPhoto => ({ type: "file", name: f.name }))].slice(0, MAX_PHOTOS));
    event.target.value = "";
    setTray(false);
    inputRef.current?.focus();
  };

  const send = () => {
    if (!ready) return;
    // The id is counted at the moment of recording, so two posts never share one.
    const count = getDemoSnapshot().events.filter((e) => e.kind === "post.added").length;
    const photos = chosen.flatMap((p) => (p.type === "sample" ? [p.kind] : []));
    const files = chosen.flatMap((p) => (p.type === "file" ? [p.name] : []));
    demo.record({
      kind: "post.added",
      post: {
        id: `p-live-${count + 1}`,
        projectId,
        by,
        at: stampNow(),
        text: text.trim(),
        photos,
        ...(files.length > 0 ? { files } : {}),
        storey: null,
        kind: "post",
      },
      by,
    });
    setText("");
    setChosen([]);
    setTray(false);
    onSent();
    inputRef.current?.focus();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send();
  };

  // Enter sends on a keyboard; on a touch screen Enter is a new line and the button sends.
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    event.preventDefault();
    send();
  };

  const closeTray = () => {
    setTray(false);
    attachRef.current?.focus();
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape" && tray) {
          event.stopPropagation();
          closeTray();
        }
      }}
      className="relative border-t border-ink/10 px-2 pt-2 pb-2 sm:px-3 sm:pb-3"
      noValidate
    >
      {tray && (
        <div
          id={trayId}
          role="group"
          aria-label="Add photos"
          className="chat-tray glass-pop absolute inset-x-2 bottom-full z-10 mb-2 grid gap-3 p-3 sm:inset-x-3 sm:right-auto sm:w-[26rem]"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="lettering text-ink-soft">Site photos</p>
            <button type="button" className="chat-round btn btn-glass" onClick={closeTray} aria-label="Close photos">
              <CloseIcon size={18} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {SAMPLE_KINDS.map((kind, i) => (
              <button
                key={kind}
                ref={i === 0 ? firstPickRef : undefined}
                type="button"
                className="chat-pick"
                aria-pressed={isChosen(kind)}
                onClick={() => toggleSample(kind)}
                aria-label={photoWords({ type: "sample", kind })}
              >
                <span className="chat-photo">
                  <PhotoArt photo={{ type: "sample", kind }} />
                </span>
                {isChosen(kind) && (
                  <span className="chat-pick-mark" aria-hidden>
                    <CheckIcon size={14} />
                  </span>
                )}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-glass min-h-11 justify-center gap-2" onClick={() => fileRef.current?.click()}>
            <CameraIcon size={18} />
            From device
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={fromDevice} />
        </div>
      )}

      {chosen.length > 0 && (
        <ul className="mb-2 flex gap-2 overflow-x-auto px-1 pt-1 pb-1" aria-label="Photos to send">
          {chosen.map((photo, i) => (
            <li key={`${photo.type}-${photo.type === "sample" ? photo.kind : photo.name}-${i}`} className="relative w-20 flex-none">
              <span className="chat-photo">
                <PhotoArt photo={photo} />
              </span>
              <button
                type="button"
                className="absolute -top-1 -right-1 grid size-11 place-items-start justify-end p-0.5"
                onClick={() => setChosen((list) => list.filter((_, j) => j !== i))}
                aria-label={`Remove ${photoWords(photo)}`}
              >
                <span className="grid size-6 place-items-center rounded-full bg-rosewood text-lime">
                  <CloseIcon size={14} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <button
          ref={attachRef}
          type="button"
          className="chat-round btn btn-glass"
          aria-label="Attach photos"
          aria-expanded={tray}
          aria-controls={tray ? trayId : undefined}
          onClick={() => (tray ? closeTray() : setTray(true))}
        >
          <AttachIcon />
        </button>
        <label htmlFor={inputId} className="sr-only">
          Message
        </label>
        <textarea
          ref={inputRef}
          id={inputId}
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKey}
          placeholder="Message"
          className="glass-field chat-input min-w-0 flex-1 text-17 text-ink lg:text-15 placeholder:text-ink-soft"
        />
        <button type="submit" className="chat-round btn btn-primary" aria-label="Send" aria-disabled={!ready}>
          <SendIcon />
        </button>
      </div>
    </form>
  );
}
