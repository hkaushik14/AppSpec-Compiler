import { Badge, StatusBadge } from "../../../../components/ui/Badge.jsx";
import { JsonTree } from "../../../../components/ui/JsonTree.jsx";
import { STAGES } from "../../../../constants/compiler.js";
import { ChevronDown, FileJson, Sparkles, CheckCircle } from "lucide-react";

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
    <div className="flex-1 overflow-y-auto p-4 space-y-3.5 max-w-5xl mx-auto w-full select-none">
      
      {/* Stage cards */}
      {STAGES.map((stage, idx) => {
        const st = statuses[stage.id];
        const isExp = expanded[stage.id];
        const out = stageOutputs[stage.id];
        const isRunning = st === "running";
        const isDone = st === "done";
        const isFailed = st === "error";

        let borderStyle = "border-white/[0.04]";
        let glowStyle = "shadow-md";
        let leftBarColor = "bg-slate-800";

        if (isDone) {
          borderStyle = "border-emerald-500/20";
          glowStyle = "shadow-[0_0_15px_-3px_rgba(16,185,129,0.06)]";
          leftBarColor = "bg-emerald-400 shadow-[0_0_8px_#34d399]";
        } else if (isRunning) {
          borderStyle = "border-amber-500/20";
          glowStyle = "shadow-[0_0_15px_-3px_rgba(245,158,11,0.06)]";
          leftBarColor = "bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]";
        } else if (isFailed) {
          borderStyle = "border-red-500/20";
          glowStyle = "shadow-[0_0_15px_-3px_rgba(239,68,68,0.06)]";
          leftBarColor = "bg-red-400 shadow-[0_0_8px_#f87171]";
        }

        return (
          <div 
            key={stage.id} 
            className={`glass-card rounded-xl border overflow-hidden transition-all duration-300 ${borderStyle} ${glowStyle} animate-fade-in`}
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            {/* Stage header */}
            <div 
              onClick={() => setExpanded(p => ({ ...p, [stage.id]: !p[stage.id] }))}
              className={`flex items-center gap-4 px-4 py-3 cursor-pointer ${
                isRunning ? "bg-amber-500/[0.02]" : "bg-transparent hover:bg-white/[0.01]"
              }`}
            >
              {/* Progress left accent bar */}
              <div className={`w-1 h-8 rounded-full shrink-0 transition-all duration-300 ${leftBarColor}`} />
              
              <span className="font-mono text-[10px] text-slate-500 font-bold w-6 shrink-0">{stage.num}</span>
              <span className="text-sm shrink-0" style={{ color: stage.color }}>{stage.icon}</span>
              
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold transition-colors select-none ${
                  isDone ? "text-slate-200" : isRunning ? "text-indigo-400" : "text-slate-500"
                }`}>
                  {stage.name}
                </div>
                {stage.subs && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {stage.subs.map(b => (
                      <Badge 
                        key={b} 
                        label={b} 
                        color={
                          subSt[b] === "done" ? "#10b981" : subSt[b] === "running" ? "#fbbf24" : "#64748b"
                        } 
                        pulse={subSt[b] === "running"} 
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {out && !out.error && (
                <span className="text-[9px] font-mono text-slate-500 mr-2 shrink-0">
                  {Object.keys(out).length} nodes
                </span>
              )}
              
              <StatusBadge status={st} />
              
              <ChevronDown 
                className={`w-3.5 h-3.5 text-slate-600 ml-2 transition-transform duration-250 ${
                  isExp ? "transform rotate-180 text-indigo-400" : ""
                }`} 
              />
            </div>

            {/* Stage output (Collapsible JSON / Logs) */}
            {isExp && (
              <div className="px-4 pb-3 border-t border-white/[0.03] bg-black/10 animate-fade-in">
                <div className="mt-3 bg-slate-950/80 border border-white/[0.03] rounded-lg p-3.5 max-h-52 overflow-y-auto">
                  {out && out.error ? (
                    <span className="text-rose-400 font-mono text-[11px]">Error: {out.error}</span>
                  ) : stage.id === "validation" ? (
                    <div className="space-y-3">
                      {validationResults.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className={`font-bold mt-0.5 ${r.ok ? "text-emerald-400" : "text-rose-400"}`}>
                            {r.ok ? "✓" : "✗"}
                          </span>
                          <div>
                            <span className="text-slate-200 font-semibold">{r.name}</span>
                            <span className="text-slate-500 text-[10px] block mt-0.5">{r.msg}</span>
                            {!r.ok && r.failures && r.failures.length > 0 && (
                              <ul className="pl-4 list-disc text-rose-400 text-[10px] mt-1.5 space-y-1">
                                {r.failures.map((f, fi) => <li key={fi}>{f}</li>)}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                      {repairAttempts > 0 && (
                        <div className="text-[10px] text-amber-400 font-mono flex items-center gap-1.5 pt-2 border-t border-dashed border-white/[0.06]">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Repairs attempted: {repairAttempts} / 3</span>
                        </div>
                      )}
                    </div>
                  ) : out ? (
                    <JsonTree data={out} />
                  ) : (
                    <span className="text-slate-600 font-mono text-[10px]">No outputs synthesized. Execute compiler launch.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Done summary status bar */}
      {done && metrics && (
        <div className="mt-4 p-3 bg-emerald-500/[0.03] border border-emerald-500/20 rounded-xl flex flex-wrap gap-x-6 gap-y-2 items-center shadow-lg animate-fade-in">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 font-mono tracking-wider uppercase select-none">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>✓ Compile Pipeline Completed</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">{metrics.stageMs.reduce((a,b)=>a+b,0)}ms latency</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {metrics.tables} tables &bull; {metrics.endpoints} endpoints &bull; {metrics.components} views
          </span>
          <span className={`text-[10px] font-mono ${metrics.warnings > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {metrics.warnings} warnings &bull; {metrics.repairs} repairs
          </span>
          <div className="flex-1" />
          <button 
            onClick={() => downloadJSON(null)} 
            className="flex items-center gap-1 px-3 py-1 bg-slate-900 border border-white/[0.06] text-indigo-400 hover:text-indigo-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer font-mono shadow-sm"
          >
            <FileJson className="w-3 h-3" />
            <span>ALL SCHEMAS</span>
          </button>
        </div>
      )}
    </div>
  );
}
