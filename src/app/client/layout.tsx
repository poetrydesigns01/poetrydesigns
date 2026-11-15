import { ClientNav } from "@/components/client-nav";
import { PauseBar, PauseProvider } from "@/components/register/recording-pause";
import { SessionGate } from "@/components/session-gate";
import { Settle } from "@/components/settle";
import { TrialStrip } from "@/components/trial-strip";

// The client's screens open only once someone has signed in on the first screen. They sit
// on the glass backdrop (.glass-world in globals.css).
export default function ClientLayout({ children }: LayoutProps<"/client">) {
  return (
    <SessionGate>
      <Settle>
        <PauseProvider>
          <div className="glass-world flex min-h-svh flex-1 flex-col">
            <ClientNav />
            <main className="flex-1 pb-24 lg:pb-0">{children}</main>
            <TrialStrip />
            <PauseBar />
          </div>
        </PauseProvider>
      </Settle>
    </SessionGate>
  );
}
