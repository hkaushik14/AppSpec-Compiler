import { useEffect, useRef } from "react";
import { PanelHeader } from "../../../components/ui/PanelHeader.jsx";
import { Badge, StatusBadge } from "../../../components/ui/Badge.jsx";
import { STAGES, SCHEMA_TABS } from "../../../constants/compiler.js";
import { 
  AlertCircle, 
  CheckCircle, 
  ListChecks, 
  Download, 
  FileJson,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react";

const repairColor = {
  system: "text-sky-400",
  meta: "text-slate-600",
  success: "text-emerald-400",
  warn: "text-amber-500 font-medium",
  error: "text-rose-400 font-semibold",
  repair: "text-amber-400 font-semibold",
  info: "text-slate-400"
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

  // Derived warning count
  const warnCount = repairLogs.filter(l => l.type === "warn" || l.type === "error").length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950/45 divide-y divide-white/[0.04]">
      
      {/* 1. Validation logs (Scrollable terminal log) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <PanelHeader 
          icon={<AlertCircle className="w-3.5 h-3.5" />} 
          title="Validation Console" 
          accent="#fb923c"
          right={done ? <Badge label={`${warnCount} events`} color={warnCount > 0 ? "#fb923c" : "#10b981"} /> : null}
        />
        
        <div 
          ref={repairRef} 
          className="flex-1 overflow-y-auto p-3 font-mono text-[10px] leading-relaxed space-y-1 bg-black/30 scrollbar-none"
        >
          {repairLogs.length === 0 && (
            <span className="text-slate-700 animate-pulse">$ awaiting schema validation checks...</span>
          )}
          {repairLogs.map((l) => (
            <div 
              key={l.id} 
              className={`flex items-start gap-1.5 animate-fade-in ${repairColor[l.type] || "text-slate-400"}`}
            >
              <span className="text-slate-700 text-[8px] mt-[1.5px] select-none shrink-0 font-medium">{l.t}</span>
              <span className="break-all text-left">{l.msg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Stepper Checklist (Vertical Checklist) */}
      <div className="shrink-0 flex flex-col bg-slate-950/20">
        <PanelHeader 
          icon={<ListChecks className="w-3.5 h-3.5" />} 
          title="Pipeline Checklist" 
          accent="#6366f1"
        />
        <div className="p-3.5 space-y-3 select-none">
          {STAGES.map((s) => {
            const st = statuses[s.id];
            const out = stageOutputs[s.id];
            const isDone = st === "done";
            const isRunning = st === "running";
            const isFailed = st === "error";

            let borderStyle = "border-white/[0.04] bg-slate-950/20";
            if (isDone) borderStyle = "border-emerald-500/20 bg-emerald-500/[0.02]";
            if (isRunning) borderStyle = "border-amber-500/20 bg-amber-500/[0.02]";
            if (isFailed) borderStyle = "border-red-500/20 bg-red-500/[0.02]";

            return (
              <div 
                key={s.id} 
                className={`flex items-center gap-3 p-2 border rounded-xl transition-all duration-300 ${borderStyle}`}
              >
                {/* Active/Completed Indicators */}
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isFailed ? (
                    <XCircle className="w-4 h-4 text-rose-400 animate-bounce" />
                  ) : isRunning ? (
                    <div className="w-4 h-4 rounded-full border border-amber-400 border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/10" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 select-none">
                    <span className={`text-[10px] font-semibold truncate ${
                      isDone ? "text-slate-200" : isRunning ? "text-indigo-300" : "text-slate-500"
                    }`}>
                      {s.name}
                    </span>
                    <span className="text-[8px] font-mono text-slate-600 font-bold shrink-0">{s.num}</span>
                  </div>
                  
                  {out && (
                    <div className="text-[8px] font-mono text-slate-500 mt-0.5 truncate uppercase tracking-wider">
                      {Object.keys(out).length} outputs synthesized
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Download Artifacts cards */}
      <div className="shrink-0 flex flex-col bg-slate-950/20">
        <PanelHeader 
          icon={<Download className="w-3.5 h-3.5" />} 
          title="Generated Artifacts" 
          accent="#10b981"
        />
        
        <div className="p-3 space-y-1.5 select-none">
          {SCHEMA_TABS.filter(t => t !== "Generated Code").map((t) => (
            <button 
              key={t} 
              onClick={() => downloadJSON(t)} 
              disabled={!done} 
              className={`w-full flex items-center justify-between p-2 border rounded-lg transition-all text-[10px] font-mono ${
                done 
                  ? "bg-slate-900/40 border-white/[0.04] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/20 cursor-pointer" 
                  : "bg-slate-950/10 border-transparent text-slate-700 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <FileJson className={`w-3.5 h-3.5 shrink-0 ${done ? "text-emerald-400/80" : "text-slate-700"}`} />
                <span className="truncate">{t.toLowerCase().replace(/ /g, "_")}.json</span>
              </div>
              <Download className="w-3 h-3 text-slate-600 shrink-0 hover:text-emerald-400" />
            </button>
          ))}
          
          <button 
            onClick={() => downloadJSON(null)} 
            disabled={!done} 
            className={`w-full flex items-center justify-between p-2 border font-bold rounded-lg transition-all text-[10px] font-mono mt-3 ${
              done 
                ? "bg-indigo-950/20 border-indigo-500/20 text-indigo-400 hover:bg-indigo-950/30 hover:border-indigo-400 cursor-pointer" 
                : "bg-slate-950/10 border-transparent text-slate-700 cursor-not-allowed"
            }`}
          >
            <span>all_schemas.json</span>
            <span className="text-[9px] uppercase tracking-wide">Download All</span>
          </button>
        </div>
      </div>
    </div>
  );
}
