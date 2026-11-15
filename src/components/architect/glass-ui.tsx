import Link from "next/link";
import { useId, type ReactNode } from "react";
import { TODAY } from "@/lib/demo-data";
import { datePart, formatDate, formatShortDate, formatTime } from "@/lib/format";

// Small glass pieces shared by the studio and business development screens: a titled
// panel, a stat tile, a compact button, an empty line and a few line icons.

/** A frosted panel with a short title and an optional control at its right. */
export function Panel({
  title,
  aside,
  id,
  strong,
  className = "",
  children,
}: {
  title: string;
  aside?: ReactNode;
  id?: string;
  strong?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const headId = useId();
  return (
    <section id={id} aria-labelledby={headId} className={`${strong ? "glass-strong" : "glass"} min-w-0 scroll-mt-24 p-3 sm:p-4 ${className}`}>
      <header className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1 pb-2">
        <h2 id={headId} className="text-17 font-semibold text-ink">
          {title}
        </h2>
        {aside && <div className="flex flex-wrap items-center gap-2">{aside}</div>}
      </header>
      {children}
    </section>
  );
}

/**
 * A number with its label, inside a `Stats` panel. This is the portal's one stat pattern:
 * a glass-inner tile, an optional 16 px icon beside a lettering label, and the figure at
 * text-22 on phones and text-32 from 640 px. A long rupee figure wraps inside its tile.
 */
export function Stat({
  label,
  value,
  note,
  tone,
  icon,
  href,
}: {
  label: string;
  value: ReactNode;
  /** A chip or a few words under the number. */
  note?: ReactNode;
  tone?: "late";
  /** A small line icon shown before the label. */
  icon?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <span className="lettering flex min-w-0 items-center gap-1.5 text-ink-soft">
        {icon}
        <span className="min-w-0 truncate">{label}</span>
      </span>
      <span
        className={`figure mt-1 block min-w-0 text-22 leading-tight wrap-anywhere sm:text-32 sm:leading-none ${tone === "late" ? "text-brick" : "text-ink"}`}
      >
        {value}
      </span>
      {note && <span className="mt-2 block min-w-0">{note}</span>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="glass-inner block min-w-0 p-3 hover:bg-white/60 sm:p-4">
        {body}
      </Link>
    );
  }
  return <div className="glass-inner min-w-0 p-3 sm:p-4">{body}</div>;
}

// A lone last tile on a two-column row takes the whole row, so no half-empty gap is left.
const STAT_COLS = {
  2: "[&>*:last-child:nth-child(odd)]:col-span-2",
  3: "sm:grid-cols-3 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2",
  4: "lg:grid-cols-4 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2",
  5: "lg:grid-cols-5 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2",
} as const;

/**
 * A row of stat tiles in one glass panel: two to a row on a phone, `cols` on wider screens
 * (four by default, from 1024 px; three from 640 px). Other roles import this so every
 * dashboard reads the same way.
 */
export function Stats({ label, cols = 4, children }: { label: string; cols?: keyof typeof STAT_COLS; children: ReactNode }) {
  return (
    <section aria-label={label} className={`glass grid grid-cols-2 gap-2 p-2 sm:gap-3 sm:p-3 ${STAT_COLS[cols]}`}>
      {children}
    </section>
  );
}

/** The compact button for a table row. */
export const rowBtn = "btn btn-glass min-h-11 shrink-0 gap-1.5 px-4 text-15";
export const rowPrimary = "btn btn-primary min-h-11 shrink-0 gap-1.5 px-4 text-15";

/** Said when a list has nothing in it. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-3 text-15 text-ink-soft">{children}</p>;
}

/** "11 Nov". */
export function day(at: string | undefined | null): string {
  return at ? formatShortDate(datePart(at)) : "";
}

/** "11 Nov" this year, "10 Nov 2025" before it. */
export function dated(at: string): string {
  return at.slice(0, 4) === TODAY.slice(0, 4) ? day(at) : formatDate(datePart(at));
}

/** "11 Nov, 9:40 pm" for the proof of a decision. */
export function dayTime(at: string | undefined | null): string {
  if (!at) return "";
  const time = formatTime(at);
  return time ? `${day(at)}, ${time}` : day(at);
}

// ---- Icons: 16 px line drawings that stand in for a word beside them ----

type IconProps = { className?: string; label?: string };

function Svg({ className = "", label, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={16}
      height={16}
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="1.9" />
    </Svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 10.5V2.5M5 5.5l3-3 3 3M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />
    </Svg>
  );
}

export function IconSend(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 2 7 9M14 2l-4.5 12L7 9 2 6.5 14 2Z" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m3 8.5 3.2 3L13 4.5" />
    </Svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.8V8l2.2 1.5" />
    </Svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 1.8h5l3 3v9.4H4z" />
      <path d="M9 1.8v3h3" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 3v10M3 8h10" />
    </Svg>
  );
}

export function IconArrow(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </Svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" />
    </Svg>
  );
}

export function IconHistory(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.5 2.5v2.2h2.2" />
      <path d="M8 5v3l2 1.3" />
    </Svg>
  );
}

/** Four steps as dots: filled when done. */
export function StepDots({ done, total = 4, label }: { done: number; total?: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`block size-2.5 rounded-full ${i < done ? "bg-rosewood" : "border border-ink/30 bg-white/50"}`}
        />
      ))}
    </span>
  );
}
