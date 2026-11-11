"use client";

import { useState } from "react";
import { catalogue, milestones, staffProjects } from "@/lib/demo-data";
import { formatShortDate } from "@/lib/format";

type Line = { id: number; material: string; grade: string; quantity: number; unit: string; outsideEstimate: boolean };

const field = "mt-1.5 block min-h-12 w-full rounded-[3px] border border-ink/40 bg-paper px-3 text-[1.0625rem]";
const constructionMilestones = milestones.filter((m) => m.id > 0);

export default function MaterialRequestPage() {
  const [projectId, setProjectId] = useState(staffProjects[0].id);
  const [milestoneId, setMilestoneId] = useState(4);
  const [material, setMaterial] = useState(catalogue[0].material);
  const [grade, setGrade] = useState(catalogue[0].grades[1]);
  const [quantity, setQuantity] = useState("");
  const [outsideEstimate, setOutsideEstimate] = useState(false);
  const [neededBy, setNeededBy] = useState("2026-11-14");
  const [lines, setLines] = useState<Line[]>([
    { id: 1, material: "Steel (TMT bars)", grade: "12 mm", quantity: 850, unit: "kg", outsideEstimate: false },
    { id: 2, material: "Cement", grade: "OPC 53 grade", quantity: 120, unit: "bags", outsideEstimate: false },
  ]);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const item = catalogue.find((c) => c.material === material)!;
  const project = staffProjects.find((p) => p.id === projectId)!;

  function addLine() {
    const amount = Number(quantity);
    if (!quantity || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }
    setLines((current) => [...current, { id: Date.now(), material, grade, quantity: amount, unit: item.unit, outsideEstimate }]);
    setQuantity("");
    setOutsideEstimate(false);
    setError("");
  }

  if (sent) {
    return (
      <div role="status">
        <h1 className="display display-md">Request MR-2026-0142 sent</h1>
        <p className="mt-3 text-ink-soft">
          Procurement has been emailed {lines.length} {lines.length === 1 ? "item" : "items"} for {project.name}, needed
          by {formatShortDate(neededBy)}. The requirement report is attached to the project.
        </p>
        <ul className="mt-5 border-t border-ink">
          {lines.map((line) => (
            <li key={line.id} className="flex items-baseline justify-between gap-4 border-b border-sand py-3">
              <span>
                {line.material}, {line.grade}
              </span>
              <span className="font-semibold">
                {line.quantity.toLocaleString("en-IN")} {line.unit}
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn btn-primary mt-6 w-full sm:w-auto"
          onClick={() => {
            setLines([]);
            setSent(false);
          }}
        >
          Start another request
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="text-ink-soft">Suresh Gowda, site engineer</p>
      <h1 className="display display-md mt-1">New material request</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block font-semibold">
          Project
          <select className={field} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {staffProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}, {p.place}
              </option>
            ))}
          </select>
        </label>
        <label className="block font-semibold">
          Milestone
          <select className={field} value={milestoneId} onChange={(event) => setMilestoneId(Number(event.target.value))}>
            {constructionMilestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}. {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="mt-6 bg-sand-2 p-4 sm:p-5">
        <legend className="float-left mb-3 w-full text-[1.125rem] font-semibold">Add a material</legend>
        <div className="clear-both grid gap-4 sm:grid-cols-2">
          <label className="block font-semibold">
            Material
            <select
              className={field}
              value={material}
              onChange={(event) => {
                const next = catalogue.find((c) => c.material === event.target.value)!;
                setMaterial(next.material);
                setGrade(next.grades[0]);
              }}
            >
              {catalogue.map((c) => (
                <option key={c.material}>{c.material}</option>
              ))}
            </select>
          </label>
          <label className="block font-semibold">
            Grade or size
            <select className={field} value={grade} onChange={(event) => setGrade(event.target.value)}>
              {item.grades.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="block font-semibold">
            Quantity in {item.unit}
            <input
              className={field}
              type="number"
              inputMode="decimal"
              min="0"
              value={quantity}
              onChange={(event) => {
                setQuantity(event.target.value);
                setError("");
              }}
              aria-describedby={error ? "quantity-error" : undefined}
            />
          </label>
          <label className="flex min-h-12 items-center gap-3 self-end">
            <input
              type="checkbox"
              className="size-5 accent-rosewood"
              checked={outsideEstimate}
              onChange={(event) => setOutsideEstimate(event.target.checked)}
            />
            Not in the agreed estimate
          </label>
        </div>
        {error && (
          <p id="quantity-error" className="mt-3 font-semibold text-brick">
            {error}
          </p>
        )}
        <button type="button" className="btn btn-quiet mt-4 w-full bg-paper sm:w-auto" onClick={addLine}>
          Add to request
        </button>
      </fieldset>

      <h2 className="mt-8 text-[1.125rem] font-semibold">
        In this request ({lines.length} {lines.length === 1 ? "item" : "items"})
      </h2>
      {lines.length === 0 ? (
        <p className="mt-2 text-ink-soft">Nothing added yet. Add a material above to start the request.</p>
      ) : (
        <ul className="mt-2 border-t border-ink">
          {lines.map((line) => (
            <li key={line.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 border-b border-sand py-2.5">
              <span>
                {line.material}, {line.grade}
                {line.outsideEstimate && <span className="block font-semibold text-brass">Not in the agreed estimate</span>}
              </span>
              <span className="font-semibold">
                {line.quantity.toLocaleString("en-IN")} {line.unit}
              </span>
              <button
                type="button"
                className="link min-h-11 px-1 text-ink-soft"
                aria-label={`Remove ${line.material}, ${line.grade}`}
                onClick={() => setLines((current) => current.filter((l) => l.id !== line.id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="mt-6 block font-semibold sm:max-w-xs">
        Needed on site by
        <input className={field} type="date" value={neededBy} onChange={(event) => setNeededBy(event.target.value)} />
      </label>

      <button
        type="button"
        className="btn btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
        disabled={lines.length === 0}
        onClick={() => setSent(true)}
      >
        Send request to procurement
      </button>
    </>
  );
}
