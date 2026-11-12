"use client";

import { useEffect, useState } from "react";

/**
 * The sentence under the house. What is seen changes at once; what a screen reader is told
 * follows half a second after the text last changed, so scrubbing does not chatter. While
 * silent, the sentence on the screen is there to be read and nothing is announced. When
 * the same sentence is already on the screen elsewhere, `visible={false}` keeps it for
 * screen readers only, with the same live behaviour.
 */
export function HouseCaption({
  children,
  tag,
  silent = false,
  visible = true,
}: {
  children: string;
  tag?: string;
  /** Something else is announcing this change, so the sentence is shown and not spoken again. */
  silent?: boolean;
  /** False when the sentence is already said on the screen; it is then for screen readers only. */
  visible?: boolean;
}) {
  const text = tag ? `${tag}. ${children}` : children;
  const [spoken, setSpoken] = useState(text);

  // Going silent empties the line, so the sentence that follows the silence is heard as new.
  useEffect(() => {
    const timer = window.setTimeout(() => setSpoken(silent ? "" : text), silent ? 0 : 500);
    return () => window.clearTimeout(timer);
  }, [text, silent]);

  const shown = visible ? "max-w-[56ch] text-15 leading-snug" : "sr-only";

  return (
    <div className="house-caption">
      <p aria-hidden={silent ? undefined : true} className={shown}>
        {tag && (
          <span className="lettering mr-2 inline-block rounded-[2px] border border-current/50 px-1.5 py-px align-[0.08em]">
            {tag}
          </span>
        )}
        {children}
      </p>
      <p role="status" className="sr-only">
        {spoken}
      </p>
    </div>
  );
}
