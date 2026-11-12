"use client";

import { dayWords } from "@/components/admin/admin-data";
import { Register, RegisterRow } from "@/components/register/register";
import { useFirm, useProjection } from "@/lib/demo-store";
import type { DesignStatus, DesignVersion } from "@/lib/demo-data";
import { ageWords, daysSince } from "@/lib/firm";
import type { ProjectId } from "@/lib/firm-data";

// Every design on the project with its versions and the client's word on each. This list
// is read only: architects upload new versions from their own Designs page.

const STATUS: Record<DesignStatus, string> = {
  awaiting: "Waiting for the client",
  approved: "Approved",
  "changes-requested": "Changes asked",
};

function versionLine(v: DesignVersion, client: string): string {
  const sent = `Version ${v.version}, sent by ${v.uploadedBy} on ${dayWords(v.uploadedOn)}.`;
  if (v.status === "approved")
    return `${sent} Approved by ${client}${v.decidedOn ? ` on ${dayWords(v.decidedOn)}` : ""}.`;
  if (v.status === "changes-requested")
    return `${sent} ${client} asked for changes${v.decidedOn ? ` on ${dayWords(v.decidedOn)}` : ""}.`;
  return `${sent} Waiting for ${client}.`;
}

export function ProjectDesigns({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const projection = useProjection();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;
  const client = p.clientWord === "Meera" ? "Meera" : "the client";

  if (projectId === "iyer") {
    return (
      <Register title="Designs" empty="No designs have been sent yet." limit={20}>
        {projection.designs.map((d) => {
          const waiting = d.status === "awaiting";
          const days = waiting ? daysSince(d.latest.uploadedOn) : 0;
          const earlier = d.design.versions.filter((v) => v.version !== d.latest.version);
          return (
            <RegisterRow
              key={d.design.id}
              id={`design:iyer:${d.design.id}`}
              margin={
                waiting
                  ? "With Meera"
                  : d.status === "approved"
                    ? "Agreed"
                    : `With ${d.latest.uploadedBy.split(" ")[0]}`
              }
              marginSub={waiting ? ageWords(days) : undefined}
              client={waiting}
              title={`${d.design.title}, ${d.design.sheet}`}
              sentence={
                <>
                  {versionLine({ ...d.latest, status: d.status }, client)}
                  {d.latest.comment ? ` "${d.latest.comment}"` : ""}
                </>
              }
              figure={`v${d.latest.version}`}
            >
              {earlier.length > 0 && (
                <details>
                  <summary className="lettering inline-flex min-h-11 cursor-pointer items-center underline decoration-1 underline-offset-4">
                    Earlier versions ({earlier.length})
                  </summary>
                  <ul className="grid gap-2 pb-2">
                    {[...earlier].reverse().map((v) => (
                      <li key={v.version} className="max-w-[56ch] text-15 text-ink-soft">
                        {versionLine(v, client)}
                        {v.comment ? ` "${v.comment}"` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </RegisterRow>
          );
        })}
      </Register>
    );
  }

  const designs = firm.designs.filter((d) => d.projectId === projectId);
  return (
    <Register title="Designs" empty="No designs have been sent to the client yet." limit={20}>
      {designs.map((d) => (
        <RegisterRow
          key={d.designId}
          id={`design:${d.projectId}:${d.designId}`}
          margin={
            d.status === "awaiting" ? `With ${p.clientWord}` : d.status === "approved" ? "Agreed" : "With the studio"
          }
          marginSub={d.status === "awaiting" ? ageWords(d.days) : undefined}
          client={d.status === "awaiting"}
          title={d.title}
          sentence={`Version ${d.version}, sent by ${d.by} on ${dayWords(d.sentAt)}. ${STATUS[d.status]}.`}
          figure={`v${d.version}`}
        />
      ))}
    </Register>
  );
}
