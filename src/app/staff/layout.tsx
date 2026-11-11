import Link from "next/link";

// Staff screens share the client side's type and colour, but stay plain and quick.
export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return (
    <div className="flex flex-1 flex-col bg-paper">
      <header className="border-b border-sand">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <span className="display text-[1.125rem] leading-none">Poetry Designs</span>
          <Link href="/" className="link text-[0.9375rem] text-ink-soft">
            Switch person
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
