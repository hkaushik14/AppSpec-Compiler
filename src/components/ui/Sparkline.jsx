import React from "react";

export function Sparkline({ values, color = "#38bdf8", height = 20 }) {
  if (!values || values.length < 2) return null;
  
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 70;
  const H = height;
  
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2; // Add 2px padding top/bottom
    return `${x},${y}`;
  });
  
  const pts = points.join(" ");
  const fillPts = `0,${H} ${pts} ${W},${H}`;
  const gradId = `spark-grad-${Math.floor(Math.random() * 1000000)}`;

  return (
    <svg width={W} height={H} className="overflow-visible select-none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#${gradId})`} />
      <polyline 
        points={pts} 
        fill="none" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <circle 
        cx={W} 
        cy={H - ((values[values.length - 1] - min) / range) * (H - 4) - 2} 
        r="1.5" 
        fill={color} 
        style={{ filter: `drop-shadow(0 0 2px ${color})` }}
      />
    </svg>
  );
}
