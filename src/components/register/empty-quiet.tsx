// What a register says when nothing is in it: one plain sentence, no picture.

export function EmptyQuiet({ children = "Nothing needs you today." }: { children?: string }) {
  return <p className="py-4 text-17 text-ink-soft">{children}</p>;
}
