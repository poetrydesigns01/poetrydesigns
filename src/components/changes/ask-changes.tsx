"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { useOnHidden } from "@/components/craft/seal";
import { usePause } from "@/components/register/recording-pause";

// "Ask for changes": the other way to answer anything put to her. It is two plain steps,
// the button and then the question in place, and the comment is required, so the person
// who has to act on it knows what to change. Sending waits in the pause like an approval.

export function AskForChanges({
  what,
  prompt = "What would you like changed?",
  onSend,
}: {
  /** For the pause, read to a screen reader: "Your request for changes to the jacuzzi". */
  what: string;
  prompt?: string;
  /** One synchronous store write, run when the pause ends. */
  onSend: (comment: string) => void;
}) {
  const pause = usePause();
  const fieldId = useId();
  const errorId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const sending = pause.pending !== null && pause.pending.what === what;

  // An open question does not wait for her on a screen she has left.
  useOnHidden(rootRef, () => setOpen(false));

  const openQuestion = () => {
    flushSync(() => setOpen(true));
    fieldRef.current?.focus({ preventScroll: true });
    fieldRef.current?.closest("[role=group]")?.scrollIntoView({ block: "nearest" });
  };

  const close = () => {
    if (sending) pause.cancel();
    flushSync(() => {
      setOpen(false);
      setError("");
    });
    buttonRef.current?.focus();
  };

  const send = () => {
    if (sending) return;
    const text = comment.trim();
    if (text.length < 10) {
      setError("Add a comment");
      fieldRef.current?.focus();
      return;
    }
    pause.start({
      what,
      origin: sendRef.current,
      commit: () => {
        // The draft goes only once it is recorded.
        flushSync(() => onSend(text));
        setComment("");
        setOpen(false);
      },
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !sending) {
      event.stopPropagation();
      close();
    }
  };

  return (
    <div ref={rootRef} className="contents">
      {!open && (
        <button ref={buttonRef} type="button" className="btn btn-glass" onClick={openQuestion}>
          Ask for changes
        </button>
      )}
      {open && (
        <div
          role="group"
          data-asking=""
          aria-labelledby={fieldId}
          className="glass-inner enter-row w-full max-w-[36rem] scroll-my-3 p-4"
          onKeyDown={onKeyDown}
        >
          <label htmlFor={`${fieldId}-field`} id={fieldId} className="block text-15 font-semibold">
            {prompt}
          </label>
          <textarea
            ref={fieldRef}
            id={`${fieldId}-field`}
            rows={3}
            maxLength={600}
            required
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setError("");
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="glass-field mt-2 block min-h-[5.5rem] w-full px-3 py-2 text-17 leading-snug text-ink"
          />
          {error && (
            <p id={errorId} className="late-text mt-2 text-15">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              ref={sendRef}
              type="button"
              className="btn btn-primary"
              aria-disabled={sending || undefined}
              onClick={send}
            >
              Send
            </button>
            <button type="button" className="btn btn-glass" onClick={close}>
              Go back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
