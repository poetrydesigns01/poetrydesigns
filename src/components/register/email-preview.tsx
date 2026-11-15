/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
// What an action would email, shown as a preview only. The demo sends no email, and the
// preview says so before anything else.

export function EmailPreview({
  to,
  subject,
  body,
  label = "See the email",
}: {
  to: string;
  subject: string;
  /** One paragraph per string. */
  body: string[];
  label?: string;
}) {
  return (
    <details className="email-preview">
      <summary className="lettering inline-flex min-h-11 cursor-pointer items-center underline decoration-1 underline-offset-4">
        {label}
      </summary>
      <div className="glass-inner mt-1 max-w-[68ch] px-4 py-3 text-ink">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-15">
          <dt className="text-ink-soft">To</dt>
          <dd className="min-w-0 break-words">{to}</dd>
          <dt className="text-ink-soft">Subject</dt>
          <dd className="min-w-0 break-words font-semibold">{subject}</dd>
        </dl>
        <div className="mt-3 grid gap-2 border-t border-ink/10 pt-3 text-15">
          {body.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </details>
  );
}
