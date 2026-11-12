// A sample value: milestone names, project codes, the letterhead, prices still to be
// confirmed by Poetry. Put it beside the first one on a screen, never twice.

export function SampleTag({ children = "Sample" }: { children?: string }) {
  return <span className="sample-tag">{children}</span>;
}
