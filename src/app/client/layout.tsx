import { ClientNav } from "@/components/client-nav";
import { PauseBar, PauseProvider } from "@/components/register/recording-pause";
import { SessionGate } from "@/components/session-gate";
import { Settle } from "@/components/settle";
import { TrialStrip } from "@/components/trial-strip";

// The client's screens open only once someone has signed in on the first screen.
export default function ClientLayout({ children }: LayoutProps<"/client">) {
  return (
    <SessionGate>
      <Settle>
        <PauseProvider>
          <ClientNav />
          <main className="flex-1 pb-20 lg:pb-0">{children}</main>
          <TrialStrip />
          <PauseBar />
        </PauseProvider>
      </Settle>
    </SessionGate>
  );
}
