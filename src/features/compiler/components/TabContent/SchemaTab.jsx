import { JsonTree } from "../../../../components/ui/JsonTree.jsx";
import { RUN_STATUS_COLORS, SCHEMA_TABS } from "../../../../constants/compiler.js";

export function SchemaTab({
  done,
  running,
  elapsed,
  apiCallCount,
  repairAttempts,
  validationErrorCount,
  stagesCompleted,
  runStatus,
  showEvalLog,
  setShowEvalLog,
  handleReset,
  evaluationLog,
  activeSchemaTab,
  setActiveSchemaTab,
  downloadJSON,
  activeSubTab,
  setActiveSubTab,
  generatedCode,
  schemas
}) {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Metrics Bar */}
      {(running || done || elapsed !== null) && (
        <div style={{
          background: "#030c1e",
          borderBottom: "1px solid #0a1b3a",
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.05em" }}>METRICS:</span>
            <span style={{ fontSize: 10, color: "#cbd5e1" }}>
              Total Runtime: <strong style={{ color: "#38bdf8" }}>{elapsed !== null ? `${elapsed}ms` : "-"}</strong>
            </span>
            <span style={{ fontSize: 10, color: "#cbd5e1" }}>
              API Calls: <strong style={{ color: "#a78bfa" }}>{apiCallCount}</strong>
            </span>
            <span style={{ fontSize: 10, color: "#cbd5e1" }}>
              Repair Attempts: <strong style={{ color: "#fbbf24" }}>{repairAttempts}</strong>
            </span>
            <span style={{ fontSize: 10, color: "#cbd5e1" }}>
              Validation Errors: <strong style={{ color: validationErrorCount > 0 ? "#f87171" : "#34d399" }}>{validationErrorCount}</strong>
            </span>
            <span style={{ fontSize: 10, color: "#cbd5e1" }}>
              Stages: <strong style={{ color: "#34d399" }}>{stagesCompleted}/4</strong>
            </span>
            {runStatus && (
              <span style={{ fontSize: 10, color: "#cbd5e1" }}>
                Status: <strong style={{ color: RUN_STATUS_COLORS[runStatus] || "#94a3b8" }}>{runStatus}</strong>
              </span>
            )}
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button 
              onClick={() => setShowEvalLog(!showEvalLog)}
              style={{
                background: "none",
                border: "1px solid #1e293b",
                color: "#64748b",
                fontSize: 9,
                padding: "3px 8px",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
            >
              {showEvalLog ? "Hide Log ▴" : "Evaluation Log ▾"}
            </button>
            
            <button 
              onClick={handleReset}
              style={{
                background: "#311018",
                border: "1px solid #f8717140",
                color: "#f87171",
                fontSize: 9,
                padding: "3px 8px",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
            >
              Reset ↺
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Evaluation Log */}
      {showEvalLog && (
        <div style={{
          background: "#020813",
          borderBottom: "1px solid #0a1b3a",
          padding: "10px 14px",
          maxHeight: 150,
          overflowY: "auto",
          flexShrink: 0
        }}>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 6 }}>EVALUATION LOG DETAIL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {evaluationLog.map((log) => (
              <div key={log.stage} style={{
                background: "#030b18",
                border: "1px solid #0f172a",
                borderRadius: 5,
                padding: "8px 10px",
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                <div style={{ color: "#38bdf8", fontWeight: 600, marginBottom: 4 }}>{log.name}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", color: "#64748b" }}>
                  <span>Start: {log.start || "-"}</span>
                  <span>End: {log.end || "-"}</span>
                  <span style={{ color: "#cbd5e1" }}>
                    Duration: {log.duration !== undefined ? `${log.duration}ms` : "-"}
                  </span>
                  <span style={{
                    color: log.status === "done" ? "#34d399" : log.status === "running" ? "#fbbf24" : log.status === "error" ? "#f87171" : "#475569"
                  }}>
                    Status: {log.status === "done" ? "DONE" : log.status.toUpperCase()}
                  </span>
                </div>
                {log.error && (
                  <div style={{ color: "#f87171", marginTop: 4, wordBreak: "break-all" }}>Error: {log.error}</div>
                )}
              </div>
            ))}
            {evaluationLog.length === 0 && (
              <div style={{ color: "#475569", fontSize: 10 }}>No evaluation log records yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Schema sub-tab bar */}
      <div style={{ display:"flex", gap:2, padding:"8px 12px", borderBottom:"1px solid #080f1e", flexShrink:0, background:"#020810" }}>
        {SCHEMA_TABS.map((t,i)=>(
          <button key={t} onClick={()=>setActiveSchemaTab(i)} style={{
            padding:"4px 12px", background:activeSchemaTab===i?"#0a1628":"transparent",
            border:`1px solid ${activeSchemaTab===i?"#38bdf830":"transparent"}`,
            borderRadius:5, fontFamily:"inherit", fontSize:10,
            color:activeSchemaTab===i?"#38bdf8":"#334155", cursor:"pointer", transition:"all 0.15s",
          }}>
            {t}
          </button>
        ))}
        <div style={{ flex:1 }} />
        <button onClick={()=>downloadJSON(SCHEMA_TABS[activeSchemaTab])} disabled={!done || SCHEMA_TABS[activeSchemaTab] === "Generated Code"} style={{
          padding:"3px 10px", background:"transparent", border:`1px solid ${done && SCHEMA_TABS[activeSchemaTab] !== "Generated Code" ?"#38bdf830":"#0f172a"}`,
          borderRadius:5, fontFamily:"inherit", fontSize:9, color:done && SCHEMA_TABS[activeSchemaTab] !== "Generated Code"?"#38bdf8":"#1e3a5f", cursor:done && SCHEMA_TABS[activeSchemaTab] !== "Generated Code"?"pointer":"not-allowed",
        }}>↓ JSON</button>
      </div>
      
      <div style={{ flex:1, overflow:"auto", padding:"12px 16px", fontFamily:"inherit", fontSize:11, lineHeight:1.8 }}>
        {done ? (
          SCHEMA_TABS[activeSchemaTab] === "Generated Code" ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Generated Code sub-tabs */}
              <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #0f172a", paddingBottom: 8, marginBottom: 12 }}>
                {["SQL", "Routes", "Pages"].map((subTab) => (
                  <button
                    key={subTab}
                    onClick={() => setActiveSubTab(subTab)}
                    style={{
                      padding: "4px 12px",
                      background: activeSubTab === subTab ? "#0a1628" : "transparent",
                      border: `1px solid ${activeSubTab === subTab ? "#38bdf830" : "transparent"}`,
                      borderRadius: 5,
                      fontFamily: "inherit",
                      fontSize: 10,
                      color: activeSubTab === subTab ? "#38bdf8" : "#334155",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {subTab}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflow: "auto" }}>
                <pre style={{
                  background: "#030b18",
                  border: "1px solid #0f172a",
                  borderRadius: 6,
                  padding: "12px 14px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  lineHeight: 1.6,
                  color: "#cbd5e1",
                  textAlign: "left",
                  whiteSpace: "pre-wrap",
                  maxHeight: "350px",
                  overflowY: "auto"
                }}>
                  {activeSubTab === "SQL" && generatedCode?.sql}
                  {activeSubTab === "Routes" && generatedCode?.routes}
                  {activeSubTab === "Pages" && generatedCode?.pages}
                </pre>
              </div>
            </div>
          ) : (
            <div style={{ background:"#030b18", border:"1px solid #0f172a", borderRadius:6, padding:"12px 14px", animation:"fadeIn 0.2s" }}>
              <JsonTree data={schemas[SCHEMA_TABS[activeSchemaTab]]} />
            </div>
          )
        ) : (
          <div style={{ color:"#1e3a5f", textAlign:"center", paddingTop:40 }}>run pipeline to generate schemas</div>
        )}
      </div>
    </div>
  );
}
