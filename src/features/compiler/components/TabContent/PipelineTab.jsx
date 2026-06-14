import { Badge, StatusBadge } from "../../../../components/ui/Badge.jsx";
import { JsonTree } from "../../../../components/ui/JsonTree.jsx";
import { STAGES } from "../../../../constants/compiler.js";

export function PipelineTab({
  statuses,
  subSt,
  expanded,
  setExpanded,
  stageOutputs,
  validationResults,
  repairAttempts,
  done,
  metrics,
  downloadJSON
}) {
  return (
    <div style={{ flex:1, overflow:"auto", padding:16 }}>
      {/* Stage cards */}
      {STAGES.map((stage,idx)=>{
        const st = statuses[stage.id];
        const isExp = expanded[stage.id];
        const out = stageOutputs[stage.id];
        const isRunning = st==="running";
        const isDone = st==="done";
        return (
          <div key={stage.id} style={{
            marginBottom:8, border:`1px solid ${isDone?stage.color+"40":isRunning?stage.color+"30":"#0f172a"}`,
            borderRadius:8, overflow:"hidden", background:"#030b18",
            boxShadow:isDone?`0 0 12px ${stage.color}15`:"none",
            transition:"all 0.3s", animation:`slideDown 0.3s ease ${idx*0.05}s both`,
          }}>
            {/* Stage header */}
            <div onClick={()=>setExpanded(p=>({...p,[stage.id]:!p[stage.id]}))}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer",
                background:isRunning?`${stage.color}08`:"transparent" }}>
              {/* Progress line accent */}
              <div style={{ width:3, height:32, borderRadius:2, background:isDone?stage.color:isRunning?stage.color:"#0f172a", flexShrink:0, transition:"all 0.4s", boxShadow:isDone||isRunning?`0 0 8px ${stage.color}`:""  }} />
              <span style={{ fontSize:9, color:"#1e3a5f", minWidth:20 }}>{stage.num}</span>
              <span style={{ fontSize:13, marginRight:2 }}>{stage.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:600, color:isDone?"#e2e8f0":isRunning?"#cbd5e1":"#334155", marginBottom:1, transition:"color 0.3s" }}>
                  {stage.name}
                </div>
                {stage.subs && (
                  <div style={{ display:"flex", gap:4 }}>
                    {stage.subs.map(b=>(
                      <Badge key={b} label={b} color={
                        subSt[b]==="done"?"#34d399":subSt[b]==="running"?"#fbbf24":"#334155"
                      } pulse={subSt[b]==="running"} />
                    ))}
                  </div>
                )}
              </div>
              {out && <span style={{ fontSize:9, color:"#334155", marginRight:8 }}>
                {Object.keys(out).length} fields
              </span>}
              <StatusBadge status={st} />
              <span style={{ color:"#1e3a5f", fontSize:11, marginLeft:4, transform:isExp?"rotate(180deg)":"", display:"inline-block", transition:"transform 0.2s" }}>⌄</span>
            </div>

            {/* Stage output */}
            {isExp && (
              <div style={{ padding:"0 14px 12px 14px", borderTop:"1px solid #0a1628", animation:"fadeIn 0.2s ease" }}>
                <div style={{ background:"#020810", borderRadius:5, padding:"10px 12px", fontFamily:"inherit", fontSize:11, lineHeight:1.8, maxHeight:180, overflowY:"auto" }}>
                  {out && out.error ? (
                    <span style={{ color: "#f87171" }}>Error: {out.error}</span>
                  ) : stage.id === "validation" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {validationResults.map((r, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11 }}>
                          <span style={{ color: r.ok ? "#34d399" : "#f87171", fontWeight: "bold" }}>
                            {r.ok ? "✓" : "✗"}
                          </span>
                          <div>
                            <span style={{ color: "#e2e8f0", fontWeight: 500 }}>{r.name}</span>
                            <span style={{ color: "#64748b", fontSize: 10, display: "block" }}>{r.msg}</span>
                            {!r.ok && r.failures && r.failures.length > 0 && (
                              <ul style={{ paddingLeft: 14, listStyleType: "circle", color: "#f87171", fontSize: 9, marginTop: 2 }}>
                                {r.failures.map((f, fi) => <li key={fi}>{f}</li>)}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                      {repairAttempts > 0 && (
                        <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 4, borderTop: "1px dashed #1e293b", paddingTop: 4 }}>
                          Repairs attempted: {repairAttempts} / 3
                        </div>
                      )}
                    </div>
                  ) : out ? (
                    <JsonTree data={out} />
                  ) : (
                    <span style={{ color: "#475569" }}>No output available. Run compilation.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Done summary bar */}
      {done && metrics && (
        <div style={{ marginTop:8, padding:"10px 14px", background:"#020f1a", border:"1px solid #34d39930", borderRadius:8, display:"flex", gap:16, alignItems:"center", animation:"slideDown 0.3s ease" }}>
          <span style={{ color:"#34d399", fontSize:11, fontWeight:600 }}>✓ PIPELINE COMPLETE</span>
          <span style={{ fontSize:10, color:"#334155" }}>{metrics.stageMs.reduce((a,b)=>a+b,0)}ms total</span>
          <span style={{ fontSize:10, color:"#334155" }}>{metrics.tables} tables  {metrics.endpoints} endpoints  {metrics.components} components</span>
          <span style={{ fontSize:10, color:metrics.warnings>0?"#fb923c":"#34d399" }}>{metrics.warnings} warnings  {metrics.repairs} repairs</span>
          <div style={{ flex:1 }} />
          <button onClick={()=>downloadJSON(null)} style={{ fontSize:10, color:"#38bdf8", background:"#0a1e32", border:"1px solid #38bdf830", borderRadius:5, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit" }}>
            ↓ ALL SCHEMAS
          </button>
        </div>
      )}
    </div>
  );
}
