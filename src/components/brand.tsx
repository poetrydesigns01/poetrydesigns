/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { useId, type CSSProperties } from "react";

// The one way the firm's logo is set: the house mark beside the word POETRY, both exactly as
// the firm's own logo draws them, in their own orange. The mark is the firm's vector (also in
// public/brand/poetry-mark.svg), the word is the firm's own lettering as an image, never
// retyped. A project or a place can follow the logo, after a hairline or under the word, and
// always reads as second. Every length comes from the mark's height, --brand-h.

type BrandSize = "nav" | "rail" | "hero";

/**
 * - `inline`: after a hairline, centred on the logo.
 * - `stacked`: on its own line under the word, from its first letter.
 * - `adaptive`: stacked on phones, inline from 640px up.
 */
type ContextLayout = "inline" | "stacked" | "adaptive";

/** The mark's own box, so its width follows its height. */
export const MARK_WIDTH = 848.9;
export const MARK_HEIGHT = 880.6;

/** The word POETRY as the logo sets it, at its native size. */
export const WORDMARK = { src: "/brand/poetry-wordmark.webp", width: 804, height: 157 } as const;

/**
 * The house mark, the firm's own vector. Each copy names its own gradient, so any number of
 * them can share a page.
 */
export function PoetryMark({
  height,
  className,
  style,
}: {
  /** The drawn height in px; leave it out to size the mark from CSS. */
  height?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const fill = `poetry-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox={`0 0 ${MARK_WIDTH} ${MARK_HEIGHT}`}
      width={height ? Math.round((height * MARK_WIDTH) / MARK_HEIGHT) : 31}
      height={height ?? 32}
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={fill} gradientUnits="userSpaceOnUse" x1="192.4" y1="92.8" x2="806.2" y2="390.4">
          <stop offset="0" stopColor="#C83C0D" />
          <stop offset="1" stopColor="#DA7720" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${fill})`}
        d="M3.8 372A2.4 2.4 0 0 1 0 370L0 312.8A107.6 107.6 0 0 1 47.6 223.4L343.1 24.7A145.3 145.3 0 0 1 505.3 24.7L800.1 223A110.6 110.6 0 0 1 848.9 314.7L848.9 360.3A2.4 2.4 0 0 1 845.2 362.3L504 130.3A141.6 141.6 0 0 0 342.5 131.9ZM0 440.5A2.4 2.4 0 0 1 1 438.5L341.6 196.8A142.8 142.8 0 0 1 504.6 195.3L847.9 429.3A2.4 2.4 0 0 1 848.9 431.3L848.9 785.7A94.9 94.9 0 0 1 754 880.6L596.6 880.6L596.6 649.7A92.9 92.9 0 0 0 503.7 556.9L344.5 556.9A94.3 94.3 0 0 0 250.2 651.2L250.2 880.6L94 880.6A94 94 0 0 1 0 786.6ZM302.2 880.6L302.2 681A66.5 66.5 0 0 1 368.7 614.5L477.9 614.5A66.6 66.6 0 0 1 544.5 681.1L544.5 880.6Z"
      />
    </svg>
  );
}

export function Brand({
  size = "nav",
  context,
  layout = "inline",
  priority = false,
  className = "",
}: {
  size?: BrandSize;
  /** A project name or the name of a place, set second to the firm's. */
  context?: string;
  layout?: ContextLayout;
  /** The first thing on the screen (the sign-in page): fetch the word before anything else. */
  priority?: boolean;
  className?: string;
}) {
  return (
    <span className={`brand brand-${size} ${className}`} data-layout={context ? layout : undefined}>
      <PoetryMark className="brand-mark" />
      {/* The firm's own lettering, so an image; its words are the firm's name. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="brand-word"
        src={WORDMARK.src}
        width={WORDMARK.width}
        height={WORDMARK.height}
        alt="Poetry Designs"
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        draggable={false}
      />
      {context && (
        <>
          <span className="brand-rule" aria-hidden="true" />
          <span className="brand-context">{context}</span>
        </>
      )}
    </span>
  );
}
