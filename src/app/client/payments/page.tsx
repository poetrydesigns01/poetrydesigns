/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useState } from "react";
import { PaySummary } from "@/components/payments/pay-summary";
import { SplitCard } from "@/components/payments/split-card";
import { StageTable } from "@/components/payments/stage-table";
import "@/components/payments/payments.css";
import { useDemo, useFirm } from "@/lib/demo-store";
import { inr } from "@/lib/format";

// Payments: the sign-up and instalments 1 to 10 on Poetry's workflow. Each instalment opens
// only once the one before it is received, and the milestone it unlocks waits for it:
// demand letter raised, the client says "Payment made", finance confirms receipt.

export default function PaymentsPage() {
  const demo = useDemo();
  const firm = useFirm();
  const stages = firm.payments("iyer");
  const [spoken, setSpoken] = useState("");

  const due = stages.filter((s) => s.canMarkPaid).length;
  const waiting = stages.filter((s) => s.state === "client-paid").length;

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <h1 className="display text-32 text-ink">Payments</h1>
        {due > 0 ? (
          <span className="glass-chip chip-waiting">{due} due</span>
        ) : waiting > 0 ? null : (
          <span className="glass-chip chip-done">Up to date</span>
        )}
      </header>

      <PaySummary stages={stages} />
      <SplitCard />
      <StageTable
        stages={stages}
        onMarkPaid={(stage, ref) => {
          demo.markPaymentMade(stage.n, ref);
          setSpoken(`${stage.instalmentLabel} marked paid, ${inr(stage.outstanding)}.`);
        }}
        onRequestLetter={(stage) => {
          demo.requestDemandLetter(stage.n);
          setSpoken(`Demand letter requested for ${stage.instalmentLabel}.`);
        }}
      />
      <p className="sr-only" role="status">
        {spoken}
      </p>
    </div>
  );
}
