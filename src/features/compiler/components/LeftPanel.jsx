import { useEffect, useRef } from "react";
import { PanelHeader } from "../../../components/ui/PanelHeader.jsx";
import { Kbd } from "../../../components/ui/Kbd.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { SUGGESTIONS } from "../../../constants/compiler.js";
import { Edit3, Play, Trash2, HelpCircle, Terminal, Layers } from "lucide-react";

const logColor = {
  system: "text-sky-400",
  meta: "text-slate-600",
  stage: "text-indigo-400",
  info: "text-slate-400",
  success: "text-emerald-400",
  warn: "text-amber-500 font-medium",
  error: "text-rose-400 font-semibold",
  repair: "text-amber-400 font-semibold"
};

export function LeftPanel({
  prompt,
  setPrompt,
  running,
  done,
  runPipeline,
  handleReset,
  assumptions,
  logs
}) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950/45 divide-y divide-white/[0.04]">
      
      {/* Prompt editor panel section */}
      <div className="shrink-0 flex flex-col bg-slate-950/20">
        <PanelHeader 
          icon={<Edit3 className="w-3.5 h-3.5" />} 
          title="Prompt Editor" 
          accent="#38bdf8"
          right={<span className="font-mono text-[9px] text-slate-500">{prompt.length} chars</span>}
        />
        
        <div className="p-3">
          <textarea
            value={prompt}
            onChange={e=>setPrompt(e.target.value)}
            onKeyDown={e=>{ if((e.ctrlKey||e.metaKey)&&e.key==="Enter" && prompt.trim() && !running) runPipeline(); }}
            placeholder={"Describe your app in plain English..."}
            rows={5}
            className="w-full custom-textarea rounded-xl p-3 text-xs leading-relaxed outline-none resize-none font-sans"
            disabled={running}
          />
          
          <div className="flex justify-between items-center mt-2 px-1 select-none">
            <span className="text-[9px] text-slate-500 flex items-center gap-1 font-mono">
              <Kbd>Ctrl + Enter</Kbd> to compile
            </span>
            {prompt && !running && (
              <button 
                onClick={()=>setPrompt("")} 
                className="text-[9px] text-slate-500 hover:text-slate-300 hover:underline cursor-pointer font-mono"
              >
                clear
              </button>
            )}
          </div>
        </div>

        {/* Compile button container */}
        <div className="flex gap-2 px-3 pb-3">
          <button
            onClick={runPipeline}
            disabled={running || !prompt.trim()}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              running 
                ? "bg-slate-900 border border-white/[0.06] text-amber-400" 
                : "btn-primary"
            }`}
          >
            {running ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Compiling...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white/10" />
                {done ? "Re-Compile" : "Compile Schema"}
              </>
            )}
          </button>
          
          <button
            onClick={handleReset}
            disabled={running}
            title="Reset compiler dashboard"
            className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inferred Assumptions section */}
      <div className="shrink-0 flex flex-col bg-slate-950/20 max-h-[220px]">
        <PanelHeader 
          icon={<Layers className="w-3.5 h-3.5" />} 
          title="Inferred Assumptions" 
          accent="#818cf8"
          right={assumptions.length ? <Badge label={`${assumptions.length} tags`} color="#818cf8" /> : null}
        />
        <div className="p-3 overflow-y-auto max-h-[170px] select-none">
          {assumptions.length ? (
            <div className="flex flex-col gap-2">
              {assumptions.map((a,i)=>(
                <div 
                  key={i} 
                  className="grid grid-cols-[85px_1fr] gap-2 items-start text-[10px] leading-relaxed animate-fade-in"
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <span className="font-mono text-slate-500 font-semibold truncate" title={a.key}>{a.key}</span>
                  <span className="text-slate-300 text-left font-light break-words">
                    {a.val} <span className="text-indigo-400/60 text-[8px] font-mono">[{a.src}]</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-slate-600 font-mono">awaiting pipeline execution...</span>
          )}
        </div>
      </div>

      {/* Activity Terminal Console section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <PanelHeader 
          icon={<Terminal className="w-3.5 h-3.5" />} 
          title="Execution Logs" 
          accent="#34d399"
          right={<span className="font-mono text-[9px] text-slate-500">{logs.length} items</span>}
        />
        <div 
          ref={logRef} 
          className="flex-1 overflow-y-auto p-3 font-mono text-[10px] leading-relaxed space-y-1 bg-black/30 scrollbar-none"
        >
          {logs.length === 0 && (
            <span className="text-slate-700 animate-pulse">$ awaiting compilation launch...</span>
          )}
          {logs.map((l) => (
            <div 
              key={l.id} 
              className={`flex items-start gap-2 animate-fade-in ${logColor[l.type] || "text-slate-400"}`}
            >
              <span className="text-slate-700 text-[8px] font-medium mt-[1px] select-none shrink-0">{l.t}</span>
              <span className="break-all text-left">{l.msg}</span>
            </div>
          ))}
          {running && (
            <div className="flex items-center gap-1 mt-1 text-indigo-400 font-semibold select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping mr-1" />
              <span>executing pipeline task...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
