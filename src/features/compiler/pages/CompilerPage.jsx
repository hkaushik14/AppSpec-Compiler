import { useCallback, useState } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, 
  HelpCircle, 
  Layers, 
  Info, 
  Key, 
  Play, 
  RefreshCw, 
  Cpu, 
  Activity, 
  FileText,
  Flame,
  ArrowRight
} from "lucide-react";

export default function CompilerPage() {
  const compiler = useCompiler();
  const analytics = useAnalytics();
  const llm = useLLM(analytics.incrementApiCalls, analytics.addTokens);
  
  const { runPipeline } = usePipeline({
    ...compiler,
    prompt: compiler.prompt ? compiler.prompt + "\n\n(Important system design constraint: please ensure the 'guest' role is explicitly defined in your role_permissions definitions, or define page visibility for pages like login/register to 'public' or 'anonymous' to prevent role consistency errors.)" : "",
    ...analytics,
    ...llm
  });

  const [activeModal, setActiveModal] = useState(null); // 'how-it-works' | 'about' | null

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
    { id:"pipeline",  label:"Pipeline",     icon: <Terminal className="w-3.5 h-3.5" /> },
    { id:"arch",      label:"Architecture", icon: <Layers className="w-3.5 h-3.5" /> },
    { id:"schema",    label:"Schema Drawer", icon: <FileText className="w-3.5 h-3.5" /> },
    { id:"metrics",   label:"Metrics & Timings",  icon: <Activity className="w-3.5 h-3.5" /> },
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

  const isStateActive = compiler.running || compiler.done;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans relative overflow-hidden bg-grid-pattern">
      
      {/* Background Aurora Elements */}
      <div className="aurora-blur-1" />
      <div className="aurora-blur-2" />
      <div className="aurora-blur-3" />
      
      {/* ── TOPBAR ── */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-white/[0.04] bg-[#020617]/75 backdrop-blur-md z-30 shrink-0 select-none relative">
        
        {/* Left Zone: Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={compiler.handleReset}>
          <div className="p-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <Flame className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-200 font-display">
            AppSpec
          </span>
        </div>

        {/* Center Zone: Centered Navigation */}
        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-6 text-[9px] font-bold text-slate-400 font-mono tracking-widest uppercase">
          <button onClick={() => setActiveModal("how-it-works")} className="hover:text-white transition-colors cursor-pointer">
            How It Works
          </button>
          <button 
            onClick={() => {
              if (isStateActive) {
                compiler.setActiveMainTab("arch");
              } else {
                setActiveModal("how-it-works");
              }
            }} 
            className="hover:text-white transition-colors cursor-pointer"
          >
            Architecture
          </button>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
            GitHub
          </a>
          <button onClick={() => setActiveModal("about")} className="hover:text-white transition-colors cursor-pointer">
            About
          </button>
        </nav>

        {/* Right Zone: Controls & Key badge */}
        <div className="flex items-center gap-4">
          {/* Compact API Key Input */}
          <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.04] rounded-full px-2.5 py-0.5 text-slate-400 focus-within:border-white/10 transition-colors">
            <Key className="w-2.5 h-2.5 text-slate-500 shrink-0" />
            <input
              type="password"
              value={llm.apiKey}
              onChange={(e) => llm.setApiKey(e.target.value)}
              placeholder="API Key..."
              className="bg-transparent text-[9px] font-mono focus:outline-none w-20 md:w-28 text-slate-200 placeholder-slate-600"
            />
          </div>
          
          <StatusBadge status={compiler.done ? "done" : compiler.running ? "running" : "idle"} />
        </div>
      </header>

      {/* ── CORE LAYOUT SYSTEM ── */}
      <main className="flex-1 flex flex-col relative overflow-hidden z-10">
        <AnimatePresence mode="wait">
          {!isStateActive ? (
            
            /* ================== IDLE STATE HERO (CODEX EXPERIENCE) ================== */
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col items-center justify-center px-4 max-w-3xl mx-auto w-full text-center relative py-12"
            >
              {/* Glowing Squircle App Icon */}
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 border border-white/10 shadow-[0_0_35px_rgba(99,102,241,0.25)] flex items-center justify-center relative group select-none mb-6 cursor-pointer"
                onClick={compiler.handleReset}
              >
                {/* Reflections */}
                <div className="absolute inset-x-0 top-0 h-[50%] bg-white/[0.06] rounded-t-2xl pointer-events-none" />
                <span className="font-mono text-white text-base font-bold select-none">&gt;_</span>
              </motion.div>

              {/* Brand Text */}
              <div className="select-none">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-[0.25em] bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-200 leading-none font-display">
                  APPSPEC
                </h1>
                <p className="mt-2 text-slate-400 text-xs md:text-sm tracking-[0.1em] font-light uppercase font-mono">
                  Your natural language schema compiler.
                </p>
              </div>

              {/* Command Prompt Input Capsule */}
              <div className="w-full mt-10 relative group">
                {/* Glow ring on hover/focus */}
                <div className="absolute -inset-px bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full opacity-0 group-hover:opacity-100 blur-sm transition-all duration-300 pointer-events-none" />
                
                <div className="relative flex items-center bg-slate-950/45 border border-white/[0.04] focus-within:border-indigo-500/30 rounded-full pl-6 pr-2 py-2 shadow-2xl transition-all duration-300 backdrop-blur-md">
                  <Terminal className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-3" />
                  
                  <input
                    type="text"
                    value={compiler.prompt}
                    onChange={(e) => compiler.setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && compiler.prompt.trim() && !compiler.running) {
                        runPipeline();
                      }
                    }}
                    placeholder="Describe your application logic..."
                    className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none text-xs tracking-wide font-sans mr-2"
                    disabled={compiler.running}
                  />

                  {compiler.prompt && (
                    <button 
                      onClick={() => compiler.setPrompt("")}
                      className="px-3 text-slate-500 hover:text-slate-300 text-[10px] font-mono font-bold mr-1 cursor-pointer transition-colors"
                    >
                      CLEAR
                    </button>
                  )}

                  <button
                    onClick={runPipeline}
                    disabled={compiler.running || !compiler.prompt.trim()}
                    className="btn-primary flex items-center gap-1.5 px-5 h-8 rounded-full text-[10px] font-bold tracking-widest uppercase cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                  >
                    <span>Generate</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Simplified Suggestion System */}
              <div className="mt-5 select-none flex flex-wrap justify-center gap-1.5 max-w-xl">
                {[
                  { label: "task_manager", text: "Task manager with teams, tags, due dates, email notifications" },
                  { label: "stripe_shop", text: "E-commerce store with cart, Stripe payments, inventory tracking" },
                  { label: "presence_chat", text: "Real-time chat app with rooms, presence, and message history" },
                  { label: "saas_billing", text: "SaaS dashboard with multi-tenant billing and usage analytics" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => compiler.setPrompt(item.text)}
                    className="px-3 py-1 rounded-full text-[9px] font-semibold bg-white/[0.02] border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 transition-all font-mono cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Integration Badges Section */}
              <div className="mt-20 w-full select-none">
                <div className="text-[8px] font-bold tracking-[0.25em] text-slate-600 uppercase font-mono mb-4">
                  Target Integration Stack
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-8 text-[9px] font-bold text-slate-500 font-mono tracking-widest uppercase opacity-40 hover:opacity-60 transition-opacity duration-300">
                  <span>React</span>
                  <span>&bull;</span>
                  <span>Node.js</span>
                  <span>&bull;</span>
                  <span>PostgreSQL</span>
                  <span>&bull;</span>
                  <span>Redis</span>
                  <span>&bull;</span>
                  <span>BullMQ</span>
                </div>
              </div>

            </motion.div>
          ) : (
            
            /* ================== ACTIVE STATE IDE ================== */
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr_280px] h-[calc(100vh-56px)] overflow-hidden divide-x divide-white/[0.04]"
            >
              {/* Left Column */}
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

              {/* Center Column */}
              <div className="flex flex-col min-w-0 overflow-hidden bg-transparent relative">
                
                {/* Header Tab list */}
                <div className="flex border-b border-white/[0.04] bg-[#020617]/20 shrink-0 relative z-10">
                  {MAIN_TABS.map((t) => {
                    const isTabActive = compiler.activeMainTab === t.id;
                    return (
                      <button 
                        key={t.id} 
                        onClick={() => compiler.setActiveMainTab(t.id)} 
                        className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-bold tracking-widest uppercase font-mono transition-all cursor-pointer ${
                          isTabActive 
                            ? "border-indigo-500 text-indigo-400 bg-indigo-500/[0.01]" 
                            : "border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {t.icon}
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab content router */}
                <div className="flex-1 overflow-y-auto min-h-0 relative z-10">
                  {compiler.activeMainTab === "pipeline" && (
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

                  {compiler.activeMainTab === "arch" && (
                    <ArchTab
                      done={compiler.done}
                    />
                  )}

                  {compiler.activeMainTab === "schema" && (
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

                  {compiler.activeMainTab === "metrics" && (
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
              </div>

              {/* Right Column */}
              <RightPanel
                done={compiler.done}
                repairLogs={compiler.repairLogs}
                statuses={compiler.statuses}
                stageOutputs={compiler.stageOutputs}
                downloadJSON={downloadJSON}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── MODALS (HOW IT WORKS / ABOUT) ── */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="glass-panel w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border-white/[0.06] bg-[#020617]/95"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
                <h3 className="text-[10px] font-bold text-indigo-400 font-mono tracking-widest uppercase">
                  {activeModal === "how-it-works" ? "AI Pipeline workflow" : "About AppSpec"}
                </h3>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="text-slate-500 hover:text-slate-300 text-[10px] font-mono cursor-pointer font-bold"
                >
                  [CLOSE]
                </button>
              </div>

              <div className="p-5 text-xs text-slate-400 leading-relaxed font-light space-y-4">
                {activeModal === "how-it-works" ? (
                  <>
                    <p>
                      AppSpec executes an automated multi-stage compilation pipeline translating natural language requirements into microservice architectures.
                    </p>
                    <div className="grid grid-cols-1 gap-2.5 mt-2">
                      <div className="p-2.5 bg-slate-900/40 rounded-xl border border-white/[0.03]">
                        <span className="font-bold text-indigo-400 font-mono mr-1">01. Intent:</span> Parses vocabulary glossaries and assumptions.
                      </div>
                      <div className="p-2.5 bg-slate-900/40 rounded-xl border border-white/[0.03]">
                        <span className="font-bold text-purple-400 font-mono mr-1">02. Design:</span> Establishes schema relations and validations.
                      </div>
                      <div className="p-2.5 bg-slate-900/40 rounded-xl border border-white/[0.03]">
                        <span className="font-bold text-emerald-400 font-mono mr-1">03. Synthesis:</span> Generates databases, REST routes, and view structures.
                      </div>
                      <div className="p-2.5 bg-slate-900/40 rounded-xl border border-white/[0.03]">
                        <span className="font-bold text-amber-400 font-mono mr-1">04. Self-Repair:</span> Validates parameters and runs auto-recovery cycles.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      <strong>AppSpec Compiler</strong> is a recruiter-ready schema synthesizer tool showcasing agentic LLM validations.
                    </p>
                    <p>
                      Built with React, Tailwind CSS, Framer Motion, and Google Gemini API integration.
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
