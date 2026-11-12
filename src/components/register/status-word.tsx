// Status is always a word from the vocabulary, written once per row. Paid, Approved and
// Delivered are written in kota; Overdue in bold ink. Colour never carries it alone.

const DONE = new Set(["Paid", "Paid in full", "Approved", "Delivered"]);

export function StatusWord({ children, done }: { children: string; done?: boolean }) {
  const isDone = done ?? DONE.has(children);
  const overdue = children.startsWith("Overdue");
  return (
    <span className={isDone ? "font-semibold text-kota" : overdue ? "font-bold text-ink" : "font-semibold text-ink"}>
      {children}
    </span>
  );
}
