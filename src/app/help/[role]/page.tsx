import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SignInOrOut } from "@/components/sign-out";
import { GUIDE_ROLES, GUIDES, isGuideRole, type Guide } from "@/components/guides/guide-data";
import { OpenStep } from "@/components/guides/open-step";
import { countWord } from "@/lib/format";

// One role's guide: three to five numbered steps, each with the screen it happens on.

export function generateStaticParams() {
  return GUIDE_ROLES.map((role) => ({ role }));
}

export default function GuidePage({ params }: PageProps<"/help/[role]">) {
  return (
    <main className="flex flex-1 flex-col bg-lime">
      <Suspense>
        <GuideFromParams params={params} />
      </Suspense>
    </main>
  );
}

async function GuideFromParams({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!isGuideRole(role)) notFound();
  return <GuideSteps guide={GUIDES[role]} />;
}

function GuideSteps({ guide }: { guide: Guide }) {
  return (
    <>
      <header className="on-dark bg-rosewood text-lime">
        <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-5 sm:px-8 sm:pb-12 sm:pt-8">
          <Link href="/help" className="link inline-flex min-h-11 items-center text-15 text-lime/80 hover:text-lime">
            All guides
          </Link>
          <h1 className="display mt-4 text-32 sm:mt-8">
            {guide.title}, in {countWord(guide.steps.length)} steps
          </h1>
          <p className="mt-3 max-w-[48ch] text-17 text-lime/80">{guide.who}</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
        <ol className="grid gap-8">
          {guide.steps.map((step, i) => (
            <li key={step.text} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[3rem_minmax(0,1fr)]">
              <span className="figure text-22 leading-snug text-laterite" aria-hidden="true">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-22 font-semibold leading-snug">
                  <span className="sr-only">Step {i + 1}. </span>
                  {step.text}
                </p>
                <p className="mt-1 max-w-[52ch] text-15 text-ink-soft">{step.how}</p>
                <OpenStep
                  role={guide.role}
                  href={step.href}
                  className="link mt-1 inline-flex min-h-11 items-center text-15 font-semibold"
                >
                  Open this screen
                  <span className="sr-only"> for step {i + 1}</span>
                </OpenStep>
              </div>
            </li>
          ))}
        </ol>

        <ul className="mt-12 flex flex-wrap gap-x-6 text-15">
          <li>
            <OpenStep role={guide.role} href={guide.home.href} className="link inline-flex min-h-11 items-center">
              {guide.home.label}
            </OpenStep>
          </li>
          <li>
            <SignInOrOut className="link inline-flex min-h-11 items-center" />
          </li>
        </ul>
      </div>
    </>
  );
}
