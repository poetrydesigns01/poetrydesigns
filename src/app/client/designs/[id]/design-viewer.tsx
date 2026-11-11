"use client";

import Link from "next/link";
import { useState } from "react";
import { FloorPlan } from "@/components/floor-plan";
import { HouseElevation } from "@/components/house-elevation";
import { PageBand, Status } from "@/components/page-band";
import { client, TODAY, type Design } from "@/lib/demo-data";
import { useDemo, useLatestVersion } from "@/lib/demo-store";
import { formatDate } from "@/lib/format";

const KITCHEN_SPEC = [
  ["Counter", "20 mm black galaxy granite with a half-round edge, 600 mm deep"],
  ["Sink", "Stainless steel double bowl with drain board, 1,150 × 500 mm"],
  ["Hob", "Four-burner built-in glass hob with auto ignition"],
  ["Chimney", "900 mm wall-mounted, filterless, 1,200 m³ per hour"],
  ["Cabinets", "Marine plywood carcass with matt laminate shutters and soft-close hinges"],
  ["Wall tiles", "300 × 600 mm glazed ceramic up to 600 mm above the counter"],
  ["Water points", "Hot and cold at the sink, one point for the purifier, one for the dishwasher"],
];

export function DesignViewer({ design }: { design: Design }) {
  const latest = useLatestVersion(design.id)!;
  const { decideDesign } = useDemo();
  const [mode, setMode] = useState<"idle" | "approve" | "changes">("idle");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const watermark = `${client.name}, ${formatDate(TODAY)}, view only`;
  const earlier = design.versions.slice(0, -1).reverse();

  function sendChanges() {
    if (comment.trim().length < 10) {
      setError("Describe what you would like changed, so the architect can act on it.");
      return;
    }
    decideDesign(design.id, "changes-requested", comment.trim());
    setMode("idle");
  }

  return (
    <>
      <PageBand title={design.title} lede={`${design.kind}, sheet ${design.sheet}, version ${latest.version}. ${latest.note}`}>
        <Link href="/client/designs" className="link mt-5 inline-block text-lime/80">
          Back to all designs
        </Link>
      </PageBand>

      <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* The drawing. It is shown, never handed over. */}
        <div>
          <div
            className="relative select-none overflow-hidden border border-ink/25 bg-paper"
            onContextMenu={(event) => event.preventDefault()}
            onDragStart={(event) => event.preventDefault()}
          >
            {design.drawing === "plan" && (
              <FloorPlan designId={design.id} title={design.title} sheet={design.sheet} version={latest.version} />
            )}
            {design.drawing === "elevation" && (
              <div className="px-4 py-8 sm:px-8">
                <HouseElevation builtUpTo={4} animate={false} tone="light" className="h-auto w-full" />
              </div>
            )}
            {design.drawing === "spec" && (
              <div className="px-5 py-6 sm:px-10 sm:py-10">
                <p className="display text-[1.375rem]">{design.title}</p>
                <p className="text-ink-soft">Iyer Residence, sheet {design.sheet}</p>
                <dl className="mt-6 border-t border-ink">
                  {KITCHEN_SPEC.map(([item, spec]) => (
                    <div key={item} className="grid gap-x-6 border-b border-sand py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                      <dt className="font-semibold">{item}</dt>
                      <dd>{spec}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-col justify-center gap-14 opacity-[0.13]">
                {Array.from({ length: 12 }, (_, row) => (
                  <p key={row} className={`whitespace-nowrap text-[1.125rem] font-semibold ${row % 2 ? "pl-40" : ""}`}>
                    {Array.from({ length: 6 }, () => watermark).join("      ")}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-ink-soft">
            This opens here only and cannot be downloaded. Your name and today&rsquo;s date are marked across it.
          </p>
        </div>

        <aside>
          <h2 className="display display-md">Your decision</h2>

          {latest.status === "awaiting" && mode === "idle" && (
            <div className="mt-4">
              <p className="text-ink-soft">
                {latest.uploadedBy} uploaded version {latest.version} on {formatDate(latest.uploadedOn)}.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" className="btn btn-primary" onClick={() => setMode("approve")}>
                  Approve this version
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setMode("changes")}>
                  Ask for changes
                </button>
              </div>
            </div>
          )}

          {latest.status === "awaiting" && mode === "approve" && (
            <div className="reveal mt-4 bg-sand-2 p-5">
              <p className="text-[1.125rem] font-semibold">
                Approve {design.title.toLowerCase()}, version {latest.version}?
              </p>
              <p className="mt-2 text-ink-soft">
                This is recorded with your name, the date and the time. It cannot be edited or removed afterwards.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    decideDesign(design.id, "approved");
                    setMode("idle");
                  }}
                >
                  Confirm approval
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setMode("idle")}>
                  Go back
                </button>
              </div>
            </div>
          )}

          {latest.status === "awaiting" && mode === "changes" && (
            <div className="reveal mt-4">
              <label htmlFor="change-comment" className="font-semibold">
                What would you like changed?
              </label>
              <textarea
                id="change-comment"
                rows={5}
                value={comment}
                onChange={(event) => {
                  setComment(event.target.value);
                  setError("");
                }}
                aria-describedby={error ? "change-error" : undefined}
                className="mt-2 block w-full rounded-[3px] border border-ink/40 bg-paper px-3.5 py-3"
              />
              {error && (
                <p id="change-error" className="mt-2 font-semibold text-brick">
                  {error}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" className="btn btn-primary" onClick={sendChanges}>
                  Send request
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setMode("idle")}>
                  Go back
                </button>
              </div>
            </div>
          )}

          {latest.status !== "awaiting" && (
            <div className="reveal mt-4 bg-sand-2 p-5">
              <p className="text-[1.125rem]">
                {latest.status === "approved" ? <Status tone="done">Approved</Status> : <Status tone="alert">Changes requested</Status>} on{" "}
                {formatDate(latest.decidedOn!)} by {client.name}
              </p>
              {latest.comment && <p className="mt-2">&ldquo;{latest.comment}&rdquo;</p>}
              <p className="mt-2 text-ink-soft">
                {latest.status === "approved"
                  ? "Your architect and the project team have been told."
                  : "Your architect has been told and will upload a new version."}
              </p>
            </div>
          )}

          {earlier.length > 0 && (
            <div className="mt-10">
              <h3 className="font-semibold">Earlier versions</h3>
              <ol className="mt-2 border-t border-sand">
                {earlier.map((version) => (
                  <li key={version.version} className="border-b border-sand py-4">
                    <p>
                      Version {version.version}, uploaded on {formatDate(version.uploadedOn)}
                    </p>
                    <p>
                      {version.status === "approved" ? <Status tone="done">Approved</Status> : <Status tone="alert">Changes requested</Status>}
                      <span className="text-ink-soft"> on {formatDate(version.decidedOn!)}</span>
                    </p>
                    {version.comment && <p className="mt-1 text-ink-soft">&ldquo;{version.comment}&rdquo;</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
