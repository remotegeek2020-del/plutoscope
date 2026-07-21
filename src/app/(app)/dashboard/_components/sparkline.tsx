// Minimal dependency-free trend line for the blended visibility index (0–100 domain).
export function Sparkline({
  values,
  width = 140,
  height = 36,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) {
    return <div className="text-xs text-slate-400">not enough data</div>;
  }

  const stepX = width / (values.length - 1);
  const points = values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (Math.min(100, Math.max(0, value)) / 100) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="text-instrument dark:text-pluto"
      role="img"
      aria-label="Blended index trend"
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}
