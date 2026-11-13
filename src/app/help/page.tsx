import Link from "next/link";
import { GUIDE_ROLES, GUIDES } from "@/components/guides/guide-data";
import { countWord } from "@/lib/format";

// The guides for the training session: one row per role, each opening its own short guide.

export default function GuidesPage() {
  return (
    <main className="flex flex-1 flex-col bg-lime">
      <header className="on-dark bg-rosewood text-lime">
        <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-5 sm:px-8 sm:pb-12 sm:pt-8">
          <Link href="/" className="display inline-flex min-h-11 items-center text-22 leading-none">
            Poetry Designs
          </Link>
          <h1 className="display mt-6 text-32 sm:mt-10">Guides</h1>
          <p className="mt-3 max-w-[48ch] text-17 text-lime/80">
            Short guides for the training session. Each takes about two minutes.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
        <nav aria-label="Guides">
          <ul className="grid gap-5">
            {GUIDE_ROLES.map((role) => {
              const guide = GUIDES[role];
              return (
                <li key={role}>
                  <Link
                    href={`/help/${role}`}
                    className="group grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-l-[3px] border-transparent py-1 pl-4 hover:border-rosewood focus-visible:border-rosewood"
                  >
                    <span className="min-w-0">
                      <span className="block text-22 font-semibold leading-snug underline decoration-ink/30 decoration-1 underline-offset-[0.2em] group-hover:decoration-ink">
                        {guide.title}
                      </span>
                      <span className="mt-0.5 block text-15 text-ink-soft">{guide.who}</span>
                    </span>
                    <span className="lettering whitespace-nowrap text-ink-soft">
                      {countWord(guide.steps.length, true)} steps
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className="mt-10 text-15">
          <Link href="/" className="link inline-flex min-h-11 items-center">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
