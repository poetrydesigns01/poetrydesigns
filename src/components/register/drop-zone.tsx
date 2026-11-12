"use client";

import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

// Where a file would be dropped. Nothing is uploaded: "Choose a file" lists sample files
// as chips and one tap picks one, so a flow that needs a PDF or a photo can be walked through.

const KIND_WORDS = {
  pdf: "A PDF",
  images: "Photos",
  "pdf-or-images": "A PDF or photos",
} as const;

export function DropZone({
  label,
  samples,
  accept,
  chosen,
  onChoose,
  multiple = false,
}: {
  label: string;
  samples: string[];
  accept: "pdf" | "images" | "pdf-or-images";
  chosen: string[];
  onChoose: (files: string[]) => void;
  multiple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const labelId = useId();

  const pick = (file: string) => {
    if (multiple) {
      onChoose(chosen.includes(file) ? chosen.filter((f) => f !== file) : [...chosen, file]);
    } else {
      onChoose(chosen.includes(file) ? [] : [file]);
      // The list closes under the chip that was pressed, so focus goes back to its toggle.
      flushSync(() => setOpen(false));
      toggleRef.current?.focus();
    }
  };

  return (
    <div role="group" aria-labelledby={labelId} className="border-2 border-dashed border-chalk bg-paper px-4 py-3">
      <p id={labelId} className="text-15 font-semibold">
        {label}
      </p>
      <p className="text-15 text-ink-soft">
        {chosen.length > 0 ? `Chosen: ${chosen.join(", ")}.` : `${KIND_WORDS[accept]}. Nothing chosen yet.`}
      </p>
      <button
        ref={toggleRef}
        type="button"
        className="btn btn-quiet mt-2"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        {chosen.length > 0 && !multiple ? "Choose another file" : "Choose a file"}
      </button>
      <div id={listId} hidden={!open} className="mt-3">
        <ul className="flex flex-wrap gap-2">
          {samples.map((file) => (
            <li key={file}>
              <button
                type="button"
                className="chip"
                aria-pressed={chosen.includes(file)}
                onClick={() => pick(file)}
              >
                {file}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="lettering mt-2 text-ink-soft">Sample files. This demo uploads nothing.</p>
    </div>
  );
}
