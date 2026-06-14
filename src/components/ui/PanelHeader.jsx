import React from "react";

export function PanelHeader({ icon, title, right, accent = "#6366f1" }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.04] bg-slate-950/40 backdrop-blur-md shrink-0 select-none">
      {icon && (
        <span 
          className="text-[11px] font-semibold" 
          style={{ 
            color: accent,
            textShadow: `0 0 8px ${accent}40`
          }}
        >
          {icon}
        </span>
      )}
      <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase font-mono">
        {title}
      </span>
      {right && <div className="ml-auto flex items-center text-[9px] text-slate-500 font-mono">{right}</div>}
    </div>
  );
}
