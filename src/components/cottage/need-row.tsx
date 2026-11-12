import Link from "next/link";

// One thing waiting for her on the cottage: a whole-row link with the title, the figure on
// the right and one line on what it means.

export function NeedRow({
  href,
  title,
  figure,
  line,
}: {
  href: string;
  title: string;
  figure?: string;
  line: string;
}) {
  return (
    <Link
      href={href}
      className="group -mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-l-[3px] border-transparent px-3 py-2 hover:border-rosewood hover:bg-paper/60 focus-visible:border-rosewood"
    >
      <span className="min-w-0 text-22 font-semibold leading-snug underline decoration-ink/25 decoration-1 underline-offset-[0.2em] group-hover:decoration-ink">
        {title}
      </span>
      {figure ? <span className="figure whitespace-nowrap text-22">{figure}</span> : <span />}
      <span className="col-span-2 mt-1 max-w-[58ch] text-17 text-ink-soft">{line}</span>
    </Link>
  );
}
