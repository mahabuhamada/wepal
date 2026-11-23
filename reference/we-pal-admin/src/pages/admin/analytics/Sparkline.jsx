// خط صغير للاتجاه اليومي (بلا محاور). القيم أعداد يومية بالترتيب.
export default function Sparkline({ values, label }) {
  if (!values?.length) return null;
  const w = 96;
  const h = 24;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(' ');
  return (
    <svg className="azq-an-spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={label}>
      <polyline points={points} fill="none" stroke="var(--chart-1)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
