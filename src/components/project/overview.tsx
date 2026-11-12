"use client";

import { dayWords } from "@/components/admin/admin-data";
import { SampleTag } from "@/components/register/sample-tag";
import { StatusWord } from "@/components/register/status-word";
import { useFirm } from "@/lib/demo-store";
import type { MilestoneView } from "@/lib/firm";
import { templateOf, type PersonId, type ProjectId } from "@/lib/firm-data";
import { inr, listWords } from "@/lib/format";

// The project at a glance, said in sentences rather than a form's rows: the clients and the
// contract, the team with its Project Head and point of contact, business development's
// hand-off note, and every milestone with where it stands and when.

const STATE_WORDS: Record<MilestoneView["state"], string> = {
  paid: "Paid",
  "part-paid": "Part paid",
  approved: "Approved, waiting for the bank",
  raised: "Raised",
  done: "Built, payment not raised",
  "under-way": "Under way",
  "to-come": "To come",
};

const day = (at?: string) => (at ? dayWords(at) : "");

/** One sentence of dates for a milestone: what happened, and when. */
function milestoneDates(m: MilestoneView, clientWord: string): string {
  const parts: string[] = [];
  if (m.startedOn && m.state === "under-way") parts.push(`Started ${day(m.startedOn)}`);
  if (m.doneOn) parts.push(`built ${day(m.doneOn)}`);
  if (m.acceptedAt) parts.push(`accepted by ${clientWord} ${day(m.acceptedAt)}`);
  if (m.raisedAt) parts.push(`raised ${day(m.raisedAt)}`);
  if (m.approvedAt) parts.push(`approved ${day(m.approvedAt)}`);
  if (m.paidOn) parts.push(`paid ${day(m.paidOn)}`);
  if (m.state === "to-come" || m.state === "under-way") if (m.expected) parts.push(`expected ${m.expected}`);
  if (parts.length === 0) return "";
  const text = parts.join(", ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

export function ProjectOverview({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;
  const name = (id: PersonId) => firm.person(id)?.name ?? id;
  const names = (ids: PersonId[]) => (ids.length > 0 ? listWords(ids.map(name)) : "None yet");
  const clientWord = p.clientWord === "Meera" ? "Meera" : "the client";

  const architects = p.team.architects;
  const engineers = p.team.engineers;
  const buyers = p.team.procurement;
  const head = name(p.team.head);
  const poc = name(p.team.poc);

  const contract = [
    `${listWords(p.clients)}.`,
    `${templateOf(p.category).name}, ${p.builtUpArea.toLocaleString("en-IN")} sq ft at ${inr(p.ratePerSqFt)} a sq ft, ${inr(
      p.contractValue,
    )} before GST.`,
    p.signedOn ? `Signed ${dayWords(p.signedOn)}.` : "Not signed yet.",
    `The plot runs ${p.plotPerimeter} ft around.`,
  ];
  const team = [
    p.team.head === p.team.poc
      ? `${head} is the Project Head and the point of contact.`
      : `${head} is the Project Head; ${poc} is the point of contact.`,
    architects.length > 0 ? `Designed by ${names(architects)}.` : "No architect yet.",
    engineers.length > 0 ? `On site, ${names(engineers)}.` : "No site engineer yet.",
    buyers.length > 0 ? `Materials bought by ${names(buyers)}.` : "No one buying materials yet.",
  ];

  return (
    <div className="grid gap-12">
      <div className="staff-columns">
        <section aria-label="The clients and the contract" className="grid content-start gap-3">
          <h2 className="register-title">The clients and the contract</h2>
          <div className="grid max-w-[60ch] gap-2 text-17">
            {contract.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {/* On a phone the board leaves the address and coordinates out, so they are here. */}
            <p className="sm:hidden">
              {p.address}. Coordinates {p.lat.toFixed(4)}, {p.lng.toFixed(4)}.
            </p>
          </div>
        </section>
        <section aria-label="The team" className="grid content-start gap-3">
          <h2 className="register-title">The team</h2>
          <div className="grid max-w-[60ch] gap-2 text-17">
            {team.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          {p.handoff && (
            <figure className="mt-2 bg-sand-2 p-4">
              <blockquote className="text-17">&ldquo;{p.handoff}&rdquo;</blockquote>
              <figcaption className="lettering mt-2 text-ink-soft">
                Hand-off note from {name(p.onboardedBy)}
                {p.onboardedOn ? `, ${dayWords(p.onboardedOn)}` : ""}
              </figcaption>
            </figure>
          )}
        </section>
      </div>

      <section aria-label="Milestones" className="grid gap-3">
        <h2 className="register-title flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span>Milestones</span>
          <SampleTag>Names and shares are samples</SampleTag>
        </h2>
        <ol className="sheet-rows ruled">
          {p.milestones.map((m) => {
            const dates = milestoneDates(m, clientWord);
            return (
              <li key={m.n} className="grid gap-1 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-4">
                <span className="figure text-17">{m.n === 0 ? "" : m.n}</span>
                <div className="min-w-0">
                  <p className="text-17 font-semibold">
                    {m.name}
                    <span className="font-normal text-ink-soft">, {m.percent}%</span>
                  </p>
                  <p className="max-w-[56ch] text-15 text-ink-soft">
                    <StatusWord>{STATE_WORDS[m.state]}</StatusWord>
                    {dates ? `. ${dates}` : "."}
                    {m.letterNo ? ` Letter ${m.letterNo}.` : ""}
                  </p>
                </div>
                <span className="figure whitespace-nowrap text-17 sm:text-right">{inr(m.amount)}</span>
              </li>
            );
          })}
        </ol>
        <p className="lettering text-ink-soft">Amounts are before GST.</p>
      </section>
    </div>
  );
}
