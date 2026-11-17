/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */

// The one way the firm's name is set. A small house stands on the baseline of the name: its
// left half is still the drawing, dashed, and its right half is built in laterite. "From
// concept to reality" in one mark. The name is the hero; a project or a place can follow it,
// after a hairline or under the name, and always reads as second.

type BrandSize = "nav" | "rail" | "hero";

/**
 * - `inline`: after a hairline, on the name's baseline.
 * - `stacked`: on its own line under the name, from the name's first letter.
 * - `adaptive`: stacked on phones, inline from 640px up.
 */
type ContextLayout = "inline" | "stacked" | "adaptive";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="2 2 28 28" className={`brand-mark ${className}`} aria-hidden="true" focusable="false">
      {/* The drawing: the left half of the house as a dashed line. */}
      <path className="brand-mark-drawn" d="M15.4 4.2 4 13.4V29h11.4" />
      {/* The building: the right half, solid, with its door left open. */}
      <path className="brand-mark-built" d="M16.6 3 29 13v17h-6.2v-8.6h-3.9V30h-2.3z" />
    </svg>
  );
}

export function Brand({
  size = "nav",
  context,
  layout = "inline",
  className = "",
}: {
  size?: BrandSize;
  /** A project name or the name of a place, set second to the firm's. */
  context?: string;
  layout?: ContextLayout;
  className?: string;
}) {
  return (
    <span className={`brand brand-${size} ${className}`} data-layout={context ? layout : undefined}>
      <BrandMark />
      <span className="brand-word">Poetry Designs</span>
      {context && (
        <>
          <span className="brand-rule" aria-hidden="true" />
          <span className="brand-context">{context}</span>
        </>
      )}
    </span>
  );
}
