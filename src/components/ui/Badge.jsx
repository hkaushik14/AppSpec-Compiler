import React from "react";

export function Badge({ label, color = "#3b82f6", pulse }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-wider uppercase border transition-all duration-300 select-none"
      style={{
        backgroundColor: `${color}0d`,
        color: color,
        borderColor: `${color}25`,
        boxShadow: pulse ? `0 0 10px -2px ${color}30` : "none",
        animation: pulse ? "blink 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none"
      }}
    >
      {pulse && (
        <span 
          className="w-1 h-1 rounded-full animate-pulse mr-0.5" 
          style={{ backgroundColor: color }} 
        />
      )}
      {label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const cfg = {
    idle:    { color:"#94a3b8", label:"IDLE" },
    queued:  { color:"#64748b", label:"QUEUED" },
    running: { color:"#fbbf24", label:"RUNNING", pulse:true },
    done:    { color:"#10b981", label:"DONE" },
    error:   { color:"#ef4444", label:"ERROR" },
    warn:    { color:"#f97316", label:"WARN" },
  };
  const c = cfg[status] || cfg.idle;
  return <Badge label={c.label} color={c.color} pulse={c.pulse} />;
}
