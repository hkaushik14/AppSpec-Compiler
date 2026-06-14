import { useCallback } from "react";
import { useCompiler } from "../../../hooks/useCompiler.js";
import { useAnalytics } from "../../../hooks/useAnalytics.js";
import { useLLM } from "../../../hooks/useLLM.js";
import { usePipeline } from "../../../hooks/usePipeline.js";

import { StatusBadge } from "../../../components/ui/Badge.jsx";
import { LeftPanel } from "../components/LeftPanel.jsx";
import { RightPanel } from "../components/RightPanel.jsx";

// Tabs
import { PipelineTab } from "../components/TabContent/PipelineTab.jsx";
import { ArchTab } from "../components/TabContent/ArchTab.jsx";
import { SchemaTab } from "../components/TabContent/SchemaTab.jsx";
import { MetricsTab } from "../components/TabContent/MetricsTab.jsx";

import { STAGES } from "../../../constants/compiler.js";
import { generateRuntimeCode } from "../../../services/compiler/generators.js";

export default function CompilerPage() {
  const compiler = useCompiler();
  const analytics = useAnalytics();
  
  // Connect useLLM with analytics tracking callbacks
  const llm = useLLM(analytics.incrementApiCalls, analytics.addTokens);
  
  // Connect usePipeline with all required state/analytics dependencies
  const { runPipeline } = usePipeline({
    ...compiler,
    ...analytics,
    ...llm
  });

  const downloadJSON = useCallback((key) => {
    const data = key ? compiler.schemas[key] : compiler.schemas;
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = key ? `${key.replace(/ /g,"_").toLowerCase()}.json` : "all_schemas.json";
    a.click();
  }, [compiler.schemas]);

  const MAIN_TABS = [
    { id:"pipeline",  label:"Pipeline",     icon:"⊳" },
    { id:"arch",      label:"Architecture", icon:"⬡" },
    { id:"schema",    label:"Schema",       icon:"⊞" },
    { id:"metrics",   label:"Metrics",      icon:"◈" },
  ];

  // Derived state
  const stagesCompleted = Object.values(compiler.statuses).filter((s) => s === "done").length;
  const validationErrorCount = compiler.metrics?.validationErrors ?? 
    compiler.validationResults.reduce((n, c) => n + (c.failures?.length || 0), 0);
  
  const computeRunStatus = () => {
    if (Object.values(compiler.statuses).some((s) => s === "error")) return "FAILED";
    if (!compiler.done) return null;
    const allPassed = compiler.validationResults.length > 0 && compiler.validationResults.every((c) => c.ok);
    return allPassed ? "SUCCESS" : "PARTIAL";
  };
  const runStatus = compiler.metrics?.runStatus ?? computeRunStatus();
  
  const generatedCode = compiler.schemas["Generated Code"] || (
    compiler.schemas["DB Schema"]
      ? generateRuntimeCode(compiler.schemas["DB Schema"], compiler.schemas["API Schema"], compiler.schemas["UI Schema"])
      : null
  );

  return (
    <div style={{ fontFamily:"'JetBrains Mono','Fira Code','Courier New',monospace", background:"#020810", color:"#94a3b8", minHeight:"100vh", display:"flex", flexDirection:"column", fontSize:12 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes marching{from{stroke-dashoffset:12}to{stroke-dashoffset:0}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:#020810}
        ::-webkit-scrollbar-thumb{background:#0f172a;border-radius:3px}
        textarea{color-scheme:dark}
        button:focus-visible{outline:1px solid #38bdf8;outline-offset:2px}
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"0 16px", height:40, borderBottom:"1px solid #080f1e", background:"#020810", flexShrink:0, zIndex:10 }}>
        <span style={{ color:"#38bdf8", fontSize:14, fontWeight:700, letterSpacing:"-0.03em" }}>⚡ AppCompiler</span>
        <span style={{ color:"#0f172a", fontSize:10 }}>|</span>
        <span style={{ fontSize:9, color:"#1e3a5f", letterSpacing:"0.1em" }}>AI SCHEMA PIPELINE v2.1.0</span>
        <div style={{ flex:1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
          <span style={{ fontSize: 9, color: "#475569" }}>GEMINI API KEY:</span>
          <input
            type="password"
            value={llm.apiKey}
            onChange={(e) => llm.setApiKey(e.target.value)}
            placeholder="Paste API Key here..."
            style={{
              background: "#020810",
              border: "1px solid #1e293b",
              borderRadius: 4,
              padding: "2px 6px",
              fontSize: 9,
              color: "#cbd5e1",
              width: 145,
              fontFamily: "inherit",
              outline: "none"
            }}
          />
        </div>
        {compiler.done && compiler.elapsed && (
          <span style={{ fontSize:9, color:"#334155", animation:"fadeIn 0.4s ease", marginRight: 12 }}>
            run #{compiler.runCount}  {compiler.elapsed}ms  ~{compiler.tokenCount?.toLocaleString()} tokens
          </span>
        )}
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {STAGES.map(s => {
            const st = compiler.statuses[s.id];
            const c = st==="done"?"#34d399":st==="running"?"#fbbf24":st==="error"?"#f87171":"#0f172a";
            return <div key={s.id} title={s.name} style={{ width:5, height:5, borderRadius:"50%", background:c, boxShadow:st==="done"?`0 0 5px ${c}`:"none", transition:"all 0.3s" }} />;
          })}
        </div>
        <StatusBadge status={compiler.done?"done":compiler.running?"running":"idle"} />
      </div>

      {/* ── BODY: 3-column layout ── */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"300px 1fr 260px", gridTemplateRows:"1fr", overflow:"hidden", minHeight:0 }}>

        {/* ═══════ LEFT PANEL ═══════ */}
        <LeftPanel
          prompt={compiler.prompt}
          setPrompt={compiler.setPrompt}
          running={compiler.running}
          done={compiler.done}
          runPipeline={runPipeline}
          handleReset={compiler.handleReset}
          assumptions={compiler.assumptions}
          logs={compiler.logs}
        />

        {/* ═══════ CENTRE PANEL ═══════ */}
        <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Centre tab bar */}
          <div style={{ display:"flex", gap:0, borderBottom:"1px solid #080f1e", flexShrink:0, background:"#020810" }}>
            {MAIN_TABS.map(t=>(
              <button key={t.id} onClick={()=>compiler.setActiveMainTab(t.id)} style={{
                padding:"8px 18px", background:"none",
                border:"none",
                borderBottom:`2px solid ${compiler.activeMainTab===t.id?"#38bdf8":"transparent"}`,
                fontFamily:"inherit", fontSize:10, color:compiler.activeMainTab===t.id?"#38bdf8":"#334155",
                cursor:"pointer", letterSpacing:"0.08em", display:"flex", alignItems:"center", gap:5,
                transition:"color 0.15s",
              }}>
                <span style={{ fontSize:12 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* Tab content view router */}
          {compiler.activeMainTab==="pipeline" && (
            <PipelineTab
              statuses={compiler.statuses}
              subSt={compiler.subSt}
              expanded={compiler.expanded}
              setExpanded={compiler.setExpanded}
              stageOutputs={compiler.stageOutputs}
              validationResults={compiler.validationResults}
              repairAttempts={compiler.repairAttempts}
              done={compiler.done}
              metrics={compiler.metrics}
              downloadJSON={downloadJSON}
            />
          )}

          {compiler.activeMainTab==="arch" && (
            <ArchTab
              done={compiler.done}
            />
          )}

          {compiler.activeMainTab==="schema" && (
            <SchemaTab
              done={compiler.done}
              running={compiler.running}
              elapsed={compiler.elapsed}
              apiCallCount={analytics.apiCallCount}
              repairAttempts={compiler.repairAttempts}
              validationErrorCount={validationErrorCount}
              stagesCompleted={stagesCompleted}
              runStatus={runStatus}
              showEvalLog={compiler.showEvalLog}
              setShowEvalLog={compiler.setShowEvalLog}
              handleReset={compiler.handleReset}
              evaluationLog={compiler.evaluationLog}
              activeSchemaTab={compiler.activeSchemaTab}
              setActiveSchemaTab={compiler.setActiveSchemaTab}
              downloadJSON={downloadJSON}
              activeSubTab={compiler.activeSubTab}
              setActiveSubTab={compiler.setActiveSubTab}
              generatedCode={generatedCode}
              schemas={compiler.schemas}
            />
          )}

          {compiler.activeMainTab==="metrics" && (
            <MetricsTab
              metrics={compiler.metrics}
              elapsed={compiler.elapsed}
              apiCallCount={analytics.apiCallCount}
              repairAttempts={compiler.repairAttempts}
              validationErrorCount={validationErrorCount}
              stagesCompleted={stagesCompleted}
              runStatus={runStatus}
              cacheHits={analytics.cacheHits}
              costSavings={analytics.costSavings}
              totalTokens={analytics.totalTokens}
            />
          )}
        </div>

        {/* ═══════ RIGHT PANEL ═══════ */}
        <RightPanel
          done={compiler.done}
          repairLogs={compiler.repairLogs}
          statuses={compiler.statuses}
          stageOutputs={compiler.stageOutputs}
          downloadJSON={downloadJSON}
        />
      </div>
    </div>
  );
}
