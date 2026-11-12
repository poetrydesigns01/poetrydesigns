"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { CatalogueEdit, CatalogueUnit, PersonId } from "@/lib/firm-data";
import { formatStampShort, listWords } from "@/lib/format";
import { catalogueRowsOf, catalogueWords, cleanValue, UNITS, type CatalogueRow } from "./admin-data";
import { StruckNote, TwoStepDelete } from "./two-step-delete";

// The material catalogue the site engineers pick from: each material with its unit and its
// subcategories. The admin adds and renames through the pause, and deletes in two steps
// with a reason. A deleted line stays in the list, struck, with who deleted it and why.

export function CatalogueTab() {
  const firm = useFirm();
  const rows = useMemo(() => catalogueRowsOf(firm.catalogueAll), [firm.catalogueAll]);
  // A deleted material's name is free again.
  const names = rows.filter((r) => !r.struck).map((r) => r.name);

  return (
    <div className="grid gap-8">
      <ul className="sheet-rows ruled">
        {rows.map((row) => (
          <CatalogueItemRow key={row.id} row={row} names={names} />
        ))}
      </ul>
      <AddMaterial names={names} />
    </div>
  );
}

function CatalogueItemRow({ row, names }: { row: CatalogueRow; names: string[] }) {
  const firm = useFirm();
  const [open, setOpen] = useState(false);
  const live = row.subs.filter((s) => !s.struck);
  const byName = (id: PersonId) => firm.person(id)?.name ?? id;

  if (row.struck) {
    return (
      <li className="grid gap-1 py-1">
        <p className="text-17 text-ink-soft">
          <s>
            {row.name}, in {row.unit}
          </s>
        </p>
        <StruckNote by={byName(row.struck.by)} at={formatStampShort(row.struck.at)} reason={row.struck.reason} />
      </li>
    );
  }

  return (
    <li className="grid gap-3 py-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-17 font-semibold">
            {row.name} <span className="font-normal text-ink-soft">in {row.unit}</span>
          </p>
          <p className="text-15 text-ink-soft">
            {live.length > 0 ? listWords(live.map((s) => s.name)) : "No subcategories yet."}
            {row.subs
              .filter((sub) => sub.struck)
              .map((sub, i) => (
                <span key={`${sub.name}-${i}`}>
                  {" "}
                  <s>{sub.name}</s>
                  <span className="sr-only"> (deleted)</span>
                </span>
              ))}
          </p>
        </div>
        <button type="button" className="btn btn-quiet min-h-11" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Close" : "Change"}
        </button>
      </div>
      {open && (
        <div className="grid gap-5 border-l-2 border-sand py-2 pl-4">
          <AddSub row={row} />
          <RenameLine
            label={`Rename ${row.name}`}
            current={row.name}
            taken={names}
            words={(to) => catalogueWords.renameItem(row.name, to)}
            edit={(to) => ({ op: "rename-item", itemId: row.id, to })}
          />
          <ul className="grid gap-4">
            {row.subs.map((sub, i) =>
              sub.struck ? (
                <li key={`${sub.name}-${i}`} className="grid gap-1">
                  <p className="text-17 text-ink-soft">
                    <s>{sub.name}</s>
                  </p>
                  <StruckNote
                    by={byName(sub.struck.by)}
                    at={formatStampShort(sub.struck.at)}
                    reason={sub.struck.reason}
                  />
                </li>
              ) : (
                <li
                  key={`${sub.name}-${i}`}
                  className="flex flex-wrap items-start justify-between gap-3 border-t border-sand pt-3"
                >
                  <p className="inline-flex min-h-11 items-center text-17">{sub.name}</p>
                  <div className="flex flex-wrap items-start gap-3">
                    <RenameLine
                      label={`Rename ${sub.name}`}
                      current={sub.name}
                      taken={live.map((s) => s.name)}
                      words={(to) => catalogueWords.renameSub(sub.name, to, row.name)}
                      edit={(to) => ({ op: "rename-sub", itemId: row.id, from: sub.name, to })}
                      compact
                    />
                    <TwoStepDelete
                      question={`Delete ${row.name} ${sub.name}?`}
                      what={catalogueWords.deleteSub(sub.name, row.name)}
                      target={{ kind: "catalogue-sub", itemId: row.id, sub: sub.name }}
                    />
                  </div>
                </li>
              ),
            )}
          </ul>
          <div className="border-t border-sand pt-3">
            <TwoStepDelete
              label={`Delete ${row.name}`}
              question={`Delete ${row.name} and its subcategories from the catalogue?`}
              what={catalogueWords.deleteItem(row.name)}
              target={{ kind: "catalogue-item", itemId: row.id }}
            />
          </div>
        </div>
      )}
    </li>
  );
}

/** Adds a subcategory to one material. */
function AddSub({ row }: { row: CatalogueRow }) {
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    const sub = cleanValue(name);
    if (!sub) return setError("Write the subcategory, such as 10 inch.");
    if (row.subs.some((s) => !s.struck && s.name.toLowerCase() === sub.toLowerCase()))
      return setError(`${row.name} already has ${sub}.`);
    setError("");
    pause.start({
      what: `Add ${sub} to ${row.name}`,
      commit: () => {
        demo.record({
          kind: "catalogue.changed",
          change: catalogueWords.addSub(sub, row.name),
          edit: { op: "add-sub", itemId: row.id, sub },
          by: "shalini",
        });
        setName("");
      },
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-2">
      <label htmlFor={`${ids}-sub`} className="text-15 font-semibold">
        Add a subcategory to {row.name}
      </label>
      <div className="flex flex-wrap gap-3">
        <input
          id={`${ids}-sub`}
          className={`${field} max-w-xs`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-quiet min-h-12" aria-disabled={pause.pending ? true : undefined}>
          Add
        </button>
      </div>
      {error && (
        <p className="text-15 font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

/** A rename, through the pause. Opens as a quiet button; then a field and "Rename". */
function RenameLine({
  label,
  current,
  taken,
  words,
  edit,
  compact = false,
}: {
  label: string;
  current: string;
  taken: string[];
  words: (to: string) => string;
  /** The same change for the firm to apply. */
  edit: (to: string) => CatalogueEdit;
  compact?: boolean;
}) {
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const [open, setOpen] = useState(!compact);
  const [name, setName] = useState(current);
  const [error, setError] = useState("");

  if (!open)
    return (
      <button type="button" className="btn btn-quiet min-h-11" onClick={() => setOpen(true)}>
        Rename
      </button>
    );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    const to = cleanValue(name);
    if (!to || to === current) return setError("Write the new name.");
    if (taken.some((t) => t !== current && t.toLowerCase() === to.toLowerCase()))
      return setError(`${to} is already in the list.`);
    setError("");
    pause.start({
      what: `Rename ${current} to ${to}`,
      commit: () => demo.record({ kind: "catalogue.changed", change: words(to), edit: edit(to), by: "shalini" }),
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-2">
      <label htmlFor={`${ids}-name`} className="text-15 font-semibold">
        {label}
      </label>
      <div className="flex flex-wrap gap-3">
        <input
          id={`${ids}-name`}
          className={`${field} max-w-xs`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-quiet min-h-12" aria-disabled={pause.pending ? true : undefined}>
          Rename
        </button>
      </div>
      {error && (
        <p className="text-15 font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function AddMaterial({ names }: { names: string[] }) {
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<CatalogueUnit | null>(null);
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    const material = cleanValue(name);
    if (!material) return setError("Write the material, such as Waterproofing compound.");
    if (!unit) return setError("Choose how it is counted.");
    if (names.some((n) => n.toLowerCase() === material.toLowerCase()))
      return setError(`${material} is already in the catalogue.`);
    setError("");
    pause.start({
      what: `Add ${material} to the catalogue`,
      commit: () => {
        demo.record({
          kind: "catalogue.changed",
          change: catalogueWords.addItem(material, unit),
          edit: { op: "add-item", name: material, unit },
          by: "shalini",
        });
        setName("");
        setUnit(null);
      },
    });
  };

  return (
    <form onSubmit={submit} className="grid max-w-[40rem] gap-4" aria-label="Add a material">
      <h3 className="text-17 font-semibold">Add a material</h3>
      <div>
        <label htmlFor={`${ids}-material`} className="block text-15 font-semibold">
          Material
        </label>
        <input
          id={`${ids}-material`}
          className={`${field} mt-1.5`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <ChipGroup label="Counted in">
        {UNITS.map((u) => (
          <Chip key={u} pressed={unit === u} onClick={() => setUnit(u)}>
            {u}
          </Chip>
        ))}
      </ChipGroup>
      {error && (
        <p className="text-15 font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-quiet min-h-12" aria-disabled={pause.pending ? true : undefined}>
          Add the material
        </button>
      </div>
    </form>
  );
}
