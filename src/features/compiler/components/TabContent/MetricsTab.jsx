import { MetricCard } from "../../../../components/ui/MetricCard.jsx";
import { JsonTree } from "../../../../components/ui/JsonTree.jsx";
import { STAGES, RUN_STATUS_COLORS } from "../../../../constants/compiler.js";
import { Activity, Flame, ShieldAlert, Zap } from "lucide-react";

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
    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-5xl mx-auto w-full select-none">
      
      {metrics ? (
        <>
          {/* Row 1 Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              label="Total Runtime" 
              value={elapsed ?? metrics.stageMs.reduce((a,b)=>a+b,0)} 
              unit="ms" 
              color="#38bdf8" 
              spark={metrics.spark} 
            />
            <MetricCard 
              label="API Calls" 
              value={apiCallCount} 
              color="#a78bfa" 
            />
            <MetricCard 
              label="Repair Attempts" 
              value={repairAttempts} 
              color="#fbbf24" 
            />
            <MetricCard 
              label="Validation Errors" 
              value={validationErrorCount} 
              color={validationErrorCount > 0 ? "#f87171" : "#10b981"} 
            />
          </div>
          
          {/* Row 2 Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              label="Stages Completed" 
              value={`${stagesCompleted}/4`} 
              color="#10b981" 
            />
            <MetricCard 
              label="Run Status" 
              value={runStatus || "—"} 
              color={RUN_STATUS_COLORS[runStatus] || "#94a3b8"} 
            />
            <MetricCard 
              label="Cache Hits" 
              value={cacheHits} 
              color="#f472b6" 
            />
            <MetricCard 
              label="Cost Savings" 
              value={`$${costSavings.toFixed(4)}`} 
              color="#10b981" 
            />
          </div>
          
          {/* Row 3 Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              label="DB Tables" 
              value={metrics.tables} 
              color="#38bdf8" 
            />
            <MetricCard 
              label="API Endpoints" 
              value={metrics.endpoints} 
              color="#818cf8" 
            />
            <MetricCard 
              label="UI Views" 
              value={metrics.components} 
              color="#10b981" 
            />
            <MetricCard 
              label="Total Tokens" 
              value={totalTokens.toLocaleString()} 
              color="#818cf8" 
            />
          </div>

          {/* Normalization report (Stage 4.5) */}
          {metrics.normalizationReport && (
            <div className="glass-card rounded-xl border border-indigo-500/20 bg-indigo-950/[0.02] p-4 space-y-4 shadow-xl">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-400 tracking-widest uppercase font-mono">
                <Zap className="w-3.5 h-3.5" />
                <span>Stage 04.5 &bull; Schema Normalization Report</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="Tables Merged" value={metrics.normalizationReport.tables_merged} color="#a78bfa" />
                <MetricCard label="Fields Renamed" value={metrics.normalizationReport.fields_renamed} color="#38bdf8" />
                <MetricCard label="Invalids Removed" value={metrics.normalizationReport.invalid_fields_removed} color="#fb923c" />
                <MetricCard label="Foreign Keys Added" value={metrics.normalizationReport.foreign_keys_added} color="#10b981" />
              </div>
              
              {metrics.normalizationMs > 0 && (
                <div className="text-[10px] font-mono text-slate-500">
                  Normalization duration: <span className="text-indigo-400 font-bold">{metrics.normalizationMs}ms</span>
                </div>
              )}
              
              <div className="bg-slate-950/80 border border-white/[0.03] rounded-lg p-3 max-h-40 overflow-y-auto">
                <JsonTree data={metrics.normalizationReport} />
              </div>
            </div>
          )}

          {/* Stage timing breakdown progress bars */}
          <div className="glass-card rounded-xl border border-white/[0.04] p-4 space-y-4 shadow-xl bg-slate-950/20">
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 tracking-widest uppercase font-mono">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Stage Latency Breakdown</span>
            </div>
            
            <div className="space-y-3.5">
              {STAGES.map((s, i) => {
                const ms = metrics.stageMs[i];
                const total = metrics.stageMs.reduce((a,b)=>a+b,0) + (metrics.normalizationMs || 0);
                const pct = total > 0 ? Math.round((ms/total)*100) : 0;
                
                return (
                  <div key={s.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-400 font-bold">{s.num} {s.name}</span>
                      <span style={{ color: s.color }} className="font-bold">
                        {ms}ms <span className="text-slate-600">({pct}%)</span>
                      </span>
                    </div>
                    
                    <div className="h-1.5 bg-slate-950 rounded-full border border-white/[0.02] overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 ease-out" 
                        style={{ 
                          width: `${pct}%`, 
                          backgroundColor: s.color,
                          boxShadow: `0 0 8px ${s.color}60`
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
              
              {/* Optional normalization row */}
              {metrics.normalizationMs > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-400 font-bold">04.5 Schema Normalization</span>
                    <span className="text-indigo-400 font-bold">
                      {metrics.normalizationMs}ms 
                      <span className="text-slate-600">
                        ({Math.round((metrics.normalizationMs / (metrics.stageMs.reduce((a,b)=>a+b,0) + metrics.normalizationMs)) * 100)}%)
                      </span>
                    </span>
                  </div>
                  
                  <div className="h-1.5 bg-slate-950 rounded-full border border-white/[0.02] overflow-hidden">
                    <div 
                      className="h-full bg-indigo-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_#818cf860]" 
                      style={{ 
                        width: `${Math.round((metrics.normalizationMs / (metrics.stageMs.reduce((a,b)=>a+b,0) + metrics.normalizationMs)) * 100)}%`
                      }} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Token breakdown */}
          <div className="glass-card rounded-xl border border-white/[0.04] p-4 space-y-4 shadow-xl bg-slate-950/20 font-mono">
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 tracking-widest uppercase font-mono">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Token Usage breakdown</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 select-none">
              {[
                { label: "Prompt Tokens", val: metrics.tokensIn, color: "text-sky-400" },
                { label: "Output Tokens", val: metrics.tokensOut, color: "text-indigo-400" },
                { 
                  label: "Ratio (Prompt : Output)", 
                  val: metrics.tokensIn > 0 ? `1 : ${(metrics.tokensOut / metrics.tokensIn).toFixed(1)}` : "—", 
                  color: "text-emerald-400" 
                }
              ].map((m) => (
                <div key={m.label} className="p-3 bg-slate-950 border border-white/[0.03] rounded-lg">
                  <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-2">{m.label}</div>
                  <div className={`text-sm font-extrabold ${m.color}`}>
                    {typeof m.val === "number" ? m.val.toLocaleString() : m.val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-slate-600 font-mono text-xs text-center py-20 bg-slate-950/10 border border-dashed border-white/[0.03] rounded-xl flex flex-col items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-slate-700 animate-pulse" />
          <span>No metrics data available. Please launch compiler run.</span>
        </div>
      )}
    </div>
  );
}
