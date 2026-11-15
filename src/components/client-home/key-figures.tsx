/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { ReactNode } from "react";
import { StatusChip } from "@/components/register/status-chip";
import { formatDate, inr } from "@/lib/format";
import type { PaymentStageView, Tone } from "@/lib/portal";
import { ContractIcon, KeyIcon, PaidIcon, RupeeIcon } from "./icons";

// Four figures: contract value, paid so far, the next payment and the handover date, with
// the days her changes added in bold brick.

function Stat({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="glass flex min-w-0 flex-col gap-2 p-3.5 sm:p-4">
      <p className="flex items-center gap-2 text-ink-soft">
        <span className="grid size-7 flex-none place-items-center rounded-full bg-white/60 text-laterite">{icon}</span>
        <span className="lettering">{label}</span>
      </p>
      {children}
    </li>
  );
}

export function KeyFigures({
  contractValue,
  paid,
  billable,
  nextPayment,
  nextChip,
  handover,
  extraDays,
}: {
  contractValue: number;
  paid: number;
  billable: number;
  nextPayment: PaymentStageView | null;
  nextChip: { tone: Tone; words: string } | null;
  handover: string | null;
  extraDays: number;
}) {
  const share = billable > 0 ? Math.round((paid / billable) * 100) : 0;

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4" aria-label="Key figures">
      <Stat icon={<ContractIcon className="size-4" />} label="Contract value">
        <p className="figure text-17 text-ink min-[360px]:text-22">{inr(contractValue)}</p>
        <p className="mt-auto text-13 text-ink-soft">Before GST</p>
      </Stat>
      <Stat icon={<PaidIcon className="size-4" />} label="Paid">
        <p className="figure text-17 text-ink min-[360px]:text-22">{inr(paid)}</p>
        <div className="mt-auto flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
            <div className="h-full origin-left rounded-full bg-kota" style={{ transform: `scaleX(${share / 100})` }} />
          </div>
          <span className="text-13 text-ink-soft">{share}% paid</span>
        </div>
      </Stat>
      <Stat icon={<RupeeIcon className="size-4" />} label={nextPayment ? `Next · ${nextPayment.instalmentLabel}` : "Next payment"}>
        {nextPayment ? (
          <>
            <p className="figure text-17 text-ink min-[360px]:text-22">{inr(nextPayment.outstanding || nextPayment.total)}</p>
            {nextChip && (
              <div className="mt-auto">
                <StatusChip tone={nextChip.tone}>{nextChip.words}</StatusChip>
              </div>
            )}
          </>
        ) : (
          <p className="figure text-17 text-ink min-[360px]:text-22">All paid</p>
        )}
      </Stat>
      <Stat icon={<KeyIcon className="size-4" />} label="Handover">
        <p className="figure text-17 text-ink min-[360px]:text-22">{handover ? formatDate(handover) : "To be set"}</p>
        {extraDays > 0 && (
          <p className="late-text mt-auto text-15">
            +{extraDays} days<span className="max-xl:sr-only"> from changes</span>
          </p>
        )}
      </Stat>
    </ul>
  );
}
