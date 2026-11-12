"use client";

import { useEffect, useState } from "react";
import { dayCount, inr } from "@/lib/format";

// A figure whose digits roll to their new value when it changes. Each digit is its own
// column, counted from the right, so the units stay where they are when the figure gets
// longer. It never counts up from zero: the first value is simply there.

const plainFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function write(value: number, format: "inr" | "days" | "plain"): string {
  if (format === "inr") return inr(value);
  if (format === "days") return dayCount(Math.round(value));
  return plainFormat.format(Math.round(value));
}

export function RollingFigure({
  value,
  format = "inr",
  className,
}: {
  value: number;
  /** "inr" gives ₹87,10,000, "days" gives 12 days, "plain" gives the number alone. */
  format?: "inr" | "days" | "plain";
  className?: string;
}) {
  // Rolling is switched on one frame after the figure first appears, so the value this tab
  // remembers is shown at once and only a change made in front of her moves.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const text = write(value, format);
  const first = text.search(/\d/);
  const last = text.length - 1 - [...text].reverse().findIndex((char) => /\d/.test(char));
  // Everything from the first digit to the last rolls; the rupee sign and any words do not.
  const before = first < 0 ? text : text.slice(0, first);
  const number = first < 0 ? "" : text.slice(first, last + 1);
  const after = first < 0 ? "" : text.slice(last + 1);

  return (
    <span className={`rolling${className ? ` ${className}` : ""}`} data-ready={ready ? "" : undefined}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {before && <span className="rolling-cell">{before}</span>}
        {[...number].map((char, index) => {
          const place = number.length - 1 - index;
          return /\d/.test(char) ? (
            <span key={`digit-${place}`} className="rolling-col">
              <span className="rolling-reel" style={{ transform: `translateY(-${Number(char) * 10}%)` }}>
                {DIGITS.map((digit) => (
                  <span key={digit}>{digit}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={`mark-${place}`} className="rolling-cell">
              {char}
            </span>
          );
        })}
        {after && <span className="rolling-cell">{after}</span>}
      </span>
    </span>
  );
}
