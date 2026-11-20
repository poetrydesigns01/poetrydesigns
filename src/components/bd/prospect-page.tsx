/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { dated, Panel, rowBtn } from "@/components/architect/glass-ui";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { DESK_HREF } from "@/lib/desk";
import { useDemo, useFirm } from "@/lib/demo-store";
import { formatDate, inr } from "@/lib/format";
import {
  ASSET_WORDS,
  CAPTURE_WORDS,
  FACING_WORDS,
  ONBOARDING,
  PRODUCT_WORDS,
  PROSPECT_LEVELS,
  SERVICE_WORDS,
  UNDER_DISCUSSION,
} from "@/lib/prospects";
import { budgetWords } from "./bd-words";
import { IdleChip, ME, ProspectActions } from "./prospect-bits";

// One prospect: the enquiry as taken, and where the discussion stands, with the level, the
// sign-up and dropping at the side. A dropped lead of one's own can be reopened.

function Fact({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`glass-inner grid min-w-0 content-start gap-0.5 px-3 py-2.5 ${wide ? "col-span-2" : ""}`}>
      <dt className="lettering truncate text-ink-soft">{label}</dt>
      <dd className="min-w-0 text-15 text-ink wrap-anywhere">{children || "—"}</dd>
    </div>
  );
}

export function ProspectPage({ id }: { id: string }) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const p = firm.prospect(id);

  if (!p) {
    return (
      <>
        <StaffBoard place={UNDER_DISCUSSION} headline="Not found" back={{ label: `Back to ${UNDER_DISCUSSION}`, href: DESK_HREF.prospects }} chip={false} />
        <p className="glass mt-6 px-4 py-3 text-15 text-ink">No such enquiry</p>
      </>
    );
  }

  const advisor = firm.person(p.advisor);
  const mine = p.advisor === ME;

  return (
    <>
      <StaffBoard
        place={UNDER_DISCUSSION}
        headline={p.owner}
        state={p.status === "active" ? `${p.levelLabel}, ${p.levelName}` : p.statusWords}
        back={{ label: `Back to ${UNDER_DISCUSSION}`, href: DESK_HREF.prospects }}
        chip={false}
      />

      <div className="mt-6 grid items-start gap-4 lg:mt-8 min-[1200px]:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-4">
          <Panel title="Enquiry" aside={<StatusChip tone="locked">{CAPTURE_WORDS[p.capture]}</StatusChip>}>
            <dl className="grid grid-cols-2 gap-2 md:grid-cols-3">
              <Fact label="Phone">
                <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="link figure">
                  {p.phone}
                </a>
              </Fact>
              <Fact label="Email">{p.email}</Fact>
              <Fact label="Occupation">{p.occupation}</Fact>
              <Fact label="Locality">{p.locality}</Fact>
              <Fact label="Layout">{[p.layoutName, p.plotNo ? `Plot ${p.plotNo}` : ""].filter(Boolean).join(", ")}</Fact>
              <Fact label="Plot">
                <span className="figure">
                  {p.plotDimensions} · {p.plotArea.toLocaleString("en-IN")} sq ft
                </span>
              </Fact>
              <Fact label="Facing">{FACING_WORDS[p.facing]}</Fact>
              <Fact label="Bedrooms">
                <span className="figure">{p.bedrooms} BHK</span>
              </Fact>
              <Fact label="Family">
                <span className="figure">{p.familySize || "—"}</span>
              </Fact>
              <Fact label="Car parks">
                <span className="figure">{p.carParks}</span>
              </Fact>
              <Fact label="Budget">
                <span className="figure" title={inr(p.budget)}>
                  {budgetWords(p.budget)}
                </span>
              </Fact>
              <Fact label="Start">{p.startBy ? formatDate(p.startBy).replace(/^\d+\s/, "") : ""}</Fact>
              <Fact label="Service">{SERVICE_WORDS[p.service]}</Fact>
              <Fact label="Asset">{ASSET_WORDS[p.assetClass]}</Fact>
              <Fact label="Product">{PRODUCT_WORDS[p.product]}</Fact>
              <Fact label="Referred by">{p.referredBy}</Fact>
              <Fact label="Enquired">{formatDate(p.enquiredOn)}</Fact>
              {p.dob ? <Fact label="Date of birth">{formatDate(p.dob)}</Fact> : null}
            </dl>
          </Panel>
        </div>

        <aside className="grid gap-4 max-[1199px]:order-first">
          <section className="glass-dark grid gap-3 p-5" aria-label="Where it stands">
            <p className="lettering text-lime/75">{p.status === "converted" ? ONBOARDING : p.status === "dropped" ? `At ${p.levelLabel}` : p.levelLabel}</p>
            <p className="display text-22">{p.status === "active" ? p.levelName : p.statusWords}</p>
            <ol className="flex gap-1" aria-label={`${p.levelLabel} of ${PROSPECT_LEVELS.length - 1}`}>
              {PROSPECT_LEVELS.map((l) => (
                <li
                  key={l.level}
                  title={l.name}
                  className={`h-1.5 flex-1 rounded-full ${p.status === "converted" || l.level <= p.level ? "bg-lime" : "bg-lime/20"}`}
                />
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-2">
              {p.status === "active" && <IdleChip p={p} />}
              <span className="text-13 text-lime/75">
                {advisor?.name ?? p.advisor} · held to {formatDate(p.holdsUntil)}
              </span>
            </div>
          </section>

          {p.status === "active" && mine && (
            <Panel title="Move">
              <ProspectActions p={p} className="px-1" />
            </Panel>
          )}

          {p.status === "active" && !mine && (
            <p className="glass px-4 py-3 text-15 text-ink">{advisor?.first ?? "Another"}&apos;s lead</p>
          )}

          {p.status === "converted" && (
            <Panel title="Signed up">
              <div className="grid gap-3 px-1">
                {p.signUp && (
                  <p className="flex flex-wrap items-baseline gap-x-3">
                    <span className="figure text-22 text-ink">{inr(p.signUp.amount)}</span>
                    <span className="text-13 text-ink-soft">
                      {dated(p.signUp.on)} · {p.signUp.reference}
                    </span>
                  </p>
                )}
                {p.draftId && (
                  <Link href={DESK_HREF.onboard(p.draftId)} className={`${rowBtn} justify-self-start`}>
                    Open onboarding
                  </Link>
                )}
              </div>
            </Panel>
          )}

          {p.status === "dropped" && (
            <Panel title="Dropped">
              <p className="px-1 text-15 text-ink">{p.dropReason}</p>
              <p className="px-1 pt-1 text-13 text-ink-soft">{p.droppedAt ? dated(p.droppedAt) : ""}</p>
              {mine && (
                <button
                  type="button"
                  className={`${rowBtn} mt-3 justify-self-start`}
                  aria-disabled={pause.pending !== null ? true : undefined}
                  onClick={(event) => {
                    if (pause.pending !== null) return;
                    const { reopenProspect } = demo;
                    pause.start({
                      what: `${p.owner}, reopened`,
                      origin: event.currentTarget,
                      commit: () => void reopenProspect(p.id, ME),
                    });
                  }}
                >
                  Reopen
                </button>
              )}
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}
