export function Sparkline({ values, color, height=28 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const W = 80, H = height;
  const pts = values.map((v,i) => `${(i/(values.length-1))*W},${H - ((v-min)/range)*H}`).join(" ");
  return (
    <svg width={W} height={H} style={{ display:"block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={(values.length-1)/(values.length-1)*W} cy={H - ((values[values.length-1]-min)/range)*H} r="2.5" fill={color} />
    </svg>
  );
}
