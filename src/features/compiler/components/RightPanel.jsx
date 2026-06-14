import { useEffect, useRef } from "react";
import { PanelHeader } from "../../../components/ui/PanelHeader.jsx";
import { Badge, StatusBadge } from "../../../components/ui/Badge.jsx";
import { STAGES, SCHEMA_TABS } from "../../../constants/compiler.js";

const repairColor = {
  system: "#38bdf8",
  meta: "#475569",
  success: "#34d399",
  warn: "#fb923c",
  error: "#f87171",
  repair: "#fbbf24",
  info: "#475569"
};

export function RightPanel({
  done,
  repairLogs,
  statuses,
  stageOutputs,
  downloadJSON
}) {
  const repairRef = useRef(null);

  useEffect(() => {
    if (repairRef.current) {
      repairRef.current.scrollTop = repairRef.current.scrollHeight;
    }
  }, [repairLogs]);

  return (
    <div style={{ borderLeft:"1px solid #080f1e", display:"flex", flexDirection:"column", overflow:"hidden", background:"#030b18" }}>
      {/* Validation log */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", borderBottom:"1px solid #080f1e" }}>
        <PanelHeader icon="⚿" title="VALIDATION LOG" accent="#fb923c"
          right={done ? <Badge label={`${repairLogs.filter(l=>l.type==="warn").length}W`} color="#fb923c" /> : null}
        />
        <div ref={repairRef} style={{ flex:1, overflowY:"auto", padding:"8px 10px", fontFamily:"inherit", fontSize:10, lineHeight:1.7 }}>
          {repairLogs.length===0 && <span style={{ color:"#1e3a5f" }}>awaiting validation…</span>}
          {repairLogs.map(l=>(
            <div key={l.id} style={{ display:"flex", gap:6, color:repairColor[l.type]||"#334155", animation:"fadeIn 0.1s ease", flexWrap:"wrap" }}>
              <span style={{ color:"#1e3a5f", flexShrink:0, fontSize:9, marginTop:1 }}>{l.t}</span>
              <span style={{ wordBreak:"break-all" }}>{l.msg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stage summary */}
      <div style={{ flexShrink:0, borderBottom:"1px solid #080f1e" }}>
        <PanelHeader icon="⊳" title="STAGE STATUS" />
        <div style={{ padding:"8px 12px" }}>
          {STAGES.map(s=>{
            const st = statuses[s.id];
            const out = stageOutputs[s.id];
            return (
              <div key={s.id} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                <div style={{ width:3, height:28, borderRadius:2, background:st==="done"?s.color:st==="running"?s.color:"#0f172a", flexShrink:0, transition:"all 0.3s" }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:10, color:st==="done"?"#94a3b8":"#334155" }}>{s.name}</span>
                    <StatusBadge status={st} />
                  </div>
                  {out && <div style={{ fontSize:9, color:"#1e3a5f" }}>{Object.values(out).filter(v=>typeof v==="number").join("  ")}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Download artifacts */}
      <div style={{ flexShrink:0 }}>
        <PanelHeader icon="↓" title="ARTIFACTS" accent="#34d399" />
        <div style={{ padding:"8px 12px 12px" }}>
          {SCHEMA_TABS.filter(t => t !== "Generated Code").map(t=>(
            <button key={t} onClick={()=>downloadJSON(t)} disabled={!done} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              width:"100%", padding:"6px 8px", marginBottom:4,
              background:done?"#020f1a":"#020810",
              border:`1px solid ${done?"#34d39920":"#0a1628"}`,
              borderRadius:5, fontFamily:"inherit", fontSize:10,
              color:done?"#64748b":"#1e3a5f", cursor:done?"pointer":"not-allowed",
              transition:"all 0.15s",
            }}
              onMouseEnter={e=>{ if(done){e.currentTarget.style.borderColor="#34d39940";e.currentTarget.style.color="#34d399";} }}
              onMouseLeave={e=>{ if(done){e.currentTarget.style.borderColor="#34d39920";e.currentTarget.style.color="#64748b";} }}
            >
              <span>{t.toLowerCase().replace(/ /g,"_")}.json</span>
              <span style={{ fontSize:9 }}>↓</span>
            </button>
          ))}
          <button onClick={()=>downloadJSON(null)} disabled={!done} style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            width:"100%", padding:"6px 8px", marginTop:4,
            background:done?"#0a1e32":"#020810",
            border:`1px solid ${done?"#38bdf830":"#0a1628"}`,
            borderRadius:5, fontFamily:"inherit", fontSize:10, fontWeight:600,
            color:done?"#38bdf8":"#1e3a5f", cursor:done?"pointer":"not-allowed",
            transition:"all 0.15s",
          }}>
            <span>all_schemas.json</span>
            <span>↓ ALL</span>
          </button>
        </div>
      </div>
    </div>
  );
}
