import { useState } from "react";

export function JsonTree({ data, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  
  if (data === null)             return <span style={{ color:"#94a3b8" }}>null</span>;
  if (typeof data === "boolean") return <span style={{ color:"#f472b6" }}>{String(data)}</span>;
  if (typeof data === "number")  return <span style={{ color:"#fbbf24" }}>{data}</span>;
  if (typeof data === "string")  return <span style={{ color:"#86efac" }}>"{data}"</span>;

  if (Array.isArray(data)) {
    if (!open) return <span onClick={() => setOpen(true)} style={{ color:"#38bdf8", cursor:"pointer" }}>[… {data.length}]</span>;
    return (
      <>
        <span onClick={() => setOpen(false)} style={{ color:"#475569", cursor:"pointer" }}>[</span>
        {data.map((v,i) => <div key={i} style={{ paddingLeft:14 }}><JsonTree data={v} depth={depth+1} />{i < data.length-1 && <span style={{ color:"#1e293b" }}>,</span>}</div>)}
        <span style={{ color:"#475569" }}>]</span>
      </>
    );
  }
  
  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (!open) return <span onClick={() => setOpen(true)} style={{ color:"#38bdf8", cursor:"pointer" }}>{"{…}"} <span style={{ color:"#1e3a5f", fontSize:9 }}>{entries.length}k</span></span>;
    return (
      <>
        <span onClick={() => setOpen(false)} style={{ color:"#475569", cursor:"pointer" }}>{"{"}</span>
        {entries.map(([k,v],i) => (
          <div key={k} style={{ paddingLeft:14 }}>
            <span style={{ color:"#7dd3fc" }}>"{k}"</span><span style={{ color:"#334155" }}>: </span>
            <JsonTree data={v} depth={depth+1} />
            {i < entries.length-1 && <span style={{ color:"#1e293b" }}>,</span>}
          </div>
        ))}
        <span style={{ color:"#475569" }}>{"}"}</span>
      </>
    );
  }
  
  return <span style={{ color:"#e2e8f0" }}>{String(data)}</span>;
}
