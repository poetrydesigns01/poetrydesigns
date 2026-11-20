/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId } from "react";

// A segmented choice on glass: every option on screen, the chosen one filled rosewood. Used
// for filters (level, mine or everyone) and for the enquiry form's one-of choices.

export type SegmentOption<T extends string | number> = { id: T; label: string; count?: number; title?: string };

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  showLabel = false,
  scroll = false,
  invalid = false,
  className = "",
}: {
  label: string;
  options: SegmentOption<T>[];
  value: T | null;
  /** The pressed button comes too, for the pause bar to return focus to. */
  onChange: (id: T, origin: HTMLElement) => void;
  /** Show the label above (form use); otherwise it is for screen readers only. */
  showLabel?: boolean;
  /** One line that scrolls sideways on a phone, instead of wrapping. */
  scroll?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className={`grid min-w-0 content-start gap-1.5 ${className}`}>
      <p id={id} className={showLabel ? "text-15 font-semibold text-ink" : "sr-only"}>
        {label}
      </p>
      <div
        className={`glass-inner flex max-w-full gap-1 rounded-2xl p-1 ${invalid ? "ring-2 ring-brick/60" : ""} ${
          scroll ? "flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "flex-wrap"
        }`}
      >
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={String(o.id)}
              type="button"
              aria-pressed={on}
              title={o.title}
              onClick={(event) => onChange(o.id, event.currentTarget)}
              className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 text-15 ${
                on ? "bg-rosewood font-semibold text-lime" : "text-ink hover:bg-white/60"
              }`}
            >
              {o.label}
              {o.count !== undefined && <span className={`figure text-13 ${on ? "text-lime/80" : "text-ink-soft"}`}>{o.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
