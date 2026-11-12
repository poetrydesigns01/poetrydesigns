import type { ReactNode } from "react";

// One labelled field on a staff form. The label is 15 semibold above the control; a hint
// says what is expected; an error says, in words and in brick, what to put right.
// Without `htmlFor` the whole field is one label, so a single input inside it is named by it.
// Give `htmlFor` (the control's id) when the field holds several controls or chips.
// The field fills its grid cell and its control sits at the foot, so a row of fields whose
// labels or hints differ in length keeps its controls on one line.

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  const body = (
    <>
      <span className="block text-15 font-semibold">{label}</span>
      {hint && <span className="mt-0.5 block text-15 text-ink-soft">{hint}</span>}
      <span className="mt-auto block pt-1.5">{children}</span>
      {error && (
        <span className="mt-1.5 block text-15 font-semibold text-brick" role="alert">
          {error}
        </span>
      )}
    </>
  );

  if (htmlFor) {
    return (
      <div className="flex h-full flex-col">
        <label htmlFor={htmlFor} className="block">
          <span className="block text-15 font-semibold">{label}</span>
          {hint && <span className="mt-0.5 block text-15 text-ink-soft">{hint}</span>}
        </label>
        <div className="mt-auto pt-1.5">{children}</div>
        {error && (
          <p className="mt-1.5 text-15 font-semibold text-brick" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
  return <label className="flex h-full flex-col">{body}</label>;
}
