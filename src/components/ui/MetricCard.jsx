import React from "react";
import { Sparkline } from "./Sparkline.jsx";
import { motion } from "framer-motion";

export function MetricCard({ label, value, unit, delta, color = "#38bdf8", spark }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="relative overflow-hidden rounded-xl border border-white/[0.04] bg-slate-950/40 p-4 flex flex-col justify-between min-h-[96px] group backdrop-blur-md shadow-lg"
      style={{
        boxShadow: "inset 0 1px 0px rgba(255, 255, 255, 0.02)"
      }}
    >
      {/* Decorative top border glow */}
      <div 
        className="absolute top-0 left-0 right-0 h-[1.5px] opacity-40 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`
        }}
      />
      
      {/* Subtle radial light leak from top-right */}
      <div 
        className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
        style={{
          background: color,
          filter: "blur(20px)"
        }}
      />
      
      <div className="flex flex-col gap-1 z-10">
        <div className="text-[8px] font-bold text-slate-500 tracking-widest uppercase font-mono">
          {label}
        </div>
        
        <div className="flex items-baseline gap-1 mt-0.5">
          <span 
            className="text-xl font-extrabold tracking-tight font-display"
            style={{ 
              color: color,
              textShadow: `0 0 20px ${color}20`
            }}
          >
            {value}
          </span>
          {unit && (
            <span className="text-[9px] text-slate-500 font-mono">
              {unit}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-2 min-h-[20px] z-10">
        {delta != null ? (
          <span className={`text-[9px] font-semibold flex items-center gap-0.5 ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}%
          </span>
        ) : (
          <div />
        )}
        
        {spark && (
          <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-300">
            <Sparkline values={spark} color={color} height={20} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
