/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { ReactNode } from "react";
import type { LoginRole } from "./site-model";

// One small drawing for each person on the site, all in the current colour, so the row reads
// as one set. The chosen tile shows itself through its fill and its tick, not its drawing.

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" className="role-glyph" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** The homeowner's peg: her word, pinned on the drawing. */
function PegLineGlyph() {
  return (
    <Frame>
      <path className="rg-line" d="M3 14.5h10" />
      <g className="rg-move">
        <circle className="rg-line" cx="8" cy="5" r="3.2" />
        <path className="rg-solid" d="M8 8.2v6.3" />
      </g>
    </Frame>
  );
}

function PlotGlyph() {
  return (
    <Frame>
      <path className="rg-line" d="M1.5 13.5h9l4-5h-9z" />
      <g className="rg-move">
        <path className="rg-solid" d="M1.5 10v3.5M10.5 10v3.5M14.5 5v3.5M5.5 5v3.5" />
      </g>
    </Frame>
  );
}

function SetSquareGlyph() {
  return (
    <Frame>
      <g className="rg-move">
        <path className="rg-line" d="M2 14V2l12 12z" />
        <path className="rg-line" d="M5 11V8.2l2.8 2.8z" />
      </g>
    </Frame>
  );
}

function CourseGlyph() {
  return (
    <Frame>
      <g className="rg-move">
        <rect className="rg-fill" x="0.5" y="8" width="5" height="4" />
        <rect className="rg-fill" x="5.5" y="8" width="5" height="4" />
        <rect className="rg-fill" x="10.5" y="8" width="5" height="4" />
      </g>
      <path className="rg-line" d="M0.5 14.5h15" />
    </Frame>
  );
}

function ReceivableGlyph() {
  return (
    <Frame>
      <rect className="rg-line" x="2.5" y="3.5" width="11" height="9" />
      <g className="rg-move">
        <rect className="rg-fill" x="2.5" y="8" width="11" height="4.5" />
      </g>
    </Frame>
  );
}

function TrenchGlyph() {
  return (
    <Frame>
      <g className="rg-move">
        <rect className="rg-fill" x="3" y="3.5" width="10" height="4" />
      </g>
      <path className="rg-line" d="M1 8.5h14" />
      <path className="rg-line" d="M4 9v4.5h8V9M5 13l2-3M8 13l2-3" />
    </Frame>
  );
}

export function RoleGlyph({ role }: { role: LoginRole }) {
  switch (role) {
    case "client":
      return <PegLineGlyph />;
    case "bd":
      return <PlotGlyph />;
    case "architect":
      return <SetSquareGlyph />;
    case "site":
      return <CourseGlyph />;
    case "finance":
      return <ReceivableGlyph />;
    case "admin":
      return <TrenchGlyph />;
  }
}
