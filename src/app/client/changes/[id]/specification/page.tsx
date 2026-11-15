import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackIcon, LockIcon } from "@/components/craft/glass-icons";
import { SpecDecision } from "@/components/changes/spec-decision";
import { Watermark } from "@/components/changes/watermark";
import { changes, client, TODAY, type Change } from "@/lib/demo-data";
import { formatDate } from "@/lib/format";

// The revised specification that came with a change: the decision strip, then one sheet,
// view only, with her name and today's date across it. It opens here and is never handed over.

const OPEN = ["terrace-jacuzzi", "living-glazing", "study-room"];

export function generateStaticParams() {
  return OPEN.map((id) => ({ id }));
}

export default function SpecificationPage({ params }: PageProps<"/client/changes/[id]/specification">) {
  return (
    <Suspense>
      <SpecificationFromParams params={params} />
    </Suspense>
  );
}

async function SpecificationFromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const change = changes.find((c) => c.id === id && OPEN.includes(c.id));
  if (!change) notFound();
  return <Specification change={change} />;
}

function Specification({ change }: { change: Change }) {
  const { revisedSpec: spec } = change;
  const watermark = `${client.name}, ${formatDate(TODAY)}, view only`;

  return (
    <div className="mx-auto grid max-w-4xl gap-4 px-4 py-6 sm:px-6 lg:py-10">
      <header className="grid gap-3 px-1">
        <Link href="/client/changes" className="btn btn-glass min-h-11 gap-1 justify-self-start pl-3 pr-4 text-15">
          <BackIcon size={17} />
          Changes
        </Link>
        <h1 className="display text-32 text-ink">{spec.title}</h1>
      </header>

      <SpecDecision changeId={change.id} />

      <section
        aria-label={`Sheet ${spec.sheet}`}
        className="glass-strong relative isolate select-none overflow-hidden p-2 print:hidden sm:p-3"
      >
        <div className="relative flex flex-wrap items-center justify-between gap-2 px-3 pb-1 pt-2">
          <p className="lettering text-ink-soft">
            Sheet {spec.sheet} · {formatDate(change.raisedOn)}
          </p>
          <span className="glass-chip chip-locked">View only</span>
        </div>
        <dl className="relative">
          {spec.rows.map(([item, value]) => (
            <div key={item} className="glass-row grid gap-x-6 gap-y-0.5 px-3 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <dt className="text-15 font-semibold">{item}</dt>
              <dd className="text-15">{value}</dd>
            </div>
          ))}
        </dl>
        <Watermark text={watermark} />
      </section>
      <p className="hidden print:block">
        <LockIcon size={14} /> View only
      </p>
    </div>
  );
}
