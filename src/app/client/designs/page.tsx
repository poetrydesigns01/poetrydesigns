"use client";

import Link from "next/link";
import { PageBand, Section, Status } from "@/components/page-band";
import { designs, type Design, type DesignStatus } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";
import { formatDate } from "@/lib/format";

export default function DesignsPage() {
  const { designDecisions } = useDemo();

  const rows = designs.map((design) => {
    const latest = design.versions[design.versions.length - 1];
    const decision = designDecisions[design.id];
    return {
      design,
      version: latest.version,
      status: (decision?.status ?? latest.status) as DesignStatus,
      date: decision?.decidedOn ?? latest.decidedOn ?? latest.uploadedOn,
    };
  });

  const waiting = rows.filter((row) => row.status === "awaiting");
  const decided = rows.filter((row) => row.status !== "awaiting");

  return (
    <>
      <PageBand
        title="Designs"
        lede="Your drawings and specifications open here in the browser. Every version and every decision is kept, so there is one record of what was shown and what was agreed."
      />

      <Section title="Waiting for your decision">
        {waiting.length === 0 ? (
          <p className="text-ink-soft">Nothing is waiting. We will email you when a new version is ready.</p>
        ) : (
          <DesignList rows={waiting} />
        )}
      </Section>

      <div className="bg-sand-2">
        <Section title="Decided">
          <DesignList rows={decided} />
        </Section>
      </div>
    </>
  );
}

function DesignList({ rows }: { rows: { design: Design; version: number; status: DesignStatus; date: string }[] }) {
  return (
    <ul className="border-t border-ink">
      {rows.map(({ design, version, status, date }) => (
        <li
          key={design.id}
          className="grid gap-x-8 gap-y-2 border-b border-sand py-5 md:grid-cols-[minmax(0,1fr)_16rem_auto] md:items-center"
        >
          <div>
            <h3 className="text-[1.25rem] font-semibold leading-snug">{design.title}</h3>
            <p className="text-ink-soft">
              {design.kind}, sheet {design.sheet}, version {version}
            </p>
          </div>
          <p>
            {status === "awaiting" && <Status tone="due">Waiting for you</Status>}
            {status === "approved" && <Status tone="done">Approved</Status>}
            {status === "changes-requested" && <Status tone="alert">Changes requested</Status>}
            <span className="text-ink-soft">
              {status === "awaiting" ? " since " : " on "}
              {formatDate(date)}
            </span>
          </p>
          <Link href={`/client/designs/${design.id}`} className={`btn ${status === "awaiting" ? "btn-primary" : "btn-quiet"}`}>
            {status === "awaiting" ? "Review" : "Open"}
          </Link>
        </li>
      ))}
    </ul>
  );
}
