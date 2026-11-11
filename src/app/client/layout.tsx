import { ClientNav } from "@/components/client-nav";

export default function ClientLayout({ children }: LayoutProps<"/client">) {
  return (
    <>
      <ClientNav />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
    </>
  );
}
