import { ARCH_NODES, ARCH_EDGES } from "../../constants/compiler.js";

export function ArchGraph({ active }) {
  const W = 560, H = 340;
  const activeNodeIds = active ? ARCH_NODES.map(n => n.id) : [];
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ fontFamily:"'JetBrains Mono',monospace", overflow:"visible" }}>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#1e3a5f" />
        </marker>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {ARCH_EDGES.map(([a,b],i) => {
        const A = ARCH_NODES.find(n=>n.id===a), B = ARCH_NODES.find(n=>n.id===b);
        const lit = active && activeNodeIds.includes(a) && activeNodeIds.includes(b);
        return (
          <line key={i}
            x1={A.x+60} y1={A.y+16} x2={B.x} y2={B.y+16}
            stroke={lit ? "#1e3a5f" : "#0f172a"}
            strokeWidth={lit ? 1.5 : 1}
            markerEnd="url(#arr)"
            style={{ transition:"all 0.4s" }}
          />
        );
      })}
      {ARCH_NODES.map(n => {
        const lit = active && activeNodeIds.includes(n.id);
        return (
          <g key={n.id} filter={lit ? "url(#glow)" : ""}>
            <rect x={n.x} y={n.y} width={110} height={32} rx={4}
              fill={lit ? `${n.color}18` : "#0a1628"}
              stroke={lit ? n.color : "#1e293b"}
              strokeWidth={lit ? 1 : 0.5}
              style={{ transition:"all 0.4s" }}
            />
            <text x={n.x+55} y={n.y+20} textAnchor="middle" fontSize={10}
              fill={lit ? n.color : "#334155"} style={{ transition:"all 0.4s" }}>
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
