import { MetricCard } from "../../../../components/ui/MetricCard.jsx";
import { JsonTree } from "../../../../components/ui/JsonTree.jsx";
import { STAGES, RUN_STATUS_COLORS } from "../../../../constants/compiler.js";

export function MetricsTab({
  metrics,
  elapsed,
  apiCallCount,
  repairAttempts,
  validationErrorCount,
  stagesCompleted,
  runStatus,
  cacheHits,
  costSavings,
  totalTokens
}) {
  return (
    <div style={{ flex:1, overflow:"auto", padding:16 }}>
      {metrics ? (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
            <MetricCard label="TOTAL RUNTIME" value={elapsed ?? metrics.stageMs.reduce((a,b)=>a+b,0)} unit="ms" color="#38bdf8" spark={metrics.spark} />
            <MetricCard label="API CALLS" value={apiCallCount} color="#a78bfa" />
            <MetricCard label="REPAIR ATTEMPTS" value={repairAttempts} color="#fbbf24" />
            <MetricCard label="VALIDATION ERRORS" value={validationErrorCount} color={validationErrorCount > 0 ? "#f87171" : "#34d399"} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
            <MetricCard label="STAGES COMPLETED" value={`${stagesCompleted}/4`} color="#34d399" />
            <MetricCard label="STATUS" value={runStatus || "—"} color={RUN_STATUS_COLORS[runStatus] || "#64748b"} />
            <MetricCard label="CACHE HITS" value={cacheHits} color="#f472b6" />
            <MetricCard label="COST SAVINGS" value={`$${costSavings.toFixed(4)}`} color="#34d399" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
            <MetricCard label="DB TABLES" value={metrics.tables} color="#38bdf8" />
            <MetricCard label="API ENDPOINTS" value={metrics.endpoints} color="#818cf8" />
            <MetricCard label="UI COMPONENTS" value={metrics.components} color="#34d399" />
            <MetricCard label="TOTAL TOKENS" value={totalTokens.toLocaleString()} color="#818cf8" />
          </div>

          {/* Normalization report (Stage 4.5) */}
          {metrics.normalizationReport && (
            <div style={{ background:"#030b18", border:"1px solid #a78bfa40", borderRadius:8, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:9, color:"#a78bfa", letterSpacing:"0.1em", marginBottom:10 }}>STAGE 4.5 — NORMALIZATION REPORT</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:10 }}>
                <MetricCard label="TABLES MERGED" value={metrics.normalizationReport.tables_merged} color="#a78bfa" />
                <MetricCard label="FIELDS RENAMED" value={metrics.normalizationReport.fields_renamed} color="#38bdf8" />
                <MetricCard label="INVALID REMOVED" value={metrics.normalizationReport.invalid_fields_removed} color="#fb923c" />
                <MetricCard label="FOREIGN KEYS ADDED" value={metrics.normalizationReport.foreign_keys_added} color="#34d399" />
              </div>
              {metrics.normalizationMs > 0 && (
                <div style={{ fontSize:10, color:"#64748b", marginBottom:8 }}>
                  Normalization duration: <span style={{ color:"#a78bfa" }}>{metrics.normalizationMs}ms</span>
                </div>
              )}
              <div style={{ background:"#020810", borderRadius:5, padding:"10px 12px" }}>
                <JsonTree data={metrics.normalizationReport} />
              </div>
            </div>
          )}

          {/* Stage timing breakdown */}
          <div style={{ background:"#030b18", border:"1px solid #0f172a", borderRadius:8, padding:14, marginBottom:12 }}>
            <div style={{ fontSize:9, color:"#334155", letterSpacing:"0.1em", marginBottom:10 }}>STAGE LATENCY BREAKDOWN</div>
            {STAGES.map((s,i)=>{
              const ms = metrics.stageMs[i];
              const total = metrics.stageMs.reduce((a,b)=>a+b,0) + (metrics.normalizationMs || 0);
              const pct = total > 0 ? Math.round((ms/total)*100) : 0;
              return (
                <div key={s.id} style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:10, color:"#64748b" }}>{s.num} {s.name}</span>
                    <span style={{ fontSize:10, color:s.color }}>{ms}ms <span style={{ color:"#334155" }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height:4, background:"#0a1628", borderRadius:2 }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:s.color, borderRadius:2, boxShadow:`0 0 6px ${s.color}80`, transition:"width 0.5s ease" }} />
                  </div>
                </div>
              );
            })}
            {metrics.normalizationMs > 0 && (
              <div style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:10, color:"#64748b" }}>04.5 Schema Normalization</span>
                  <span style={{ fontSize:10, color:"#a78bfa" }}>{metrics.normalizationMs}ms</span>
                </div>
                <div style={{ height:4, background:"#0a1628", borderRadius:2 }}>
                  <div style={{
                    height:"100%",
                    width:`${Math.round((metrics.normalizationMs / (metrics.stageMs.reduce((a,b)=>a+b,0) + metrics.normalizationMs)) * 100)}%`,
                    background:"#a78bfa", borderRadius:2, boxShadow:"0 0 6px #a78bfa80",
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Token breakdown */}
          <div style={{ background:"#030b18", border:"1px solid #0f172a", borderRadius:8, padding:14 }}>
            <div style={{ fontSize:9, color:"#334155", letterSpacing:"0.1em", marginBottom:10 }}>TOKEN USAGE</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[
                { label:"Prompt tokens",   val:metrics.tokensIn,  color:"#38bdf8" },
                { label:"Output tokens",   val:metrics.tokensOut, color:"#818cf8" },
                { label:"Ratio",           val: metrics.tokensIn > 0 ? `1 : ${(metrics.tokensOut/metrics.tokensIn).toFixed(1)}` : "—", color:"#34d399" },
              ].map(m=>(
                <div key={m.label} style={{ background:"#020810", borderRadius:5, padding:"8px 10px" }}>
                  <div style={{ fontSize:9, color:"#1e3a5f", marginBottom:3 }}>{m.label}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:m.color }}>{typeof m.val === "number" ? m.val.toLocaleString() : m.val}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ color:"#1e3a5f", textAlign:"center", paddingTop:60 }}>run pipeline to generate metrics</div>
      )}
    </div>
  );
}
