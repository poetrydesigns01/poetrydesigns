// The brown band that opens every client page below the navigation.

export function PageBand({ title, lede, children }: { title: string; lede?: string; children?: React.ReactNode }) {
  return (
    <section className="on-dark bg-rosewood text-lime">
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-8 sm:px-8 sm:pb-14 sm:pt-12">
        <h1 className="display display-lg max-w-3xl">{title}</h1>
        {lede && <p className="mt-4 max-w-2xl text-[1.125rem] text-lime/80">{lede}</p>}
        {children}
      </div>
    </section>
  );
}

export function Section({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <h2 className="display display-md">{title}</h2>
      {intro && <p className="mt-2 max-w-2xl text-ink-soft">{intro}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

const statusStyles = {
  due: "text-brass",
  done: "text-kota",
  alert: "text-brick",
  quiet: "text-ink-soft",
} as const;

/** Status is always written out in words; colour only reinforces it. */
export function Status({ tone, children }: { tone: keyof typeof statusStyles; children: React.ReactNode }) {
  return <span className={`font-semibold ${statusStyles[tone]}`}>{children}</span>;
}
