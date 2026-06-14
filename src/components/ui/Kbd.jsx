import React from "react";

export function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 text-[8px] font-mono font-bold text-slate-300 bg-slate-900/90 border border-white/[0.06] rounded shadow-[inset_0_1px_0px_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.5)] select-none">
      {children}
    </kbd>
  );
}
