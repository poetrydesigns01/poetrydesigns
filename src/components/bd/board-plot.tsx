import { PlotOutline } from "@/components/instruments/plot-outline";

// The plot on a BD board. From 1024 px it takes the board's picture column at full size;
// on a phone the board is the top of the screen, so the plot shrinks to a small mark and
// leaves the headline and the one button room.

export function BoardPlot({ pegs, sealed }: { pegs: 0 | 1 | 2 | 3 | 4; sealed?: boolean }) {
  return (
    <div>
      <div className="lg:hidden">
        <PlotOutline pegs={pegs} sealed={sealed} size={72} tone="dark" />
      </div>
      <div className="hidden lg:block">
        <PlotOutline pegs={pegs} sealed={sealed} size={280} tone="dark" />
      </div>
    </div>
  );
}
