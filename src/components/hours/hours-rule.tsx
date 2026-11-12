"use client";

import type { CSSProperties } from "react";
import { useProjection } from "@/lib/demo-store";
import type { CreditAddition, PersonId } from "@/lib/firm-data";
import { formatDate, formatStamp, hours } from "@/lib/format";
import { personName, type Session } from "@/lib/projection";

// Time with people, drawn as lengths of teak laid to one scale. Every session is an offcut
// as wide as it was long, sawn off the length it came from; what is left is the piece still
// uncut, outlined. Hours bought later are a new length joined on after the second one, with
// who added them and when. Nothing here is a control, and nothing is brass.

const TEAK: CSSProperties = { backgroundImage: "var(--tex-teak)" };
/** Half the width of a saw cut, taken from each piece beside it. */
const KERF = 3;

/** One session in a sentence, without its full stop. */
export function sessionWords(session: Session): string {
  const topic = session.topic.charAt(0).toLowerCase() + session.topic.slice(1);
  return `${hours(session.hours)} on ${formatDate(session.date)}: ${topic}, with ${session.with}`;
}

/** "5 hours added by Rohan Menon on 11 Nov 2026 at 8:10 pm." */
export function addedWords(addition: CreditAddition, names: (id: PersonId) => string): string {
  return `${hours(addition.hours)} added by ${names(addition.by)} on ${formatStamp(addition.at)}.`;
}

/** Hour and half-hour marks under a length, like the edge of a rule. */
function Ticks({ length, scale }: { length: number; scale: number }) {
  const marks = Math.round(length * 2);
  return (
    <div className="relative mt-1 h-1.5" style={{ width: `${(length / scale) * 100}%` }} aria-hidden="true">
      {Array.from({ length: marks + 1 }, (_, index) => (
        <span
          key={index}
          className={`absolute top-0 w-px bg-chalk ${index % 2 === 0 ? "h-1.5 opacity-80" : "h-[3px] opacity-50"}`}
          style={{ left: index === marks ? "calc(100% - 1px)" : `${(index / marks) * 100}%` }}
        />
      ))}
    </div>
  );
}

type Length = {
  title: string;
  /** Hours given at the start, before any were bought. */
  base: number;
  /** Lengths joined on after it, oldest first. */
  added: CreditAddition[];
  used: number;
  /** Oldest first. */
  offcuts: Session[];
};

function Piece({ width, cutLeft, cutRight, children }: { width: string; cutLeft: boolean; cutRight: boolean; children?: string }) {
  return (
    <span className="relative h-full shrink-0" style={{ width, paddingLeft: cutLeft ? KERF : 0, paddingRight: cutRight ? KERF : 0 }}>
      <span className="relative block h-full" style={TEAK}>
        {/* Lighter end grain shows on each sawn face. */}
        {cutLeft && <span className="absolute inset-y-0 left-0 w-[3px] bg-teak-light" />}
        {cutRight && <span className="absolute inset-y-0 right-0 w-[3px] bg-teak-light" />}
        {children && <span className="lettering absolute left-1.5 top-1 text-lime">{children}</span>}
      </span>
    </span>
  );
}

export function HoursRule() {
  const projection = useProjection();
  const { before, during, added, sessions, requested } = projection.credits;
  const names = (id: PersonId) => personName(id);

  const lengths: Length[] = [
    {
      title: "Before construction",
      base: before.granted - added.filter((a) => a.pool === "before").reduce((s, a) => s + a.hours, 0),
      added: added.filter((a) => a.pool === "before"),
      used: before.used,
      offcuts: sessions.filter((s) => s.phase !== "Construction").sort((a, b) => a.date.localeCompare(b.date)),
    },
    {
      title: "During construction",
      base: during.granted - added.filter((a) => a.pool === "during").reduce((s, a) => s + a.hours, 0),
      added: added.filter((a) => a.pool === "during"),
      used: during.used,
      offcuts: sessions.filter((s) => s.phase === "Construction").sort((a, b) => a.date.localeCompare(b.date)),
    },
  ];
  /** Every length is drawn to the longest one, so an hour is the same width on each. */
  const scale = Math.max(...lengths.map((l) => l.base + l.added.reduce((s, a) => s + a.hours, 0)), 1);
  const across = (value: number) => `${(Math.max(0, value) / scale) * 100}%`;

  return (
    <div className="w-full max-w-[44rem]">
      <div className="space-y-7">
        {lengths.map((length, at) => {
          const granted = length.base + length.added.reduce((s, a) => s + a.hours, 0);
          const left = granted - length.used;
          const last = at === lengths.length - 1;
          return (
            <div key={length.title}>
              <p className="lettering">
                <span className="font-bold">{length.title}</span>, {hours(granted)}, {left > 0 ? `${left} left` : "all used"}
              </p>

              {/* The whole length, given and bought; the offcuts lie along it from the left. */}
              <div className="relative mt-2.5 h-14 lg:h-[4.5rem]" aria-hidden="true">
                <div className="flex h-full" style={{ width: across(granted) }}>
                  {length.offcuts.map((session, index) => (
                    <Piece
                      key={session.id}
                      width={`${(session.hours / granted) * 100}%`}
                      cutLeft={index > 0}
                      cutRight={index < length.offcuts.length - 1 || left > 0}
                    >
                      {String(session.hours)}
                    </Piece>
                  ))}
                  {left > 0 && (
                    <span className="h-full shrink-0" style={{ width: `${(left / granted) * 100}%`, paddingLeft: KERF }}>
                      <span className="relative block h-full border-[1.5px] border-dashed border-lime" style={TEAK}>
                        <span className="absolute inset-y-0 left-0 w-[3px] bg-teak-light" />
                      </span>
                    </span>
                  )}
                </div>

                {/* Where a bought length was joined on: a seam of end grain across the wood. */}
                {length.added.map((addition, index) => {
                  const from = length.base + length.added.slice(0, index).reduce((s, a) => s + a.hours, 0);
                  return <span key={addition.id} className="absolute inset-y-0 w-[5px] -translate-x-1/2 bg-lime" style={{ left: across(from) }} />;
                })}

                {/* More hours have been asked for: how many is not settled, so this length has no far end. */}
                {last && requested && granted < scale && (
                  <span
                    className="lettering absolute inset-y-0 right-0 flex items-center border border-r-0 border-dashed border-chalk pl-2 pr-1 text-chalk"
                    style={{ left: `calc(${across(granted)} + ${KERF * 2}px)` }}
                  >
                    Asked
                  </span>
                )}
              </div>

              <Ticks length={granted} scale={scale} />

              {length.added.map((addition, index) => {
                const from = length.base + length.added.slice(0, index).reduce((s, a) => s + a.hours, 0);
                return (
                  <p key={addition.id} className="lettering mt-1.5" style={{ marginLeft: `min(${across(from)}, 40%)` }}>
                    {addedWords(addition, names)}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="sr-only">
        {lengths
          .map((l) => `${l.title}: ${hours(l.used)} used of ${hours(l.base + l.added.reduce((s, a) => s + a.hours, 0))}.`)
          .join(" ")}
      </p>
    </div>
  );
}
