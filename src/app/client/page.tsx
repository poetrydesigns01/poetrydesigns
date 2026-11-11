"use client";

import Link from "next/link";
import { HouseElevation } from "@/components/house-elevation";
import { Status } from "@/components/page-band";
import { client, contacts, designs, milestones, project, withGst } from "@/lib/demo-data";
import { useChanges, useDemo } from "@/lib/demo-store";
import { formatDate, formatShortDate, inr, inrDelta } from "@/lib/format";

const COUNT_WORDS = ["Nothing is", "One thing is", "Two things are", "Three things are", "Four things are", "Five things are", "Six things are"];

type Action = {
  key: string;
  kind: string;
  title: string;
  detail: string;
  figure?: string;
  href: string;
  cta: string;
};

export default function ClientHome() {
  const { designDecisions, paymentApproved } = useDemo();
  const changes = useChanges();

  const duePayment = milestones.find((m) => m.status === "awaiting-approval");
  const pendingChanges = changes.filter((c) => c.status === "pending");
  const approvedChanges = changes.filter((c) => c.status === "approved");
  const awaitingDesigns = designs.filter((d) => {
    const latest = d.versions[d.versions.length - 1];
    return latest.status === "awaiting" && !designDecisions[d.id];
  });
  const approvedDesigns = designs.filter((d) => {
    const status = designDecisions[d.id]?.status ?? d.versions[d.versions.length - 1].status;
    return status === "approved";
  });

  const approvedValue = project.initialEstimate + approvedChanges.reduce((sum, c) => sum + c.cost, 0);
  const pendingValue = pendingChanges.reduce((sum, c) => sum + c.cost, 0);
  const pendingDays = pendingChanges.reduce((sum, c) => sum + c.delayDays, 0);

  const actions: Action[] = [];
  if (duePayment && !paymentApproved) {
    actions.push({
      key: "payment",
      kind: "Payment",
      title: `Approve the payment for ${duePayment.name.toLowerCase()}`,
      detail: `The work was finished on ${formatShortDate(duePayment.workCompletedOn!)}. Approving it creates the demand letter for your bank.`,
      figure: inr(withGst(duePayment.amount).total),
      href: "/client/payments",
      cta: "Review payment",
    });
  }
  for (const design of awaitingDesigns) {
    const latest = design.versions[design.versions.length - 1];
    actions.push({
      key: design.id,
      kind: design.kind,
      title: `${design.title}, version ${latest.version}`,
      detail: `${latest.uploadedBy} uploaded it on ${formatShortDate(latest.uploadedOn)}. Approve it or ask for changes.`,
      href: `/client/designs/${design.id}`,
      cta: design.kind === "Drawing" ? "Review drawing" : "Review specification",
    });
  }
  for (const change of pendingChanges) {
    actions.push({
      key: change.id,
      kind: "Change",
      title: change.title,
      detail: `Adds ${change.delayDays} days. This price is held until ${formatShortDate(change.validUntil!)}.`,
      figure: inrDelta(change.cost),
      href: "/client/changes",
      cta: "Review change",
    });
  }

  return (
    <>
      <section className="on-dark overflow-hidden bg-rosewood text-lime">
        <div className="mx-auto grid max-w-6xl items-end gap-x-10 gap-y-6 px-5 pb-10 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pb-16">
          <div className="lg:pb-6">
            <p className="text-lime/75">
              {project.name}, {project.category.toLowerCase()} on Kanakapura Road
            </p>
            <h1 className="display display-xl mt-4">
              {COUNT_WORDS[Math.min(actions.length, 6)]} waiting for you, {client.firstName}.
            </h1>
            <p className="mt-6 max-w-md text-[1.125rem] text-lime/80">
              The first floor is finished. The second floor and roof slab are under way, and handover is expected in
              September 2027.
            </p>
            {actions.length > 0 && (
              <a href="#next" className="btn btn-primary mt-8">
                See what is next
              </a>
            )}
          </div>
          <HouseElevation builtUpTo={project.builtUpTo} className="h-auto w-full" />
        </div>
      </section>

      {/* What decision or payment is due next? */}
      <section id="next" className="mx-auto max-w-6xl scroll-mt-4 px-5 py-10 sm:px-8 sm:py-16">
        <h2 className="display display-lg">What needs you next</h2>
        {actions.length === 0 ? (
          <p className="mt-5 max-w-xl text-[1.125rem] text-ink-soft">
            Nothing needs your decision today. We will email you when a drawing, a payment or a change is ready for
            you.
          </p>
        ) : (
          <ul className="mt-6 border-t border-ink">
            {actions.map((action) => (
              <li
                key={action.key}
                className="grid gap-x-8 gap-y-3 border-b border-sand py-6 md:grid-cols-[7rem_minmax(0,1fr)_auto] md:items-center"
              >
                <p className="text-ink-soft">{action.kind}</p>
                <div>
                  <h3 className="text-[1.25rem] font-semibold leading-snug">{action.title}</h3>
                  <p className="mt-1 max-w-xl text-ink-soft">{action.detail}</p>
                </div>
                <div className="flex items-center justify-between gap-6 md:justify-end">
                  {action.figure && <span className="figure text-[1.5rem]">{action.figure}</span>}
                  <Link href={action.href} className="btn btn-primary shrink-0">
                    {action.cta}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* What have I agreed to? */}
      <section className="bg-sand-2">
        <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-8 px-5 py-10 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
          <div>
            <h2 className="display display-lg">What you have agreed to</h2>
            <p className="figure mt-8 text-[clamp(2.75rem,6vw,4.25rem)] leading-none">{inr(approvedValue)}</p>
            <p className="mt-3 max-w-sm text-ink-soft">
              The approved value of your home, before GST. It began at {inr(project.initialEstimate)} and{" "}
              {approvedChanges.length === 1 ? "one change has" : `${approvedChanges.length} changes have`} been added
              since.
            </p>
          </div>
          <dl className="self-end border-t border-ink">
            <AgreedRow term="Construction agreement" detail={`Signed on ${formatDate(project.agreementSignedOn)}`} value="View" href="/client/payments" />
            <AgreedRow term="Initial estimate" detail={`${(project.builtUpArea - 150).toLocaleString("en-IN")} sq ft at ${inr(project.ratePerSqFt)} per sq ft`} value={inr(project.initialEstimate)} />
            {approvedChanges.map((change) => (
              <AgreedRow
                key={change.id}
                term={change.addendum ?? "Addendum"}
                detail={`${change.title}, approved on ${formatDate(change.decidedOn!)}`}
                value={inrDelta(change.cost)}
                href="/client/changes"
              />
            ))}
            <AgreedRow
              term="Designs"
              detail={`${approvedDesigns.length} of ${designs.length} drawings and specifications approved`}
              value="See designs"
              href="/client/designs"
            />
          </dl>
        </div>
      </section>

      {/* If I change my mind, what happens? */}
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
        <h2 className="display display-lg">If you change your mind</h2>
        <p className="mt-4 max-w-2xl text-[1.125rem] text-ink-soft">
          Every change shows its price and what it does to the schedule before you decide. Nothing is added to your
          home&rsquo;s value until you approve it.
        </p>
        {pendingChanges.length > 0 ? (
          <div className="mt-8 grid gap-x-12 gap-y-8 border-t border-ink pt-6 md:grid-cols-3">
            <div>
              <p className="text-ink-soft">Approved today</p>
              <p className="figure mt-1 text-[2rem]">{inr(approvedValue)}</p>
            </div>
            <div>
              <p className="text-ink-soft">
                If you approve {pendingChanges.length === 1 ? "the open change" : `all ${pendingChanges.length} open changes`}
              </p>
              <p className="figure mt-1 text-[2rem]">{inr(approvedValue + pendingValue)}</p>
            </div>
            <div>
              <p className="text-ink-soft">Effect on the schedule</p>
              <p className="figure mt-1 text-[2rem]">{pendingDays} more days</p>
            </div>
          </div>
        ) : (
          <p className="mt-8 border-t border-ink pt-6">
            <Status tone="done">No changes are open.</Status> Your approved value is {inr(approvedValue)}.
          </p>
        )}
        <Link href="/client/changes" className="btn btn-quiet mt-8">
          See all changes
        </Link>
      </section>

      {/* Who to talk to */}
      <section className="border-t border-sand">
        <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-6 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
          <div>
            <h2 className="display display-md">Who to talk to</h2>
            <p className="mt-3 max-w-sm text-ink-soft">
              Start with {contacts[0].name.split(" ")[0]}. She knows your project and brings in the architect or
              engineer when they are needed.
            </p>
          </div>
          <ol className="border-t border-ink">
            {contacts.map((contact) => (
              <li key={contact.name} className="grid gap-x-6 gap-y-1 border-b border-sand py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <p className="text-ink-soft">{contact.level}</p>
                  <p className="text-[1.125rem] font-semibold">
                    {contact.name}, {contact.role.toLowerCase()}
                  </p>
                  <p className="text-ink-soft">{contact.responds}</p>
                </div>
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="link self-center font-semibold">
                  {contact.phone}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

function AgreedRow({ term, detail, value, href }: { term: string; detail: string; value: string; href?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-b border-sand py-4">
      <div>
        <dt className="text-[1.125rem] font-semibold">{term}</dt>
        <dd className="text-ink-soft">{detail}</dd>
      </div>
      <dd className="text-right">
        {href ? (
          <Link href={href} className={/^[+₹−]/.test(value) ? "figure text-[1.25rem]" : "link font-semibold"}>
            {value}
          </Link>
        ) : (
          <span className="figure text-[1.25rem]">{value}</span>
        )}
      </dd>
    </div>
  );
}
