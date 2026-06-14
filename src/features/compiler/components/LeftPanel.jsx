import { useEffect, useRef } from "react";
import { PanelHeader } from "../../../components/ui/PanelHeader.jsx";
import { Kbd } from "../../../components/ui/Kbd.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { SUGGESTIONS } from "../../../constants/compiler.js";

const logColor = {
  system: "#38bdf8",
  meta: "#334155",
  stage: "#818cf8",
  info: "#475569",
  success: "#34d399",
  warn: "#fb923c",
  error: "#f87171",
  repair: "#fbbf24"
};

export function LeftPanel({
  prompt,
  setPrompt,
  running,
  done,
  runPipeline,
  handleReset,
  assumptions,
  logs
}) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div style={{ borderRight:"1px solid #080f1e", display:"flex", flexDirection:"column", overflow:"hidden", background:"#030b18" }}>
      {/* Prompt editor */}
      <div style={{ flexShrink:0 }}>
        <PanelHeader icon="◎" title="PROMPT EDITOR" accent="#38bdf8"
          right={<span style={{ fontSize:9, color:"#1e3a5f" }}>{prompt.length} chars</span>}
        />
        <div style={{ padding:"10px 12px" }}>
          <textarea
            value={prompt}
            onChange={e=>setPrompt(e.target.value)}
            onKeyDown={e=>{ if((e.ctrlKey||e.key === 'Meta')&&e.key==="Enter") runPipeline(); }}
            placeholder={"Describe your app in plain English…\n\ne.g. A task manager with teams, tags,\ndue dates and email notifications."}
            rows={6}
            style={{
              width:"100%", background:"#020810", border:`1px solid ${running?"#38bdf855":"#0f172a"}`,
              borderRadius:6, padding:"10px 11px", fontFamily:"inherit", fontSize:11,
              color:"cbd5e1", resize:"none", outline:"none", lineHeight:1.65,
              transition:"border-color 0.2s",
            }}
            onFocus={e=>e.target.style.borderColor="#38bdf855"}
            onBlur={e=>{ if(!running) e.target.style.borderColor="#0f172a"; }}
          />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
            <span style={{ fontSize:9, color:"#1e3a5f" }}><Kbd>⌘↵</Kbd> run</span>
            {prompt && <button onClick={()=>setPrompt("")} style={{ fontSize:9, color:"#334155", background:"none", border:"none", cursor:"pointer" }}>clear</button>}
          </div>
        </div>

        {/* Suggestions */}
        {!prompt && (
          <div style={{ padding:"0 12px 10px" }}>
            <div style={{ fontSize:9, color:"#1e3a5f", letterSpacing:"0.1em", marginBottom:6 }}>QUICK START</div>
            {SUGGESTIONS.map((s,i)=>(
              <div key={i} onClick={()=>setPrompt(s)} style={{
                fontSize:10, color:"#334155", padding:"5px 8px", borderRadius:4, cursor:"pointer",
                border:"1px solid #080f1e", marginBottom:4, lineHeight:1.4,
                background:"#020810", transition:"all 0.15s",
              }}
                onMouseEnter={e=>{ e.currentTarget.style.color="#38bdf8"; e.currentTarget.style.borderColor="#38bdf830"; }}
                onMouseLeave={e=>{ e.currentTarget.style.color="#334155"; e.currentTarget.style.borderColor="#080f1e"; }}
              >
                › {s}
              </div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", gap:6, margin:"0 12px 12px" }}>
          <button
            onClick={runPipeline}
            disabled={running || !prompt.trim()}
            style={{
              flex:1, padding:"9px 0",
              background: running?"#0a1628": prompt.trim()?"#0c1e38":"#070d1a",
              color: running?"#38bdf8": prompt.trim()?"#38bdf8":"#1e3a5f",
              border:`1px solid ${running?"#38bdf840":prompt.trim()?"#38bdf830":"#0f172a"}`,
              borderRadius:6, fontFamily:"inherit", fontSize:11, fontWeight:600,
              letterSpacing:"0.08em", cursor:running||!prompt.trim()?"not-allowed":"pointer",
              transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}
          >
            {running ? <><span style={{ animation:"blink 1s infinite" }}>▶</span> COMPILING…</> : done ? "↺ RE-COMPILE" : "▶ COMPILE SCHEMA"}
          </button>
          <button
            onClick={handleReset}
            disabled={running}
            title="Clear prompt, schemas, logs, metrics, and generated code"
            style={{
              padding:"9px 12px",
              background:"#311018",
              color: running?"#7f1d1d":"#f87171",
              border:"1px solid #f8717140",
              borderRadius:6, fontFamily:"inherit", fontSize:10, fontWeight:600,
              letterSpacing:"0.06em", cursor:running?"not-allowed":"pointer",
              transition:"all 0.2s", flexShrink:0,
            }}
          >
            Reset ↺
          </button>
        </div>
      </div>

      {/* Assumptions */}
      <div style={{ flexShrink:0, borderTop:"1px solid #080f1e" }}>
        <PanelHeader icon="⊳" title="INFERRED ASSUMPTIONS" accent="#818cf8"
          right={assumptions.length ? <Badge label={`${assumptions.length} found`} color="#818cf8" /> : null}
        />
        <div style={{ padding:"8px 12px 10px", minHeight:60 }}>
          {assumptions.length ? (
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              {assumptions.map((a,i)=>(
                <div key={i} style={{ display:"grid", gridTemplateColumns:"110px 1fr", gap:6, animation:`slideDown 0.2s ease ${i*0.04}s both` }}>
                  <span style={{ fontSize:9, color:"#334155", paddingTop:1 }}>{a.key}</span>
                  <span style={{ fontSize:10, color:"#64748b" }}>{a.val} <span style={{ fontSize:8, color:"#1e3a5f" }}>[{a.src}]</span></span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize:10, color:"#1e3a5f" }}>awaiting pipeline run…</span>
          )}
        </div>
      </div>

      {/* Activity log */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", borderTop:"1px solid #080f1e", overflow:"hidden" }}>
        <PanelHeader icon="▸" title="EXECUTION LOG"
          right={<span style={{ fontSize:9, color:"#1e3a5f" }}>{logs.length} entries</span>}
        />
        <div ref={logRef} style={{ flex:1, overflowY:"auto", padding:"8px 10px", fontFamily:"inherit", fontSize:10, lineHeight:1.7 }}>
          {logs.length===0 && <span style={{ color:"#1e3a5f" }}>$ _</span>}
          {logs.map(l=>(
            <div key={l.id} style={{ display:"flex", gap:8, color:logColor[l.type]||"#334155", animation:"fadeIn 0.15s ease" }}>
              <span style={{ color:"#1e3a5f", flexShrink:0, fontSize:9, marginTop:1 }}>{l.t}</span>
              <span style={{ wordBreak:"break-all" }}>{l.msg}</span>
            </div>
          ))}
          {running && <span style={{ color:"#38bdf8", animation:"blink 1s infinite", fontSize:11 }}>▋</span>}
        </div>
      </div>
    </div>
  );
}
