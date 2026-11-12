"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { FloorPlan } from "@/components/floor-plan";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { DropZone } from "@/components/register/drop-zone";
import { EmailPreview } from "@/components/register/email-preview";
import { Field } from "@/components/register/field";
import { projectsFor } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { useDemo, useFirm, useProjection } from "@/lib/demo-store";
import { ageWords, daysSince, type Firm } from "@/lib/firm";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { datePart, formatShortDate, formatStamp } from "@/lib/format";
import { useArchitect } from "./common";
import { shelfWords, VersionShelf, type ShelfVersion } from "./version-shelf";

// The studio's designs: one row per sheet, holding its version shelf. Approved versions
// carry the client's seal, a version she asked to change has her words under it, and the
// one waiting for her has a peg. A new version is uploaded inline and sent to the client
// after the five-second pause; it waits for her decision and is posted in Updates.

type Version = ShelfVersion & {
  uploadedOn: string;
  uploadedBy: string;
  note: string;
  decidedOn?: string;
  comment?: string;
};

/** A sheet as the studio sees it, on any project. */
type Sheet = {
  projectId: ProjectId;
  designId: string;
  title: string;
  sheet: string;
  kind: "Drawing" | "Specification";
  drawing: "plan" | "elevation" | "spec";
  neededBefore?: string;
  versions: Version[];
  /** When the client approved the latest version. */
  approvedAt?: string;
};

function slug(text: string): string {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join("-");
}

/** Every sheet on the viewer's projects: Iyer's in full, others as far as the portal holds them. */
function useSheets(): Sheet[] {
  const firm = useFirm();
  const demo = useDemo();
  const projection = useProjection();
  const me = useArchitect();
  const mine = projectsFor("architect", me.id, firm).map((p) => p.id);
  const sheets: Sheet[] = [];

  if (mine.includes("iyer")) {
    for (const d of projection.designs) {
      const last = d.design.versions.length - 1;
      sheets.push({
        projectId: "iyer",
        designId: d.design.id,
        title: d.design.title,
        sheet: d.design.sheet,
        kind: d.design.kind,
        drawing: d.design.drawing,
        neededBefore: d.design.neededBefore,
        versions: d.design.versions.map((v, i) => ({
          version: v.version,
          status: i === last ? d.status : v.status === "awaiting" ? "superseded" : v.status,
          uploadedOn: v.uploadedOn,
          uploadedBy: v.uploadedBy,
          note: v.note,
          decidedOn: i === last ? d.latest.decidedOn : v.decidedOn,
          comment: i === last ? d.latest.comment : v.comment,
        })),
        approvedAt: d.status === "approved" ? projection.approvedAt[d.design.anchor] : undefined,
      });
    }
  }
  for (const d of firm.designs) {
    if (d.projectId === "iyer" || !mine.includes(d.projectId)) continue;
    sheets.push({
      projectId: d.projectId,
      designId: d.designId,
      title: d.title,
      sheet: "",
      kind: "Drawing",
      drawing: "plan",
      versions: [{ version: d.version, status: d.status, uploadedOn: datePart(d.sentAt), uploadedBy: d.by, note: "" }],
    });
  }
  // New sheets started in this tab: every version waits for the client.
  for (const e of demo.events) {
    if (e.kind !== "design.uploaded" || !mine.includes(e.projectId)) continue;
    if (sheets.some((s) => s.projectId === e.projectId && s.designId === e.designId && !s.designId.startsWith("new-"))) continue;
    let sheet = sheets.find((s) => s.projectId === e.projectId && s.designId === e.designId);
    if (!sheet) {
      const parts = /^new-(.+?)~(.*)$/.exec(e.designId);
      const title = parts?.[1] ?? e.designId;
      const code = parts?.[2] ?? "";
      sheet = {
        projectId: e.projectId,
        designId: e.designId,
        title: title.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()),
        sheet: code.toUpperCase(),
        kind: e.files.length > 1 ? "Specification" : "Drawing",
        drawing: e.files.length > 1 ? "spec" : "plan",
        versions: [],
      };
      sheets.push(sheet);
    }
    for (const v of sheet.versions) if (v.status === "awaiting") v.status = "superseded";
    sheet.versions.push({
      version: e.version,
      status: "awaiting",
      uploadedOn: datePart(e.at),
      uploadedBy: firm.person(e.by)?.name ?? e.by,
      note: e.note,
    });
  }
  return sheets.filter((s) => me.scope === "all" || s.projectId === me.scope);
}

function clientOf(projectId: ProjectId, firm: Firm): { first: string; full: string; email: string } {
  const p = firm.project(projectId);
  if (projectId === "iyer" || projectId === "iyer-cottage") return { first: "Meera", full: "Meera Iyer", email: p?.clientEmail ?? "" };
  return { first: "the client", full: p?.clients.join(" and ") ?? "the client", email: p?.clientEmail ?? "" };
}

// ---- The upload panel ----

function UploadPanel({
  sheets,
  initial,
  by,
  onDone,
}: {
  sheets: Sheet[];
  initial: string | null;
  by: PersonId;
  onDone: () => void;
}) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const me = useArchitect();
  const ids = useId();
  const projects = projectsFor("architect", me.id, firm).filter((p) => me.scope === "all" || p.id === me.scope);
  const keyOf = (s: Sheet) => `${s.projectId}:${s.designId}`;

  const [choice, setChoice] = useState<string>(initial ?? (sheets[0] ? keyOf(sheets[0]) : "new"));
  const chosen = sheets.find((s) => keyOf(s) === choice) ?? null;
  const [newProject, setNewProject] = useState<ProjectId>(projects[0]?.id ?? "iyer");
  const [newTitle, setNewTitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [packageChoice, setPackageChoice] = useState<boolean | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [changed, setChanged] = useState("");
  const [neededBefore, setNeededBefore] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const projectId = chosen ? chosen.projectId : newProject;
  const version = chosen ? Math.max(...chosen.versions.map((v) => v.version)) + 1 : 1;
  const isPackage = packageChoice ?? chosen?.kind === "Specification";
  const code = chosen ? chosen.sheet : newCode.trim().toUpperCase();
  const title = chosen ? chosen.title : newTitle.trim();
  const client = clientOf(projectId, firm);
  const stem = code || "Sheet";
  const samples = isPackage
    ? [`${stem} v${version} specification sheet.pdf`, `${stem} v${version} data sheet.pdf`, `${stem} v${version} finishes.png`]
    : [`${stem} v${version}.pdf`, `${stem} v${version} page 2.png`];

  const send = (origin: HTMLElement) => {
    // Set aside, not disabled, while a pause runs, so the button keeps focus for Cancel.
    if (pause.pending !== null) return;
    const next: Record<string, string> = {};
    if (!chosen && newTitle.trim().length < 3) next.title = "Give the sheet a name.";
    if (files.length === 0) next.files = "Choose the file you are sending.";
    if (changed.trim().length < 5) next.changed = `Say what changed, in words ${client.first === "Meera" ? "Meera" : "the client"} will follow.`;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const designId = chosen ? chosen.designId : `new-${slug(newTitle)}~${slug(newCode)}`;
    const note = changed.trim();
    const before = neededBefore.trim() || undefined;
    const sent = [...files];
    const { record } = demo;
    pause.start({
      what: `${title}, version ${version}, to ${client.full}`,
      origin,
      commit: () => {
        record({ kind: "design.uploaded", projectId, designId, version, note, neededBefore: before, files: sent, by });
        setFiles([]);
        setChanged("");
        setNeededBefore("");
        onDone();
      },
    });
  };

  return (
    <div className="grid max-w-[720px] gap-6 border-l-2 border-rosewood py-2 pl-4">
      <ChipGroup label="Which sheet">
        {sheets.map((s) => (
          <Chip
            key={keyOf(s)}
            pressed={choice === keyOf(s)}
            onClick={() => setChoice(keyOf(s))}
            detail={choice === keyOf(s) ? `This will be version ${Math.max(...s.versions.map((v) => v.version)) + 1}` : undefined}
          >
            {s.title}
          </Chip>
        ))}
        <Chip pressed={choice === "new"} onClick={() => setChoice("new")}>
          A new sheet
        </Chip>
      </ChipGroup>

      {!chosen && (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.length > 1 && (
            <div className="sm:col-span-2">
              <ChipGroup label="Project">
                {projects.map((p) => (
                  <Chip key={p.id} pressed={newProject === p.id} onClick={() => setNewProject(p.id)}>
                    {p.name}
                  </Chip>
                ))}
              </ChipGroup>
            </div>
          )}
          <Field label="Sheet name" error={errors.title} htmlFor={`${ids}-title`}>
            <input id={`${ids}-title`} className={field} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </Field>
          <Field label="Sheet number" hint="For example A-104." htmlFor={`${ids}-code`}>
            <input id={`${ids}-code`} className={field} value={newCode} onChange={(e) => setNewCode(e.target.value)} />
          </Field>
        </div>
      )}

      <ChipGroup label="What you are sending">
        <Chip pressed={!isPackage} onClick={() => setPackageChoice(false)}>
          One drawing
        </Chip>
        <Chip pressed={isPackage} onClick={() => setPackageChoice(true)} detail="Several files, approved together">
          This is a specification package
        </Chip>
      </ChipGroup>

      <div className="grid gap-1.5">
        <DropZone
          label={isPackage ? "The files in the package" : "The drawing"}
          samples={samples}
          accept="pdf-or-images"
          chosen={files}
          onChoose={(next) => {
            setFiles(next);
            if (errors.files) setErrors({ ...errors, files: "" });
          }}
          multiple={isPackage}
        />
        {errors.files && (
          <p className="text-15 font-semibold text-brick" role="alert">
            {errors.files}
          </p>
        )}
      </div>

      <Field
        label="What changed"
        hint={`In ${client.first === "Meera" ? "Meera's" : "the client's"} words: what she will see is different.`}
        error={errors.changed}
        htmlFor={`${ids}-changed`}
      >
        <textarea
          id={`${ids}-changed`}
          className={`${field} min-h-24 py-2`}
          value={changed}
          onChange={(e) => setChanged(e.target.value)}
        />
      </Field>

      <Field label="Needed before (optional)" hint="A building event, such as before the second floor walls rise." htmlFor={`${ids}-before`}>
        <input id={`${ids}-before`} className={field} value={neededBefore} onChange={(e) => setNeededBefore(e.target.value)} />
      </Field>

      <EmailPreview
        to={`${client.full}${client.email ? `, ${client.email}` : ""}`}
        subject={`${title || "A new sheet"}, version ${version}, is ready for you`}
        body={[
          `${title || "A new sheet"}, version ${version}, is in your portal.`,
          changed.trim() || "What changed will be written here.",
          "Open Designs to approve it or ask for changes. It is also posted in Updates.",
        ]}
      />

      <div>
        <button
          type="button"
          className="btn btn-primary"
          aria-disabled={pause.pending !== null}
          onClick={(event) => send(event.currentTarget)}
        >
          {client.first === "Meera" ? "Send to Meera" : "Send to the client"}
        </button>
      </div>
    </div>
  );
}

// ---- Compare ----

function Compare({ sheet }: { sheet: Sheet }) {
  const [was, now] = sheet.versions.slice(-2);
  const caption = (v: Version) =>
    `Version ${v.version}, ${
      { approved: "approved", awaiting: "waiting", "changes-requested": "changes asked", superseded: "replaced" }[v.status]
    }`;
  // The two versions stand one above the other, each drawing at a width its room names and
  // dimensions can be read at: never over 720 px, and in a column under 544 px it is drawn
  // at 640 px and scrolls sideways. Where the panel is wide, the caption and note stand
  // beside the drawing.
  const beside =
    sheet.drawing === "plan" ? "@min-[56rem]:grid-cols-[minmax(0,45rem)_minmax(0,1fr)] @min-[56rem]:grid-rows-[auto_auto_1fr] @min-[56rem]:gap-x-6" : "";
  const side = (v: Version, changedFrom?: number) => (
    <figure className={`grid content-start gap-2 ${beside}`}>
      <figcaption className={`text-15 font-semibold ${sheet.drawing === "plan" ? "@min-[56rem]:col-start-2 @min-[56rem]:row-start-1" : ""}`}>
        {caption(v)}
      </figcaption>
      {sheet.drawing === "plan" ? (
        <div className="grid max-w-[45rem] gap-1 @min-[56rem]:col-start-1 @min-[56rem]:row-span-3 @min-[56rem]:row-start-1">
          <div
            className="overflow-x-auto border border-sand bg-paper"
            tabIndex={0}
            role="group"
            aria-label={`${caption(v)}, the drawing`}
          >
            <div className="min-w-[40rem] @min-[34rem]:min-w-0">
              <FloorPlan designId={sheet.designId} title={sheet.title} sheet={sheet.sheet} version={v.version} changedFrom={changedFrom} />
            </div>
          </div>
          <p className="lettering text-ink-soft @min-[34rem]:hidden">Scroll sideways for the whole sheet.</p>
        </div>
      ) : (
        <p className="max-w-[68ch] bg-sand-2 px-3 py-2 text-15">{v.note || "No notes were sent with this version."}</p>
      )}
      {sheet.drawing === "plan" && v.note && (
        <p className="max-w-[68ch] text-15 text-ink-soft @min-[56rem]:col-start-2 @min-[56rem]:row-start-2">{v.note}</p>
      )}
    </figure>
  );
  return (
    <div className="@container pt-2">
      <div className="grid gap-8">
        {side(was)}
        {side(now, was.version)}
      </div>
    </div>
  );
}

// ---- The page ----

export function ArchitectDesigns() {
  const firm = useFirm();
  const pause = usePause();
  const me = useArchitect();
  const sheets = useSheets();
  // Which panel is open: the upload at the top, an upload in a row, or a comparison.
  const [panel, setPanel] = useState<{ kind: "upload" | "compare"; at: string } | null>(null);

  const scoped = me.scope === "all" ? null : firm.project(me.scope);
  const headline = scoped ? `${scoped.name} designs` : "Designs on your projects";

  // "2 are with Meera." counted per client.
  const waitingBy = new Map<ProjectId, number>();
  for (const s of sheets) {
    if (s.versions[s.versions.length - 1]?.status === "awaiting") waitingBy.set(s.projectId, (waitingBy.get(s.projectId) ?? 0) + 1);
  }
  const parts = [...waitingBy.entries()].map(([id, n]) => ({ n, who: id === "iyer" || id === "iyer-cottage" ? "Meera" : `the ${firm.project(id)?.name ?? ""} clients` }));
  const state =
    parts.length === 0
      ? "None are waiting on a client."
      : `${parts[0].n} ${parts[0].n === 1 ? "is" : "are"} with ${parts[0].who}${parts
          .slice(1)
          .map((p) => `, ${p.n} with ${p.who}`)
          .join("")}.`;

  const close = (rowId: string | null) => {
    if (pause.pending !== null && pause.pending.rowId === rowId) pause.cancel();
    setPanel(null);
  };

  const row = (s: Sheet) => {
    const rowId = `design:${s.projectId}:${s.designId}`;
    const latest = s.versions[s.versions.length - 1];
    const client = clientOf(s.projectId, firm);
    const p = firm.project(s.projectId);
    const open = panel?.at === rowId ? panel.kind : null;
    const canCompare = s.versions.length >= 2;

    let margin = "Approved";
    let marginSub: string | undefined;
    let sentence: ReactNode;
    if (latest.status === "awaiting") {
      margin = `With ${client.first === "Meera" ? "Meera" : "client"}`;
      marginSub = ageWords(daysSince(latest.uploadedOn));
      sentence = `Version ${latest.version} sent on ${formatShortDate(latest.uploadedOn)} by ${latest.uploadedBy}.${
        s.neededBefore ? ` Needed ${s.neededBefore}.` : ""
      }`;
    } else if (latest.status === "changes-requested") {
      margin = "Yours";
      sentence = `${client.first === "Meera" ? "Meera" : "The client"} asked for changes${
        latest.decidedOn ? ` on ${formatShortDate(latest.decidedOn)}` : ""
      }. Upload the next version.`;
    } else {
      sentence = s.approvedAt
        ? `Approved by ${client.full} on ${formatStamp(s.approvedAt)}.`
        : `Approved by ${client.full}${latest.decidedOn ? ` on ${formatShortDate(latest.decidedOn)}` : ""}.`;
    }
    const asked = s.versions.filter((v) => v.status === "changes-requested" && v.comment);

    const toggle = (kind: "upload" | "compare") => {
      if (open) close(rowId);
      else setPanel({ kind, at: rowId });
    };

    return (
      <RegisterRow
        key={rowId}
        id={rowId}
        margin={margin}
        marginSub={marginSub}
        client={latest.status === "awaiting"}
        title={
          <>
            {s.title}
            {s.sheet ? `, ${s.sheet}` : ""}
            {me.scope === "all" && p && (
              <>
                {", "}
                <Link href={`/staff/projects/${p.id}`} className="link -my-3 inline-flex min-h-11 items-center font-normal">
                  {p.name}
                </Link>
              </>
            )}
          </>
        }
        sentence={
          <>
            {sentence}
            {asked.map((v) => (
              <span key={v.version} className="mt-2 block bg-sand-2 px-3 py-2 text-ink">
                <span className="lettering block text-ink-soft">Version {v.version}, {client.first === "Meera" ? "Meera" : "the client"}</span>
                <q>{v.comment}</q>
              </span>
            ))}
            <span className="sr-only"> {shelfWords(s.versions, client.first === "Meera" ? "Meera" : "the client")}</span>
          </>
        }
        instrument={<VersionShelf versions={s.versions} />}
        stamps={firm.stampsFor(rowId)}
        action={
          <button
            type="button"
            className="btn btn-quiet"
            aria-expanded={open !== null}
            onClick={() => toggle(canCompare ? "compare" : "upload")}
          >
            {open ? "Close" : canCompare ? "Compare the latest two" : "Upload a new version"}
          </button>
        }
      >
        {open === "compare" && <Compare sheet={s} />}
        {open === "upload" && (
          <div className="pt-2">
            <UploadPanel
              sheets={sheets}
              initial={`${s.projectId}:${s.designId}`}
              by={me.id}
              onDone={() => setPanel(null)}
            />
          </div>
        )}
      </RegisterRow>
    );
  };

  const topOpen = panel?.kind === "upload" && panel.at === "top";
  // A comparison open in a row gives way to the upload at the top.
  const openUpload = () => {
    if (panel) close(panel.at);
    setPanel({ kind: "upload", at: "top" });
  };

  return (
    <>
      <StaffBoard
        place="Designs"
        headline={headline}
        state={state}
        primary={panel?.kind !== "upload" ? { label: "Upload a new version", onClick: openUpload } : undefined}
      />
      {topOpen && (
        <section aria-label="Upload a new version" className="mt-8 grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="register-title flex-1">Upload a new version</h2>
            <button type="button" className="btn btn-quiet" onClick={() => close(null)}>
              Close
            </button>
          </div>
          <UploadPanel sheets={sheets} initial={null} by={me.id} onDone={() => setPanel(null)} />
        </section>
      )}
      <div className="mt-8">
        <Register
          title="Sheets and their versions"
          empty={scoped ? `No drawings for ${scoped.name} are in the portal yet.` : "No drawings are in the portal yet."}
          limit={8}
        >
          {sheets.map(row)}
        </Register>
      </div>
    </>
  );
}
