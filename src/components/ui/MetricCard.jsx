import { Sparkline } from "./Sparkline.jsx";

export function MetricCard({ label, value, unit, delta, color, spark }) {
  return (
    <div style={{ background:"#070d1a", border:"1px solid #0f172a", borderRadius:6, padding:"10px 12px", display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ fontSize:9, color:"#334155", letterSpacing:"0.1em" }}>{label}</div>
      <div style={{ display:"flex", alignItems:"baseline", gap:5 }}>
        <span style={{ fontSize:20, fontWeight:700, color, lineHeight:1 }}>{value}</span>
        {unit && <span style={{ fontSize:10, color:"#334155" }}>{unit}</span>}
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {delta != null && (
          <span style={{ fontSize:10, color: delta >= 0 ? "#34d399" : "#f87171" }}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
        {spark && <Sparkline values={spark} color={color} />}
      </div>
    </div>
  );
}
