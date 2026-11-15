// Small line icons for the chat, drawn in currentColor.

import type { ReactNode } from "react";

type IconProps = { className?: string; size?: number };

function Svg({ className = "", size = 20, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12 3 4.5l18 7.5-18 7.5L4.5 12Zm0 0H12" />
    </Svg>
  );
}

export function AttachIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />
    </Svg>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4 17 5-5 4 4 2.5-2.5L20 18" />
    </Svg>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function PrevIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m14.5 6-6 6 6 6" />
    </Svg>
  );
}

export function NextIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9.5 6 6 6-6 6" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

/** An approval or decision note. */
export function SealIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.7-4.9" />
    </Svg>
  );
}

/** A drawing or estimate note. */
export function SheetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z" />
      <path d="M14 3.5V8h4M9 12.5h6M9 16h4" />
    </Svg>
  );
}

export function HouseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 11 12 4.5l8 6.5" />
      <path d="M6 9.5V19.5h12V9.5M10 19.5v-5h4v5" />
    </Svg>
  );
}

/** One tick (sent), two (delivered), two in colour (read). */
export function Ticks({ state }: { state: "sent" | "delivered" | "read" }) {
  const words = state === "read" ? "Read" : state === "delivered" ? "Delivered" : "Sent";
  return (
    <span className={state === "read" ? "chat-tick-read" : "chat-tick"} role="img" aria-label={words} title={words}>
      <svg width={state === "sent" ? 12 : 17} height="11" viewBox={state === "sent" ? "0 0 12 11" : "0 0 17 11"} fill="none" aria-hidden focusable="false">
        <path d="M1 6l3.2 3.2L11 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        {state !== "sent" && <path d="M8.6 8.4l.8.8L16 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </span>
  );
}
