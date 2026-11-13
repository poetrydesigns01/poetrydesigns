"use client";

import { memo } from "react";
import { lettersOpenOrPaidThisMonth } from "@/components/finance/rows";
import { ReceivableBlock } from "@/components/finance/receivable-block";
import { MaterialStack, stackWords } from "@/components/instruments/material-stack";
import { PlotOutline } from "@/components/instruments/plot-outline";
import { ProgrammeStrip } from "@/components/instruments/programme-strip";
import { TaskCourse } from "@/components/instruments/task-course";
import type { DemoAccount } from "@/lib/demo-accounts";
import { useFirm } from "@/lib/demo-store";
import { courses, type PersonId } from "@/lib/firm-data";
import type { LoginRole } from "./site-model";

// The tag beside the stage: what the chosen person does, who they are, and the drawing
// their own home screen opens with, small, with the same sample data. It is decoration for
// sighted people: each role's sentence also reaches its radio through aria-describedby.

export const ROLE_SENTENCE: Record<LoginRole | "none", string> = {
  none: "Choose how you work with us, then sign in with your ID.",
  client: "Homeowner. Approves drawings, stages, payments and changes.",
  bd: "Business development. Opens each new client's project.",
  architect: "Architect. Drawings, reviews and the juniors' work.",
  site: "Site engineer. Orders material and marks stages from his phone.",
  finance: "Procurement and finance. Purchase orders, money in and out.",
  admin: "Admin. Every project's margin and cash, people and templates.",
};

type Who = { person: PersonId; words: string };

/** The people behind each role, as the caption names them. */
const PEOPLE: Record<LoginRole, { lead?: string; who: Who[] }> = {
  client: { who: [{ person: "meera", words: "Meera Iyer, homeowner" }] },
  bd: { who: [{ person: "rohan", words: "Rohan Menon, business development" }] },
  architect: {
    who: [
      { person: "ananya", words: "Drawn by Ananya Rao" },
      { person: "vikram", words: "Checked by Vikram Desai" },
    ],
  },
  site: {
    who: [
      { person: "suresh", words: "Suresh Gowda, site engineer" },
      { person: "manjunath", words: "Manjunath K, junior" },
    ],
  },
  finance: {
    who: [
      { person: "prakash", words: "Prakash Hegde, procurement" },
      { person: "divya", words: "Divya Shenoy, accounts" },
    ],
  },
  admin: { who: [{ person: "shalini", words: "Shalini Murthy, operations head and admin" }] },
};

function Tick() {
  return (
    <svg viewBox="0 0 16 16" className="lg-tick" aria-hidden="true" focusable="false">
      <path d="M3 8.5l3.2 3.2L13 4.5" pathLength={1} />
    </svg>
  );
}

function Instrument({ role }: { role: LoginRole }) {
  const firm = useFirm();
  const iyer = firm.project("iyer");
  switch (role) {
    case "client":
      return iyer ? <ProgrammeStrip cells={iyer.strip} size={120} tone="dark" /> : null;
    case "bd":
      return <PlotOutline pegs={4} size={72} tone="dark" />;
    case "architect": {
      const tasks = (courses.ananya ?? []).map((b) => ({ title: b.title, late: b.lateDays, revisions: b.revisions }));
      return <TaskCourse tasks={tasks} label="Ananya Rao, last 30 days" width={240} />;
    }
    case "site": {
      const cement = firm.catalogue.find((c) => c.id === "cement");
      if (!cement) return null;
      return (
        <div className="grid gap-1">
          <MaterialStack item={cement} requested={120} ordered={80} delivered={false} width={96} tone="dark" words="none" />
          <p className="text-13 text-lime/80">{stackWords(cement, 120, 80, false)}</p>
        </div>
      );
    }
    case "finance": {
      const letters = lettersOpenOrPaidThisMonth(firm.letters).filter((l) => l.state !== "paid" || l.receipts.length > 0);
      return letters.length > 0 ? <ReceivableBlock letters={letters} width={160} tone="dark" /> : null;
    }
    case "admin":
      // The admin's drawing stands in the scene, under each site on the horizon.
      return null;
  }
}

export const RoleCaption = memo(function RoleCaption({
  role,
  match,
}: {
  role: LoginRole | null;
  match: DemoAccount | null;
}) {
  const key = role ?? "none";
  const people = role ? PEOPLE[role] : null;
  const matched = match && match.role === role ? match.person : null;
  return (
    <div key={key} className="lg-caption" data-role={key}>
      <p className="text-15">{ROLE_SENTENCE[key]}</p>
      {people && (
        <p className="lettering lg-people">
          {people.who.map((w, i) => (
            <span key={w.person} className="lg-who" data-lit={matched === w.person ? "" : undefined} data-dim={matched && matched !== w.person ? "" : undefined}>
              {i > 0 && <span className="lg-sep"> · </span>}
              {w.words}
              {matched === w.person && <Tick />}
            </span>
          ))}
        </p>
      )}
      {role && role !== "admin" && (
        <div className="lg-instrument">
          <Instrument role={role} />
        </div>
      )}
    </div>
  );
});
