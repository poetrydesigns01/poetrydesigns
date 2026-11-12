"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { flushSync } from "react-dom";
import { usePause } from "@/components/register/recording-pause";
import { useDemo } from "@/lib/demo-store";
import { useHold, usePrefersReducedMotion } from "@/lib/motion";
import { Seal, useOnHidden } from "./seal";

// The one way anything is approved on the client side. A tap, Enter or Space opens a
// two-step confirm in place; pressing and holding until the ring closes approves by hand.
// Either way nothing is recorded at once: the pause along the bottom says "Recording in
// 5 seconds" with a Cancel, and then the button becomes a sentence that stays. There is
// no undo after that.

/**
 * Put on the wrapper of an undecided control: below 1024 px it rides along the bottom of the
 * screen, just above the tab bar (and above the trial strip while a change is being tried,
 * through --trial-h), while its sheet is in view. The bar keeps to one row: the note and the
 * hint stay off it. Once the confirm question or "Ask for changes" opens, the bar lets go and
 * the question stands in the sheet, so it never covers the screen. The pause docks over it.
 * The wrapper sits directly in its sheet, or in a page section that spans it.
 */
export const DECISION_BAR =
  "max-lg:sticky max-lg:bottom-[calc(3.5rem+env(safe-area-inset-bottom)+var(--trial-h,0px))] max-lg:has-[.approve-confirm]:static max-lg:has-[[data-asking]]:static max-lg:z-10 max-lg:bg-lime max-lg:py-3 max-lg:shadow-[0_-1px_0_var(--color-sand)] max-sm:-mx-4 max-sm:px-4 sm:max-lg:-mx-8 sm:max-lg:px-8 max-lg:[&_details.approve-aside]:hidden! max-lg:[&_.approve-hint]:hidden! max-lg:[&_.approve-actions]:flex-nowrap! max-lg:[&_.approve-actions]:gap-2! max-lg:[&_.approve-button]:pr-4! max-lg:[&_.approve-actions_.btn]:min-w-0 max-lg:[&_.approve-actions_.btn]:px-3! max-lg:[&_.approve-button]:shrink-0 max-lg:[&_.approve-button]:whitespace-nowrap max-[359px]:[&_.approve-actions_.btn]:text-15! max-[359px]:[&_.approve-button]:text-15! max-[359px]:[&_.approve-button]:gap-1.5! max-[359px]:[&_.approve-actions_.approve-button]:pr-3! max-[359px]:[&_.approve-ring]:size-6! max-[359px]:[&_.approve_.approve-actions_.btn]:px-2! max-[359px]:[&_.approve_.approve-actions]:gap-1.5! max-lg:[&_.approve]:flex max-lg:[&_.approve]:flex-col max-lg:[&_.approve-confirm]:order-first max-lg:[&_.approve-confirm]:mt-0! max-lg:[&_.approve-confirm]:mb-3";

export function ApproveControl({
  label = "Hold to approve",
  confirmTitle,
  confirmBody,
  approved,
  onApprove,
  receipt,
  holdTarget,
  scopeRef,
  secondary,
  note = false,
  disabled,
  what,
}: {
  /** On the button. "Hold to approve" unless given: "Hold to approve ₹10,27,780". */
  label?: string;
  /** The question in the confirm row: "Approve ₹10,27,780 for the first floor structure?" */
  confirmTitle: string;
  confirmBody: string;
  /** From the store. */
  approved: boolean;
  /** One synchronous store write, run when the pause ends. Gets the note when one was written. */
  onApprove: (note?: string) => void;
  /** The sentence that takes the button's place once approved. */
  receipt: ReactNode;
  /** Anchor key, set as data-holding on the scope during a hold. */
  holdTarget?: string;
  /** Usually the page's table, so the house can follow the hold. */
  scopeRef?: RefObject<HTMLElement | null>;
  /** "Ask for changes", shown beside the button. */
  secondary?: ReactNode;
  /** Offer "Add a note to your approval". */
  note?: boolean;
  /** Why it cannot be approved yet. The button stays in the tab order and says so. */
  disabled?: string;
  /** What is being recorded, for the screen reader in the pause: "Your approval of ₹10,27,780". */
  what?: string;
}) {
  const demo = useDemo();
  const pause = usePause();
  const reduced = usePrefersReducedMotion();
  const titleId = useId();
  const hintId = useId();
  const reasonId = useId();
  const noteId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [noteText, setNoteText] = useState("");
  /** The hint is shown by the control that taught it, once per tab. */
  const [hinting, setHinting] = useState(false);
  /** This control started the pause that is running, or that has just been recorded. */
  const [started, setStarted] = useState(false);
  /** Approved just now, by this control: the seal may press in. */
  const [fresh, setFresh] = useState(false);
  const [wasApproved, setWasApproved] = useState(approved);
  if (wasApproved !== approved) {
    setWasApproved(approved);
    if (approved && started) setFresh(true);
    if (approved) setStarted(false);
  }
  const said = what ?? confirmTitle;
  // A pause that was cancelled, or recorded, is no longer this control's.
  if (started && !approved && pause.pending === null && wasApproved === approved) setStarted(false);

  const waiting = started && pause.pending !== null && pause.pending.what === said;
  const blocked = Boolean(disabled) || waiting;

  // Leaving the screen settles it: no open question and nothing left to press in again.
  useOnHidden(rootRef, () => {
    setConfirming(false);
    setFresh(false);
  });

  /** The first touch of any approve control in this tab shows how it works. */
  const teach = () => {
    if (demo.taught.hold || hinting) return;
    setHinting(true);
    demo.teach("hold");
  };

  const openConfirm = () => {
    if (blocked) return;
    flushSync(() => setConfirming(true));
    // The question may open under a bar along the bottom; bring it just clear of it.
    confirmRef.current?.focus({ preventScroll: true });
    confirmRef.current?.closest(".approve-confirm")?.scrollIntoView({ block: "nearest" });
  };

  const closeConfirm = () => {
    flushSync(() => setConfirming(false));
    buttonRef.current?.focus();
  };

  /** Both ways in end here: the pause starts, and the store is written when it ends. */
  const begin = () => {
    if (blocked) return;
    const written = note && noteText.trim() ? noteText.trim() : undefined;
    const hadFocus = rootRef.current?.matches(":focus-within") ?? false;
    // The pause and this control's own state land in one render, so the button is set
    // aside for exactly as long as the pause runs.
    flushSync(() => {
      pause.start({
        what: said,
        origin: buttonRef.current,
        commit: () => {
          const focused = rootRef.current?.matches(":focus-within") ?? false;
          flushSync(() => onApprove(written));
          if (focused) receiptRef.current?.focus({ preventScroll: true });
        },
      });
      setConfirming(false);
      setStarted(true);
    });
    if (hadFocus) buttonRef.current?.focus({ preventScroll: true });
  };

  const { phase, bind } = useHold({
    disabled: reduced || approved || blocked,
    scopeRef,
    target: holdTarget,
    onTap: openConfirm,
    onComplete: begin,
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && confirming) {
      event.stopPropagation();
      closeConfirm();
    }
  };

  const hint = reduced ? "Tap to approve in two steps." : "Tap to approve in two steps, or press and hold until the ring closes.";
  const describedBy = [hinting ? hintId : null, disabled ? reasonId : null].filter(Boolean).join(" ") || undefined;

  return (
    // While "Ask for changes" is open beside it, the approve button and its notes stand aside,
    // so the view keeps one filled control.
    <div
      ref={rootRef}
      className="approve [&:has([data-asking])_.approve-aside]:hidden! [&:has([data-asking])_.approve-button]:hidden!"
      onKeyDown={onKeyDown}
    >
      {!approved && (
        <>
          <div className="approve-actions">
            <button
              ref={buttonRef}
              type="button"
              className={`approve-button${blocked ? " opacity-60" : ""}`}
              data-phase={phase}
              aria-expanded={confirming}
              aria-disabled={blocked || undefined}
              aria-describedby={describedBy}
              onFocus={teach}
              onPointerDownCapture={teach}
              {...bind}
            >
              <svg className="approve-ring" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle className="approve-ring-track" cx="12" cy="12" r="9.5" />
                <circle className="approve-ring-fill" cx="12" cy="12" r="9.5" pathLength={1} />
              </svg>
              <span className="approve-label">
                <span className="approve-label-rest">{label}</span>
                <span className="approve-label-hold" aria-hidden="true">
                  Keep holding
                </span>
              </span>
            </button>
            {!waiting && secondary}
          </div>
          {disabled && (
            <p id={reasonId} className="approve-hint approve-aside">
              {disabled}
            </p>
          )}
          {hinting && !disabled && (
            <p id={hintId} className="approve-hint approve-aside">
              {hint}
            </p>
          )}
          {note && !waiting && (
            <details className="approve-aside mt-2">
              <summary className="link inline-flex min-h-11 cursor-pointer items-center">
                Add a note to your approval
              </summary>
              <label htmlFor={noteId} className="sr-only">
                Your note
              </label>
              <textarea
                id={noteId}
                rows={2}
                maxLength={400}
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                className="mt-1 block min-h-[4.5rem] w-full max-w-[36rem] rounded-[3px] border border-current/60 bg-transparent px-3 py-2 text-17 leading-snug"
              />
            </details>
          )}
          {confirming && (
            <div className="approve-confirm enter-row" role="group" aria-labelledby={titleId}>
              <p id={titleId} className="font-semibold">
                {confirmTitle}
              </p>
              <p className="mt-1">{confirmBody}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button ref={confirmRef} type="button" className="btn btn-primary" onClick={begin}>
                  Confirm approval
                </button>
                <button type="button" className="btn btn-quiet" onClick={closeConfirm}>
                  Go back
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Always here, so a screen reader is told when the sentence arrives. */}
      <div ref={receiptRef} className="approve-receipt" tabIndex={-1}>
        {approved && <Seal size={24} press={fresh} />}
        <div role="status" className="approve-receipt-words">
          {approved && <div className={fresh ? "enter-row" : undefined}>{receipt}</div>}
        </div>
      </div>
    </div>
  );
}
