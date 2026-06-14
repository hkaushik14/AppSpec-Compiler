import { useState, useEffect } from "react";
import { JsonTree } from "../../../../components/ui/JsonTree.jsx";
import { RUN_STATUS_COLORS, SCHEMA_TABS } from "../../../../constants/compiler.js";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Database, 
  Send, 
  Layout, 
  ShieldCheck, 
  Activity, 
  FileJson, 
  X, 
  Download, 
  Terminal, 
  Code2, 
  Sparkles,
  ClipboardCheck,
  Clipboard
} from "lucide-react";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Close drawer if active tab changes to Generated Code
  useEffect(() => {
    if (SCHEMA_TABS[activeSchemaTab] === "Generated Code") {
      setDrawerOpen(false);
    }
  }, [activeSchemaTab]);

  const schemaInfo = [
    { 
      title: "Database Schema", 
      tabName: "DB Schema", 
      icon: <Database className="w-5 h-5 text-sky-400" />,
      desc: "Physical schema models, data types, indexes and foreign key references.",
      countLabel: (data) => `${Object.keys(data || {}).length} Tables`
    },
    { 
      title: "API Contracts", 
      tabName: "API Schema", 
      icon: <Send className="w-5 h-5 text-purple-400" />,
      desc: "HTTP routes, path parameters, request bodies, and JSON responses.",
      countLabel: (data) => `${Object.keys(data || {}).length} Endpoints`
    },
    { 
      title: "UI Blueprint", 
      tabName: "UI Schema", 
      icon: <Layout className="w-5 h-5 text-emerald-400" />,
      desc: "Client-side page layout structure, layout components, inputs, and states.",
      countLabel: (data) => `${Object.keys(data || {}).length} Views`
    },
    { 
      title: "Auth Rules", 
      tabName: "Auth Rules", 
      icon: <ShieldCheck className="w-5 h-5 text-amber-400" />,
      desc: "Access control policies, JWT security scopes, and role permissions.",
      countLabel: (data) => `${Object.keys(data || {}).length} Rule Sets`
    },
    { 
      title: "Execution Plan", 
      tabName: "Execution Plan", 
      icon: <Activity className="w-5 h-5 text-pink-400" />,
      desc: "Sequence layout for migration scripts, dependencies, and container launches.",
      countLabel: (data) => `${Object.keys(data || {}).length} Steps`
    }
  ];

  const handleCardClick = (tabName) => {
    const idx = SCHEMA_TABS.indexOf(tabName);
    if (idx !== -1) {
      setActiveSchemaTab(idx);
      if (done) setDrawerOpen(true);
    }
  };

  const getCodeText = () => {
    if (!generatedCode) return "";
    if (activeSubTab === "SQL") return generatedCode.sql || "";
    if (activeSubTab === "Routes") return generatedCode.routes || "";
    if (activeSubTab === "Pages") return generatedCode.pages || "";
    return "";
  };

  const handleCopyCode = () => {
    const txt = getCodeText();
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      
      {/* 1. Metrics & Logs Bar */}
      {(running || done || elapsed !== null) && (
        <div className="shrink-0 bg-slate-950/40 border-b border-white/[0.04] px-4 py-2 flex flex-wrap items-center justify-between gap-4 select-none">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[10px] font-mono text-slate-400">
            <span className="text-slate-500 uppercase tracking-widest text-[9px] font-bold">Metrics Summary:</span>
            <span>Runtime: <strong className="text-sky-400">{elapsed !== null ? `${elapsed}ms` : "-"}</strong></span>
            <span>API Calls: <strong className="text-purple-400">{apiCallCount}</strong></span>
            <span>Repairs: <strong className="text-amber-400">{repairAttempts}</strong></span>
            <span>Errors: <strong className={validationErrorCount > 0 ? "text-rose-400" : "text-emerald-400"}>{validationErrorCount}</strong></span>
            <span>Stages: <strong className="text-emerald-400">{stagesCompleted}/4</strong></span>
            {runStatus && <span>Status: <strong style={{ color: RUN_STATUS_COLORS[runStatus] }}>{runStatus}</strong></span>}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowEvalLog(!showEvalLog)}
              className="px-2.5 py-1 bg-slate-900 border border-white/[0.06] hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[9px] font-bold rounded-lg transition-colors cursor-pointer font-mono"
            >
              {showEvalLog ? "Close Latency Log ▴" : "Evaluation Logs ▾"}
            </button>
            
            <button 
              onClick={handleReset}
              className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[9px] font-bold rounded-lg transition-colors cursor-pointer font-mono"
            >
              Reset Compiler
            </button>
          </div>
        </div>
      )}

      {/* 2. Collapsible Evaluation Log details */}
      <AnimatePresence>
        {showEvalLog && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 bg-slate-950/80 border-b border-white/[0.04] overflow-hidden select-none"
          >
            <div className="p-4 max-h-48 overflow-y-auto space-y-2">
              <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase font-mono mb-2">
                Latency Breakdown Per Stage
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {evaluationLog.map((log) => (
                  <div 
                    key={log.stage} 
                    className="p-2.5 bg-slate-950 border border-white/[0.03] rounded-lg text-[10px] font-mono"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-indigo-400">{log.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        log.status === "done" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {log.status === "done" ? "DONE" : log.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 text-[9px] mt-1.5">
                      <span>Duration: <strong className="text-slate-300">{log.duration !== undefined ? `${log.duration}ms` : "-"}</strong></span>
                      <span>Start: {log.start || "-"}</span>
                      <span>End: {log.end || "-"}</span>
                    </div>
                    {log.error && (
                      <div className="text-rose-400 text-[9px] mt-1 break-all">Error: {log.error}</div>
                    )}
                  </div>
                ))}
              </div>
              {evaluationLog.length === 0 && (
                <div className="text-slate-600 font-mono text-[10px]">No telemetry records recorded yet. Execute compile.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Main content body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 max-w-5xl mx-auto w-full relative">
        
        {/* Schema Cards Grid */}
        <div>
          <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase font-mono mb-3.5">
            Synthesis Blueprint Specifications
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schemaInfo.map((info) => {
              const data = schemas[info.tabName];
              const isSelected = SCHEMA_TABS[activeSchemaTab] === info.tabName;
              return (
                <motion.div
                  key={info.tabName}
                  whileHover={done ? { y: -2 } : {}}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  onClick={() => handleCardClick(info.tabName)}
                  className={`glass-card rounded-xl border p-4.5 flex flex-col justify-between min-h-[140px] relative transition-all duration-300 ${
                    !done
                      ? "opacity-45 border-transparent bg-slate-950/10 cursor-not-allowed"
                      : isSelected
                      ? "border-indigo-500/40 bg-indigo-950/10 shadow-[0_0_15px_rgba(99,102,241,0.08)] cursor-pointer"
                      : "border-white/[0.04] hover:border-white/[0.12] cursor-pointer"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg bg-slate-900 border border-white/[0.03] shrink-0">
                      {info.icon}
                    </div>
                    
                    {done && data && (
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full select-none">
                        {info.countLabel(data)}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <h5 className="text-xs font-bold text-slate-200 font-display">{info.title}</h5>
                    <p className="mt-1 text-slate-400 text-[10px] leading-relaxed font-light font-sans">
                      {info.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}

            {/* Generated Code Card */}
            <motion.div
              whileHover={done ? { y: -2 } : {}}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onClick={() => {
                if (done) {
                  setActiveSchemaTab(SCHEMA_TABS.indexOf("Generated Code"));
                  setDrawerOpen(false);
                }
              }}
              className={`glass-card rounded-xl border p-4.5 flex flex-col justify-between min-h-[140px] relative transition-all duration-300 ${
                !done
                  ? "opacity-45 border-transparent bg-slate-950/10 cursor-not-allowed"
                  : SCHEMA_TABS[activeSchemaTab] === "Generated Code"
                  ? "border-indigo-500/40 bg-indigo-950/10 shadow-[0_0_15px_rgba(99,102,241,0.08)] cursor-pointer"
                  : "border-white/[0.04] hover:border-white/[0.12] cursor-pointer"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-slate-900 border border-white/[0.03] shrink-0">
                  <Code2 className="w-5 h-5 text-indigo-400" />
                </div>
                
                {done && (
                  <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full select-none">
                    Executable
                  </span>
                )}
              </div>
              
              <div className="mt-4">
                <h5 className="text-xs font-bold text-slate-200 font-display">Generated Code Blocks</h5>
                <p className="mt-1 text-slate-400 text-[10px] leading-relaxed font-light font-sans">
                  Compiled SQL migration queries, Express routes, and structured client views.
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* 4. Generated Code blocks section */}
        {done && SCHEMA_TABS[activeSchemaTab] === "Generated Code" && (
          <div className="space-y-3 animate-fade-in select-none">
            <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase font-mono">
              Compiled Executable Code Viewer
            </div>
            
            <div className="flex flex-col bg-slate-950 border border-white/[0.04] rounded-xl overflow-hidden shadow-2xl">
              {/* Header tabs for sub-codes */}
              <div className="flex items-center justify-between border-b border-white/[0.04] px-3 bg-slate-950/60 h-11">
                <div className="flex items-center gap-1">
                  {["SQL", "Routes", "Pages"].map((subTab) => (
                    <button
                      key={subTab}
                      onClick={() => setActiveSubTab(subTab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                        activeSubTab === subTab 
                          ? "bg-slate-900 text-indigo-400 border border-white/[0.03]" 
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {subTab}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/[0.04] hover:border-white/[0.08] text-slate-400 hover:text-slate-200 text-[10px] font-mono font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? (
                    <><ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" /> Copied!</>
                  ) : (
                    <><Clipboard className="w-3.5 h-3.5" /> Copy Code</>
                  )}
                </button>
              </div>
              
              {/* Code text panel */}
              <div className="p-4 bg-slate-950/40 relative">
                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed select-text max-h-[350px]">
                  {getCodeText() ? (
                    getCodeText()
                  ) : (
                    <span className="text-slate-600 font-light italic">No code blocks generated. Re-execute compile run.</span>
                  )}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Sliding JSON Drawer (Right overlay) */}
      <AnimatePresence>
        {drawerOpen && done && SCHEMA_TABS[activeSchemaTab] !== "Generated Code" && (
          <>
            {/* Backdrop click cover */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 z-40 backdrop-blur-xs select-none"
            />
            
            {/* Drawer layout panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="absolute top-0 right-0 w-full sm:w-[480px] h-full bg-[#040815]/95 border-l border-white/[0.06] shadow-2xl z-50 flex flex-col overflow-hidden select-none"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.04] bg-[#030712]/80 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-indigo-500/10 text-indigo-400">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 font-mono tracking-wide uppercase">
                    {SCHEMA_TABS[activeSchemaTab]} Specifications
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => downloadJSON(SCHEMA_TABS[activeSchemaTab])} 
                    className="p-1.5 hover:bg-slate-900 border border-white/[0.04] text-slate-400 hover:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                    title="Download JSON Specifications"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDrawerOpen(false)}
                    className="p-1.5 hover:bg-slate-900 border border-white/[0.04] text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* JSON tree tree structure view */}
              <div className="flex-1 overflow-y-auto p-5 select-text bg-[#030712]/40">
                <div className="p-4 bg-[#030b18]/60 border border-white/[0.03] rounded-xl">
                  <JsonTree data={schemas[SCHEMA_TABS[activeSchemaTab]]} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
