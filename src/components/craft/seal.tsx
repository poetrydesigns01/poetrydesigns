"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

// The two brass marks, for use in words and lists. Brass is only ever her word: a seal is
// flat and means she agreed; a peg stands and means something is waiting for her. The marks
// on the house itself are drawn by the house; these are the same shapes at text size.

/**
 * Calls `onHidden` when the screen this element is on is hidden. A hidden screen stays in
 * the document, so anything that entered with a small motion would enter again on the way
 * back unless its entering class is dropped here.
 */
export function useOnHidden(ref: RefObject<Element | null>, onHidden: () => void): void {
  const latest = useRef(onHidden);

  useLayoutEffect(() => {
    latest.current = onHidden;
  });

  useLayoutEffect(() => {
    const el = ref.current;
    return () => {
      // This also runs when the element simply goes away. Only a hidden screen leaves it
      // in the document with nothing drawn, and that is known once the change has landed.
      window.setTimeout(() => {
        if (el && el.isConnected && el.getClientRects().length === 0) latest.current();
      }, 0);
    };
  }, [ref]);
}

/** A flat round seal with an engraved tick: she agreed this. */
export function Seal({
  size = 24,
  tone = "brass",
  press = false,
}: {
  size?: 16 | 24 | 40;
  /** "brass" for the screen; "line" is outline only and prints in black. */
  tone?: "brass" | "line";
  /** Press it in as it appears. For a seal that is there because of what she just did. */
  press?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [fresh, setFresh] = useState(true);
  useOnHidden(ref, () => setFresh(false));

  return (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`seal${press && fresh ? " enter-press" : ""}`}
      data-tone={tone}
      aria-hidden="true"
      focusable="false"
    >
      <circle className="seal-disc" cx="12" cy="12" r="11.4" />
      {size > 16 && <circle className="seal-rim" cx="12" cy="12" r="8.8" />}
      <path className="seal-tick" d="M7.4 12.5l3.1 3.1 6.2-6.9" />
    </svg>
  );
}

/** A round brass head on a thin stem, standing on its own shadow: this is waiting for her. */
export function Peg({
  size = 22,
  drop = false,
}: {
  size?: 22 | 28;
  /** Drop it in as it appears. */
  drop?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [fresh, setFresh] = useState(true);
  useOnHidden(ref, () => setFresh(false));

  return (
    <svg
      ref={ref}
      viewBox="0 0 16 22"
      width={(size * 16) / 22}
      height={size}
      className={`peg${drop && fresh ? " enter-drop" : ""}`}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse className="peg-shadow" cx="8" cy="20.4" rx="5" ry="1.6" />
      <rect className="peg-stem" x="7" y="10" width="2" height="10.6" />
      <circle className="peg-head" cx="8" cy="6.5" r="5.75" />
      <circle className="peg-eye" cx="8" cy="6.5" r="1.75" />
    </svg>
  );
}
