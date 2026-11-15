"use client";

import { ApprovalsCard } from "@/components/client-home/approvals-card";
import { useClientHome } from "@/components/client-home/data";
import { ElevationPanel } from "@/components/client-home/elevation-panel";
import { KeyFigures } from "@/components/client-home/key-figures";
import { NextActionCard } from "@/components/client-home/next-action";
import { StageRail } from "@/components/client-home/stage-rail";
import { TeamCard } from "@/components/client-home/team-card";
import "@/components/client-home/home.css";
import { client, project as iyer } from "@/lib/demo-data";

// Iyer Residence home: the one thing that needs her, her front elevation with the house
// rising, four figures, the approvals stage by stage, and the timeline down the right side.

export default function ClientHome() {
  const home = useClientHome();
  const { timeline } = home;

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5 lg:py-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="grid min-w-0 content-start gap-4 lg:gap-5">
        <header className="px-1">
          <p className="lettering text-ink">{iyer.name}</p>
          <h1 className="display text-32 text-ink">Hello, {client.firstName}</h1>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:gap-5">
          <NextActionCard actions={home.actions} />
          <ElevationPanel progress={home.progress} elevation={home.frontElevation} />
        </div>

        <KeyFigures
          contractValue={home.project?.contractValue ?? 0}
          paid={home.paid}
          billable={home.billable}
          nextPayment={home.nextPayment}
          nextChip={home.nextPaymentChip}
          handover={timeline?.handoverExpected ?? null}
          extraDays={timeline?.extraDays ?? 0}
        />

        <ApprovalsCard stages={home.designStages} />
      </div>

      <aside className="grid min-w-0 content-start gap-4 lg:gap-5" aria-label="Timeline and team">
        {timeline && (
          <div className="hidden lg:block">
            <StageRail timeline={timeline} progress={home.progress} />
          </div>
        )}
        <TeamCard />
      </aside>
    </div>
  );
}
