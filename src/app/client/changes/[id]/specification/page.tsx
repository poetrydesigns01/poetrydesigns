import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Watermark } from "@/components/changes/watermark";
import { changes, client, TODAY, type Change } from "@/lib/demo-data";
import { formatDate } from "@/lib/format";

// The revised specification that came with a change: one sheet, view only, with her name
// and today's date across it. It opens here and is never handed over.

const OPEN = ["terrace-jacuzzi", "living-glazing"];

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
    <>
      <section className="on-dark bg-rosewood text-lime">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-8 sm:pb-12 sm:pt-6">
          <Link href="/client/changes" className="link inline-flex min-h-11 items-center text-lime/80">
            Back to changes
          </Link>
          <h1 className="display display-lg mt-2 max-w-3xl">{spec.title}</h1>
          <p className="mt-3 max-w-[58ch] text-17 text-lime/85">
            Sheet {spec.sheet}, raised with the change on {formatDate(change.raisedOn)}.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
        <div className="relative select-none border-2 border-ink bg-paper print:hidden">
          <div className="px-5 py-6 sm:px-10 sm:py-10">
            {/* The head above names the sheet, so the sheet itself starts with its rows. */}
            <dl>
              {spec.rows.map(([item, value], index) => (
                <div
                  key={item}
                  className={`grid gap-x-6 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]${index > 0 ? " border-t border-sand" : ""}`}
                >
                  <dt className="font-semibold">{item}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Watermark text={watermark} />
        </div>
        <p className="hidden print:block">This sheet opens in the portal only and is not printed.</p>
        <p className="mt-4 max-w-[58ch] text-ink-soft">
          This opens here only and cannot be downloaded. Your name and today&rsquo;s date are marked across it.
        </p>
      </div>
    </>
  );
}
