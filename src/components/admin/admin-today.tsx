"use client";

import Link from "next/link";
import { useState } from "react";
import { ProgrammeStrip } from "@/components/instruments/programme-strip";
import { Chip, ChipGroup } from "@/components/register/chips";
import { useScope } from "@/components/register/project-switch";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import { ageWords, daysSince, type Firm, type ProjectView, type StampView, type StripCell } from "@/lib/firm";
import { countWord, dayCount, inr, listWords, percent, weekdayDate } from "@/lib/format";
import {
  dayWords,
  exceptionRow,
  healthWords,
  moneyLine,
  newestFirstStamps,
  projectTurn,
  type Money,
} from "./admin-data";
import { CourseTrench, trenchWords } from "./course-trench";

// Shalini's Today. What needs her, which projects lose money on paper or in cash, where
// work is stuck, and how many clients were onboarded this month. The board draws every
// project as a course over a trench, all at one scale, and names the ones in trouble; every
// project below carries the same drawing, so a deep trench stands out down the list.

type Sort = "listed" | "margin" | "cash" | "days";

const SORTS: { id: Exclude<Sort, "listed">; label: string }[] = [
  { id: "margin", label: "Lowest margin" },
  { id: "cash", label: "Lowest cash" },
  { id: "days", label: "Longest at stage" },
];

/** The money half of a project's sentence at 1280: "Healthy, with 19% margin so far and ₹28,500 in hand." */
function moneyWords(p: ProjectView, money: Money): string {
  const cash = money.cash < 0 ? `short of cash by ${inr(-money.cash)}` : `${inr(money.cash)} in hand`;
  if (money.margin === null) return `No margin until building starts; ${cash}.`;
  if (p.phase === "handed-over") return `Margin ${percent(money.marginPercent ?? 0)} on the whole contract; ${cash}.`;
  return `${healthWords(p, money)}, with ${percent(money.marginPercent ?? 0)} margin so far and ${cash}.`;
}

/** A strip with no peg over it: on a phone, past three pegs, "With client" is said in words. */
function withoutPeg(cells: StripCell[]): StripCell[] {
  return cells.map((cell) => (cell.state === "raised" ? { ...cell, state: "built" } : cell));
}

/** Hands out the phone's peg budget down the list: a project with a payment raised takes two. */
function withPegs(rows: { p: ProjectView; money: Money }[], budget: number, firm: Firm) {
  let pegs = budget;
  const out = [];
  for (const { p, money } of rows) {
    const turn = projectTurn(p, firm);
    const raised = p.strip.some((cell) => cell.state === "raised");
    const pegged = !raised || pegs >= 2;
    if (raised && pegged) pegs -= 2;
    out.push({ p, money, turn: { ...turn, client: turn.client && pegged }, pegged });
  }
  return out;
}

function sorted(rows: { p: ProjectView; money: Money }[], sort: Sort) {
  if (sort === "listed") return rows;
  const key = (row: { p: ProjectView; money: Money }) =>
    sort === "margin"
      ? (row.money.marginPercent ?? Number.POSITIVE_INFINITY)
      : sort === "cash"
        ? row.money.cash
        : -row.p.daysAtStage;
  return [...rows].sort((a, b) => key(a) - key(b));
}

/** Whether a project needs the owner: losing money on the work done, or short of cash. */
function inTrouble(p: ProjectView): boolean {
  return p.margin !== null && p.phase !== "handed-over" && (p.margin < 0 || p.cash < 0);
}

/** Each project's name in the room of a word: "Bhat", and "Cottage" beside "Iyer". */
function shortNames(projects: ProjectView[]): Map<string, string> {
  const names = new Map<string, string>();
  const taken = new Set<string>();
  for (const p of projects) {
    const words = p.name.split(" ");
    const name = taken.has(words[0]) ? words[words.length - 1] : words[0];
    taken.add(name);
    names.set(p.id, name);
  }
  return names;
}

/** The board's words: who is losing money and who is short of cash, worst first. */
function troubleWords(projects: ProjectView[], names: Map<string, string>): string {
  const building = projects.filter(inTrouble);
  const losing = building.filter((p) => (p.margin ?? 0) < 0).sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0));
  const short = building.filter((p) => (p.margin ?? 0) >= 0).sort((a, b) => a.cash - b.cash);
  const said = (list: ProjectView[]) => listWords(list.map((p) => names.get(p.id) ?? p.name));
  const parts: string[] = [];
  if (losing.length > 0) parts.push(`${said(losing)} ${losing.length === 1 ? "is" : "are"} losing money`);
  if (short.length > 0) parts.push(`${said(short)} ${short.length === 1 ? "is" : "are"} short of cash`);
  if (parts.length === 0) return "Every project is making a margin, with cash in hand.";
  return `${parts.join("; ")}.`;
}

export function AdminToday() {
  const demo = useDemo();
  const firm = useFirm();
  const scope = useScope("admin");
  const [sort, setSort] = useState<Sort>("listed");

  // The firm's own figures: a bill the admin deleted is already out of them.
  const live = firm.projects.filter((p) => p.phase !== "draft");
  const inScope = (id?: string) => scope === "all" || id === scope;
  const projects = live.filter((p) => inScope(p.id)).map((p) => ({ p, money: p as Money }));
  const rows = firm.exceptions.filter((item) => inScope(item.projectId)).map((item) => exceptionRow(item, firm));
  const month = weekdayDate(TODAY).split(" ").pop() ?? "this month";
  const onboarded = firm.onboardedIn(TODAY.slice(0, 7)).filter((p) => inScope(p.id));
  const scoped = scope === "all" ? null : firm.project(scope);

  const n = rows.length;
  const headline =
    n === 0
      ? "Nothing needs you today, Shalini."
      : `${countWord(n, true)} ${n === 1 ? "thing needs" : "things need"} you, Shalini.`;
  const onboardWords = `${onboarded.length === 0 ? "No" : onboarded.length} ${
    onboarded.length === 1 ? "client" : "clients"
  } onboarded in ${month}.`;
  const state = scoped
    ? `${scoped.name}: ${scoped.stageWords.charAt(0).toLowerCase()}${scoped.stageWords.slice(1)}.`
    : `${live.length} projects. ${onboardWords}`;

  // One scale for every drawing on the page, so a deep trench reads as deep.
  const scale = Math.max(1, ...live.flatMap((p) => [Math.abs(p.margin ?? 0), Math.abs(p.cash)]));
  const names = shortNames(live);

  // The board: the chosen project drawn large; with every project in scope, each one small,
  // side by side, and the ones in trouble named in the words under them.
  const picture = scoped ? (
    <CourseTrench
      margin={scoped.margin}
      cash={scoped.cash}
      inDesign={scoped.margin === null}
      tone="dark"
      width={320}
      height={120}
    />
  ) : (
    // Each drawing keeps near its drawn size, so a tablet does not blow the bricks up.
    <ul className="grid grid-cols-7 gap-x-2 sm:max-w-[36rem] sm:gap-x-3" style={{ maxHeight: "none" }}>
      {live.map((p) => (
        <li key={p.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)] justify-items-start gap-1">
          <div className="w-full max-w-[56px]">
            <CourseTrench
              margin={p.margin}
              cash={p.cash}
              inDesign={p.margin === null}
              scale={scale}
              tone="dark"
              width={56}
              height={132}
              className="w-full"
            />
          </div>
          {/* On a phone only the projects in trouble are named, as the words below name them.
              From 1024 px the longest name may reach a few pixels into the gap rather than be cut. */}
          <span
            className={`lettering max-w-full truncate lg:overflow-visible ${inTrouble(p) ? "font-semibold text-lime" : "hidden text-lime/75 sm:block"}`}
          >
            {names.get(p.id)}
          </span>
        </li>
      ))}
    </ul>
  );
  const pictureWords = scoped
    ? `${scoped.name}: ${trenchWords(scoped.margin, scoped.marginPercent, scoped.cash)}`
    : troubleWords(live, names);

  // At most three peg glyphs on a phone: the client rows in "Needs you" first, then each
  // project with a payment raised (its turn margin and its strip, two pegs a row).
  const list = withPegs(sorted(projects, sort), 3 - rows.filter((row) => row.client).length, firm);

  return (
    <>
      <StaffBoard place="Today" headline={headline} state={state} picture={picture} pictureWords={pictureWords} />

      <div className="mt-8 grid gap-12">
        <Register title="Needs you" empty="Nothing needs you today." limit={8}>
          {rows.map((row) => (
            <RegisterRow
              key={row.item.id}
              id={row.item.id}
              margin={row.margin}
              marginSub={row.marginSub}
              client={row.client}
              // The whole row is one link, to the record tab that answers it. Built here
              // rather than with `href` so a request's row can be outlined where it lands.
              title={
                <Link
                  href={row.href}
                  className="reg-link hover:underline hover:decoration-1 hover:underline-offset-4"
                  onClick={() => {
                    if (row.focus) demo.setFocusRow({ href: row.href, id: row.focus });
                  }}
                >
                  {row.item.title}
                </Link>
              }
              stamps={row.item.stamps}
            />
          ))}
        </Register>

        <section aria-label="Every project" className="grid gap-4">
          <ChipGroup label="Sort the projects">
            {SORTS.map((s) => (
              <Chip key={s.id} pressed={sort === s.id} onClick={() => setSort(sort === s.id ? "listed" : s.id)}>
                {s.label}
              </Chip>
            ))}
          </ChipGroup>
          <Register title="Every project" limit={12}>
            {list.map(({ p, money, turn, pegged }) => (
              <RegisterRow
                key={p.id}
                id={`project:${p.id}`}
                margin={turn.margin}
                marginSub={turn.marginSub}
                client={turn.client}
                title={p.name}
                href={`/staff/projects/${p.id}`}
                sentence={
                  <>
                    <span className="lg:hidden">{moneyLine(p, money)}</span>
                    <span className="hidden lg:inline">
                      {p.stageWords}, {p.daysAtStage === 0 ? "from today" : `${dayCount(p.daysAtStage)} at this stage`}.
                      {p.next ? ` Next, ${p.next.words.charAt(0).toLowerCase()}${p.next.words.slice(1)}.` : ""}{" "}
                      {moneyWords(p, money)}
                    </span>
                  </>
                }
                instrument={
                  <div className="grid gap-2 lg:justify-items-end">
                    {pegged ? (
                      <ProgrammeStrip cells={p.strip} size={120} />
                    ) : (
                      <>
                        <span className="lg:hidden">
                          <ProgrammeStrip cells={withoutPeg(p.strip)} size={120} />
                        </span>
                        <span className="hidden lg:block">
                          <ProgrammeStrip cells={p.strip} size={120} />
                        </span>
                      </>
                    )}
                    <span className="hidden lg:block">
                      <CourseTrench
                        margin={money.margin}
                        cash={money.cash}
                        inDesign={money.margin === null}
                        scale={scale}
                        width={120}
                        height={56}
                      />
                    </span>
                  </div>
                }
              />
            ))}
          </Register>
        </section>

        <Register title={`Onboarded in ${month}`} empty={`No clients onboarded in ${month} yet.`}>
          {onboarded.map((p) => (
            <OnboardedRow key={p.id} p={p} />
          ))}
        </Register>
      </div>
    </>
  );
}

/** A client onboarded this month: when the workspace was opened, and its invite. */
function OnboardedRow({ p }: { p: ProjectView }) {
  const firm = useFirm();
  const stamps: StampView[] = newestFirstStamps([
    ...firm.stampsFor(`invite:${p.id}`),
    ...firm.stampsFor("draft:kulkarni").filter((s) => p.id === "kulkarni" && s.words.startsWith("Workspace opened")),
  ]);
  const by = firm.person(p.onboardedBy)?.name ?? "Business development";
  const opened = p.onboardedOn ? dayWords(p.onboardedOn) : "";
  return (
    <RegisterRow
      id={`invite:${p.id}`}
      margin={ageWords(p.onboardedOn ? daysSince(p.onboardedOn) : 0)}
      title={p.name}
      href={`/staff/projects/${p.id}`}
      sentence={`${p.stageWords}. ${by} opened it${opened ? ` on ${opened}` : ""} for ${listWords(p.clients)}.`}
      stamps={stamps}
    />
  );
}
