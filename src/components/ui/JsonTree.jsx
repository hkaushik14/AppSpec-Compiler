import { useState } from "react";

export function JsonTree({ data, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  
  if (data === null)             return <span className="text-slate-500 font-mono">null</span>;
  if (typeof data === "boolean") return <span className="text-pink-400 font-mono font-medium">{String(data)}</span>;
  if (typeof data === "number")  return <span className="text-amber-400 font-mono">{data}</span>;
  if (typeof data === "string")  return <span className="text-emerald-400 font-mono">"{data}"</span>;

  if (Array.isArray(data)) {
    if (!open) return (
      <span onClick={() => setOpen(true)} className="text-indigo-400 cursor-pointer hover:underline font-mono">
        [… {data.length}]
      </span>
    );
    return (
      <span className="font-mono">
        <span onClick={() => setOpen(false)} className="text-slate-600 cursor-pointer hover:text-slate-400">[</span>
        {data.map((v, i) => (
          <div key={i} className="pl-4 border-l border-white/[0.03] ml-1">
            <JsonTree data={v} depth={depth+1} />
            {i < data.length-1 && <span className="text-slate-700">,</span>}
          </div>
        ))}
        <span className="text-slate-600">]</span>
      </span>
    );
  }
  
  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (!open) return (
      <span onClick={() => setOpen(true)} className="text-indigo-400 cursor-pointer hover:underline font-mono">
        {"{…}"} <span className="text-slate-600 text-[9px]">({entries.length} keys)</span>
      </span>
    );
    return (
      <span className="font-mono">
        <span onClick={() => setOpen(false)} className="text-slate-600 cursor-pointer hover:text-slate-400">{"{"}</span>
        {entries.map(([k, v], i) => (
          <div key={k} className="pl-4 border-l border-white/[0.03] ml-1">
            <span className="text-sky-300">"{k}"</span>
            <span className="text-slate-600">: </span>
            <JsonTree data={v} depth={depth+1} />
            {i < entries.length-1 && <span className="text-slate-700">,</span>}
          </div>
        ))}
        <span className="text-slate-600">{"}"}</span>
      </span>
    );
  }
  
  return <span className="text-slate-300 font-mono">{String(data)}</span>;
}
