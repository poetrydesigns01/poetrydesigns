import type { ReactNode } from "react";

// Small line icons for the design screens. Decoration only: every one sits beside a word
// or carries its own label on the control it is in.

type IconProps = { className?: string };

function Svg({ className = "size-4", children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </Svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12.5 4.5 15.5 7.5 7.5 15.5H4.5V12.5Z" />
      <path d="m11 6 3 3" />
    </Svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Z" />
      <circle cx="10" cy="10" r="2.3" />
    </Svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 10s3-5.5 8-5.5c1.4 0 2.6.4 3.7 1M18 10s-3 5.5-8 5.5c-1.4 0-2.6-.4-3.7-1" />
      <path d="m3.5 16.5 13-13" />
    </Svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 13V4M6.5 7.5 10 4l3.5 3.5M4 13.5V16h12v-2.5" />
    </Svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="9" width="11" height="8" rx="2" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
    </Svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12.5 4.5 7 10l5.5 5.5" />
    </Svg>
  );
}

export function QuoteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5.5h12v7H9l-3.5 3v-3H4Z" />
    </Svg>
  );
}

/** A floor plan: an outline with rooms. */
export function PlanIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3.5" width="14" height="13" rx="1" />
      <path d="M3 10h7V3.5M10 13v3.5M13.5 10H17" />
    </Svg>
  );
}

/** An elevation: a house front in depth. */
export function ElevationIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 9 10 3.5 17 9" />
      <path d="M4.5 8v8.5h11V8" />
      <path d="M8.5 16.5v-4h3v4" />
    </Svg>
  );
}

/** A bill of quantities: a sheet of ruled rows. */
export function BoqIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="2.5" width="12" height="15" rx="1.5" />
      <path d="M7 6.5h6M7 10h6M7 13.5h3.5" />
    </Svg>
  );
}
