import { ClientNav } from "@/components/client-nav";
import { PauseBar, PauseProvider } from "@/components/register/recording-pause";
import { Settle } from "@/components/settle";
import { TrialStrip } from "@/components/trial-strip";

export default function ClientLayout({ children }: LayoutProps<"/client">) {
  return (
    <Settle>
      <PauseProvider>
        <ClientNav />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        <TrialStrip />
        <PauseBar />
      </PauseProvider>
    </Settle>
  );
}
