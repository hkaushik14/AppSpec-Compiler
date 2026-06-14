import { ARCH_NODES, ARCH_EDGES } from "../../constants/compiler.js";

export function ArchGraph({ active }) {
  const W = 560, H = 340;
  const activeNodeIds = active ? ARCH_NODES.map(n => n.id) : [];
  
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ fontFamily:"var(--font-mono)", overflow:"visible" }}>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#334155" />
        </marker>
        <marker id="arr-active" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#6366f1" />
        </marker>
        <filter id="glow-svg" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Connector Edges */}
      {ARCH_EDGES.map(([a,b], i) => {
        const A = ARCH_NODES.find(n=>n.id===a), B = ARCH_NODES.find(n=>n.id===b);
        const lit = active && activeNodeIds.includes(a) && activeNodeIds.includes(b);
        return (
          <line key={i}
            x1={A.x+110} y1={A.y+16} x2={B.x} y2={B.y+16}
            stroke={lit ? "url(#edge-grad)" : "rgba(255,255,255,0.04)"}
            strokeWidth={lit ? 1.5 : 1}
            markerEnd={lit ? "url(#arr-active)" : "url(#arr)"}
            style={{ transition:"all 0.4s" }}
          />
        );
      })}
      
      {/* Gradients */}
      <defs>
        <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      
      {/* Nodes */}
      {ARCH_NODES.map(n => {
        const lit = active && activeNodeIds.includes(n.id);
        return (
          <g key={n.id} filter={lit ? "url(#glow-svg)" : ""} style={{ cursor: "default" }}>
            {/* Inner Glow Border */}
            <rect x={n.x} y={n.y} width={110} height={32} rx={6}
              fill={lit ? `${n.color}0a` : "rgba(3, 7, 18, 0.6)"}
              stroke={lit ? n.color : "rgba(255, 255, 255, 0.08)"}
              strokeWidth={lit ? 1.5 : 1}
              style={{ transition:"all 0.4s" }}
            />
            <text x={n.x+55} y={n.y+20} textAnchor="middle" fontSize={9} fontWeight="600"
              fill={lit ? n.color : "#64748b"} style={{ transition:"all 0.4s", letterSpacing: "0.05em" }}>
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
