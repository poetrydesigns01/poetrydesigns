// A small rate scale for one material and size: one line, one notch per vendor at its last
// rate, the cheapest notch filled and named. It is decoration; the sentence beside it says
// the cheapest vendor and rate in words.

const W = 240;
const H = 28;
const PAD = 8;
const r1 = (v: number) => Math.round(v * 100) / 100;

export function RateScale({ rates }: { rates: { vendor: string; rate: number }[] }) {
  const values = rates.map((r) => r.rate);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (rate: number) => (max === min ? W / 2 : PAD + ((rate - min) / (max - min)) * (W - PAD * 2));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" aria-hidden="true">
      <path d={`M${PAD} ${H / 2}H${W - PAD}`} style={{ stroke: "var(--color-chalk)", strokeWidth: 1 }} />
      {rates.map((r) => {
        const cheapest = r.rate === min;
        const cx = r1(x(r.rate));
        return (
          <rect
            key={`${r.vendor}-${r.rate}`}
            x={cx - 3}
            y={H / 2 - 7}
            width={6}
            height={14}
            style={{
              fill: cheapest ? "var(--color-rosewood)" : "var(--color-paper)",
              stroke: "var(--color-rosewood)",
              strokeWidth: 1,
            }}
          />
        );
      })}
    </svg>
  );
}
