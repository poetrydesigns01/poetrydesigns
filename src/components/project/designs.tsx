"use client";

import { dayWords } from "@/components/admin/admin-data";
import { Empty, GlassTable, Panel } from "@/components/admin/glass-kit";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import type { DesignView } from "@/lib/firm";
import type { ProjectId } from "@/lib/firm-data";
import { formatStampShort } from "@/lib/format";
import type { DesignItemView, DesignStageView, Tone } from "@/lib/portal";

// The designs, stage by stage as the client sees them: floor plan, 3D elevation, final cost
// estimate. Each item: who prepared it, the version, when the client viewed it, and the
// decision with its date and time, kept as proof. Read only: architects upload from their
// own Designs page.

function stageChip(s: DesignStageView): { words: string; tone: Tone } {
  if (s.locked) return { words: "Locked", tone: "locked" };
  if (s.status === "approved") return { words: "Approved", tone: "done" };
  if (s.total === 0) return { words: "Not started", tone: "locked" };
  return { words: `${s.approved} / ${s.total} approved`, tone: s.approved > 0 ? "progress" : "waiting" };
}

const OLD_WORDS: Record<DesignView["status"], { words: string; tone: Tone }> = {
  awaiting: { words: "Waiting", tone: "waiting" },
  approved: { words: "Approved", tone: "done" },
  "changes-requested": { words: "Modify requested", tone: "late" },
};

export function ProjectDesigns({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;
  const stages = firm.designStages(projectId);

  if (stages.every((s) => s.items.length === 0)) {
    const designs = firm.designs.filter((d) => d.projectId === projectId);
    return (
      <Panel title="Designs" strong>
        <GlassTable<DesignView>
          caption="Designs"
          rows={designs}
          rowKey={(d) => d.designId}
          empty="No designs sent yet."
          chip={(d) => <StatusChip tone={OLD_WORDS[d.status].tone}>{OLD_WORDS[d.status].words}</StatusChip>}
          columns={[
            { label: "Design", cell: (d) => d.title },
            { label: "By", cell: (d) => <span className="font-normal">{d.by}</span> },
            { label: "Version", width: "w-24", cell: (d) => <span className="figure font-normal">v{d.version}</span> },
            { label: "Sent", width: "w-28", cell: (d) => <span className="font-normal">{dayWords(d.sentAt)}</span> },
            {
              label: "Status",
              phone: false,
              width: "w-44",
              cell: (d) => <StatusChip tone={OLD_WORDS[d.status].tone}>{OLD_WORDS[d.status].words}</StatusChip>,
            },
          ]}
        />
      </Panel>
    );
  }

  return (
    <div className="grid gap-5">
      {stages.map((s, i) => {
        const chip = stageChip(s);
        return (
          <Panel
            key={s.stage}
            title={`${i + 1}. ${s.label}`}
            aside={<StatusChip tone={chip.tone}>{chip.words}</StatusChip>}
            strong
          >
            {s.items.length === 0 ? (
              <Empty>Nothing uploaded yet.</Empty>
            ) : (
              <GlassTable<DesignItemView>
                caption={s.label}
                rows={s.items}
                rowKey={(item) => item.id}
                wide="lg"
                chip={(item) => <StatusChip tone={item.tone}>{item.statusWords}</StatusChip>}
                columns={[
                  { label: "Item", cell: (item) => <ItemName item={item} /> },
                  { label: "By", cell: (item) => <span className="font-normal">{item.preparedByName}</span> },
                  {
                    label: "Version",
                    width: "w-20",
                    cell: (item) => <span className="figure font-normal">{item.version ? `v${item.version}` : "–"}</span>,
                  },
                  {
                    label: "Viewed",
                    width: "w-36",
                    cell: (item) =>
                      item.viewedAt ? (
                        <span className="font-normal">{formatStampShort(item.viewedAt)}</span>
                      ) : item.version ? (
                        <StatusChip tone="waiting">Not viewed</StatusChip>
                      ) : (
                        <span className="font-normal text-ink-soft">–</span>
                      ),
                  },
                  {
                    label: "Status",
                    width: "w-44",
                    phone: false,
                    cell: (item) => <StatusChip tone={item.tone}>{item.statusWords}</StatusChip>,
                  },
                  {
                    label: "Decided",
                    width: "w-36",
                    cell: (item) =>
                      item.decidedAt ? (
                        <span className="font-normal">{formatStampShort(item.decidedAt)}</span>
                      ) : (
                        <span className="font-normal text-ink-soft">–</span>
                      ),
                  },
                ]}
              />
            )}
          </Panel>
        );
      })}
    </div>
  );
}

function ItemName({ item }: { item: DesignItemView }) {
  return (
    <span className="grid min-w-0 gap-0.5">
      <span>{item.title}</span>
      <span className="text-13 font-normal text-ink-soft">{item.sheet}</span>
      {item.status === "modify" && item.comment && (
        <span className="max-w-72 text-13 font-normal italic text-ink-soft">&ldquo;{item.comment}&rdquo;</span>
      )}
    </span>
  );
}
