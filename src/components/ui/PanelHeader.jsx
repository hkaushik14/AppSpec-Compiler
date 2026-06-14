export function PanelHeader({ icon, title, right, accent="#38bdf8" }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderBottom:"1px solid #0f172a", flexShrink:0 }}>
      <span style={{ color:accent, fontSize:11 }}>{icon}</span>
      <span style={{ fontSize:10, color:"#475569", letterSpacing:"0.1em", fontWeight:600 }}>{title}</span>
      {right && <div style={{ marginLeft:"auto" }}>{right}</div>}
    </div>
  );
}
