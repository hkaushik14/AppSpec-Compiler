import { ArchGraph } from "../../../../components/ui/ArchGraph.jsx";
import { ARCH_NODES } from "../../../../constants/compiler.js";
import { Network, Server } from "lucide-react";

export function ArchTab({ done }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-5xl mx-auto w-full select-none">
      
      {/* Topology Graph Container */}
      <div className="glass-card rounded-xl border border-white/[0.04] p-4.5 shadow-xl relative overflow-hidden bg-slate-950/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.01] rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 tracking-widest uppercase font-mono mb-4">
          <Network className="w-3.5 h-3.5 text-indigo-400" />
          <span>Service Dependency Graph</span>
        </div>
        
        <div className="flex items-center justify-center p-2 rounded-lg bg-black/10 border border-white/[0.02]">
          <ArchGraph active={done} />
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {ARCH_NODES.map((n) => {
          const isClient = n.id === "client";
          const isGateway = n.id === "gateway";
          const isAuth = n.id === "auth";
          const isTask = n.id === "task";
          const isNotify = n.id === "notify";
          const isDb = n.id === "db";
          const isRedis = n.id === "redis";
          const isQueue = n.id === "queue";

          let desc = "Service Endpoint";
          if (isClient) desc = "Browser Single Page App";
          else if (isGateway) desc = "Express Gateway (Port 3000)";
          else if (isAuth) desc = "OAuth2 JWT Authenticator";
          else if (isTask) desc = "Core REST Microservice";
          else if (isNotify) desc = "Email & Push Broker";
          else if (isDb) desc = "PostgreSQL DB (Port 5432)";
          else if (isRedis) desc = "Memory Cache (Port 6379)";
          else if (isQueue) desc = "Bull MQ Task Executor";

          return (
            <div 
              key={n.id} 
              className={`glass-card rounded-xl border p-3 flex gap-3 items-center transition-all duration-300 ${
                done 
                  ? "border-white/[0.06] hover:border-white/[0.12]" 
                  : "border-transparent bg-slate-950/10 opacity-40"
              }`}
            >
              {/* Left Color Indicator Dot */}
              <div 
                className="w-1.5 h-8 rounded-full shrink-0 transition-all duration-300"
                style={{ 
                  backgroundColor: done ? n.color : "rgba(255,255,255,0.05)",
                  boxShadow: done ? `0 0 8px ${n.color}` : "none"
                }}
              />
              
              <div className="min-w-0">
                <div className={`text-xs font-bold font-display leading-tight truncate ${
                  done ? "text-slate-200" : "text-slate-600"
                }`}>
                  {n.label}
                </div>
                <div className="text-[9px] font-mono text-slate-500 mt-1 truncate">
                  {desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
