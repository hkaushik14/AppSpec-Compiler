import { ArchGraph } from "../../../../components/ui/ArchGraph.jsx";
import { ARCH_NODES } from "../../../../constants/compiler.js";

export function ArchTab({ done }) {
  return (
    <div style={{ flex:1, overflow:"auto", padding:16 }}>
      <div style={{ background:"#030b18", border:"1px solid #0f172a", borderRadius:8, padding:16, marginBottom:12 }}>
        <div style={{ fontSize:9, color:"#334155", letterSpacing:"0.1em", marginBottom:12 }}>SERVICE DEPENDENCY GRAPH</div>
        <ArchGraph active={done} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {ARCH_NODES.map(n=>(
          <div key={n.id} style={{ background:"#030b18", border:`1px solid ${done?n.color+"40":"#0f172a"}`, borderRadius:6, padding:"8px 12px", display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ width:8, height:8, borderRadius:2, background:done?n.color:"#0f172a", transition:"all 0.3s", boxShadow:done?`0 0 6px ${n.color}`:""  }} />
            <div>
              <div style={{ fontSize:11, color:done?"#cbd5e1":"#334155" }}>{n.label}</div>
              <div style={{ fontSize:9, color:"#1e3a5f" }}>
                {n.id === "client" ? "browser SPA" :
                 n.id === "gateway" ? "express:3000" :
                 n.id === "auth" ? "jwt+oauth2" :
                 n.id === "task" ? "REST service" :
                 n.id === "notify" ? "email+push" :
                 n.id === "db" ? "pg:5432" :
                 n.id === "redis" ? "6379" :
                 n.id === "queue" ? "bull+redis" : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
