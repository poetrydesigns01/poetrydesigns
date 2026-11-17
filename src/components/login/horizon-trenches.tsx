/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { memo, type CSSProperties } from "react";
import { CourseTrench } from "@/components/admin/course-trench";
import { useFirm } from "@/lib/demo-store";

// Under each site on the admin's horizon, that project's money as course and trench: the
// admin's own drawing, in the ground the pulled-back camera shows below the line. Positions
// are shares of the stage; the sites stand past its edges, at SCENE.villa and SCENE.farm.
// It reads the firm's registers, which nothing else on the first screen needs, so the stage
// loads it on its own once the page is up (see site-stage.tsx).
const TRENCH_AT = [
  { left: -18, w: 12 },
  { left: 105.5, w: 12 },
];

export const HorizonTrenches = memo(function HorizonTrenches() {
  const firm = useFirm();
  const sites = firm.projects.filter((p) => p.phase !== "draft" && p.id !== "iyer").slice(0, 2);
  const scale = Math.max(1, ...sites.flatMap((p) => [Math.abs(p.margin ?? 0), Math.abs(p.cash)]));
  return (
    <div className="role-layer lg-trenches" data-for="admin">
      {sites.map((p, k) => (
        <div
          key={p.id}
          className="lg-trench"
          style={{ left: `${TRENCH_AT[k].left}%`, width: `${TRENCH_AT[k].w}%`, "--k": k } as CSSProperties}
        >
          <CourseTrench
            margin={p.margin}
            cash={p.cash}
            inDesign={p.margin === null}
            scale={scale}
            tone="paper"
            width={120}
            height={56}
          />
        </div>
      ))}
    </div>
  );
});
