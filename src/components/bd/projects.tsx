/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useState } from "react";
import { Empty } from "@/components/architect/glass-ui";
import { StaffBoard } from "@/components/register/staff-board";
import { NpsScore } from "@/components/shared/nps-score";
import { ProjectTile } from "@/components/shared/project-tile";
import { ThumbnailUpload } from "@/components/shared/thumbnail-upload";
import type { NpsBand } from "@/lib/desk";
import { useFirm } from "@/lib/demo-store";
import type { Tone } from "@/lib/portal";
import { Segmented } from "./bd-ui";
import { ME } from "./prospect-bits";

// The clients' projects as tiles, each with its picture (the 3D elevation once uploaded)
// and the client's latest score. Rohan's own clients first; everyone's on a tap. "Pictures"
// turns the grid into one upload row per project.

const BAND_TONE: Record<NpsBand, Tone> = { promoter: "done", passive: "waiting", detractor: "late" };

export function BdProjects() {
  const firm = useFirm();
  const [who, setWho] = useState<"mine" | "all">("mine");
  const [pictures, setPictures] = useState(false);
  const live = firm.projects
    .filter((p) => p.phase !== "draft")
    .sort((a, b) => (b.onboardedOn ?? "").localeCompare(a.onboardedOn ?? ""));
  const mine = live.filter((p) => firm.advisorOf(p.id) === ME);
  const shown = who === "mine" ? mine : live;
  const nps = firm.npsForPerson(ME);

  return (
    <>
      <StaffBoard
        place="Projects"
        headline={`${shown.length} ${shown.length === 1 ? "project" : "projects"}`}
        chip={false}
      />
      <div className="mt-6 grid gap-4 lg:mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Whose clients"
              options={[
                { id: "mine", label: "Mine", count: mine.length },
                { id: "all", label: "Everyone", count: live.length },
              ]}
              value={who}
              onChange={(id) => setWho(id)}
            />
            <button type="button" className="btn btn-glass min-h-11 px-4 text-15" aria-pressed={pictures} onClick={() => setPictures(!pictures)}>
              {pictures ? "Done" : "Pictures"}
            </button>
          </div>
          <div className="glass px-4 py-2.5">
            <NpsScore value={nps.nps} count={nps.count} promoters={nps.promoters} passives={nps.passives} detractors={nps.detractors} size="sm" />
          </div>
        </div>

        {shown.length === 0 ? (
          <section className="glass p-4">
            <Empty>None yet</Empty>
          </section>
        ) : pictures ? (
          <section className="glass p-2 sm:p-3" aria-label="Pictures">
            <ul className="grid gap-1 md:grid-cols-2">
              {shown.map((p) => (
                <li key={p.id} className="glass-row grid gap-2 px-3 py-3">
                  <p className="truncate text-15 font-semibold text-ink">{p.name}</p>
                  <ThumbnailUpload projectId={p.id} by={ME} />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {shown.map((p) => {
              const latest = firm.npsForProject(p.id).latest;
              return (
                <li key={p.id} className="min-w-0">
                  <ProjectTile
                    project={p}
                    className="h-full"
                    badge={
                      latest
                        ? { words: `NPS ${latest.score}`, tone: BAND_TONE[latest.band] }
                        : { words: "No score", tone: "locked" }
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
