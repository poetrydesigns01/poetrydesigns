import type { ReactNode } from "react";

// Small line icons that stand in for words on the client home and timeline.

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Icon({ children, className = "size-5" }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

type IconProps = { className?: string };

export const ContractIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M5.5 3.5h6l3 3v10h-9z M11.5 3.5v3h3 M8 10h4.5M8 13h3" {...stroke} />
  </Icon>
);

export const PaidIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="10" cy="10" r="6.5" {...stroke} />
    <path d="m7.2 10.2 2 2 3.6-4" {...stroke} />
  </Icon>
);

export const RupeeIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M6 4h8.5M6 7.5h8.5M6 4h2.5a3.5 3.5 0 0 1 0 7H6l6.5 5.5" {...stroke} />
  </Icon>
);

export const KeyIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="7" cy="10" r="3.5" {...stroke} />
    <path d="M10.5 10h6M14.5 10v2.5M16.5 10v2" {...stroke} />
  </Icon>
);

export const PhoneIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path
      d="M5 3.5h2.5l1.3 3.3-1.6 1a8 8 0 0 0 5 5l1-1.6 3.3 1.3V15a1.5 1.5 0 0 1-1.5 1.5A12.5 12.5 0 0 1 3.5 5 1.5 1.5 0 0 1 5 3.5z"
      {...stroke}
    />
  </Icon>
);

export const ArrowIcon = ({ className = "size-4" }: IconProps) => (
  <Icon className={className}>
    <path d="M4.5 10h11M11 5.5l4.5 4.5-4.5 4.5" {...stroke} />
  </Icon>
);

export const CheckIcon = ({ className = "size-3" }: IconProps) => (
  <Icon className={className}>
    <path d="m4.5 10.5 3.5 3.5 7.5-8" {...stroke} strokeWidth={2.4} />
  </Icon>
);

export const CalendarIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <rect x="3.5" y="4.5" width="13" height="12" rx="2" {...stroke} />
    <path d="M3.5 8.5h13M7 3v3M13 3v3" {...stroke} />
  </Icon>
);

export const LockIcon = ({ className = "size-3" }: IconProps) => (
  <Icon className={className}>
    <rect x="4.5" y="9" width="11" height="8" rx="1.8" {...stroke} strokeWidth={2} />
    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" {...stroke} strokeWidth={2} />
  </Icon>
);
