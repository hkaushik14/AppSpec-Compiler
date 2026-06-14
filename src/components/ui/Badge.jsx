export function Badge({ label, color, pulse }) {
  return (
    <span style={{
      fontSize:9, padding:"2px 7px", borderRadius:3, letterSpacing:"0.07em",
      background:`${color}18`, color, border:`0.5px solid ${color}55`,
      display:"inline-flex", alignItems:"center", gap:4,
      animation: pulse ? "blink 1.1s ease-in-out infinite" : "none",
    }}>
      {pulse && <span style={{ width:5, height:5, borderRadius:"50%", background:color, display:"inline-block" }} />}
      {label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const cfg = {
    idle:    { color:"#334155", label:"IDLE" },
    queued:  { color:"#94a3b8", label:"QUEUED" },
    running: { color:"#fbbf24", label:"RUNNING", pulse:true },
    done:    { color:"#34d399", label:"DONE" },
    error:   { color:"#f87171", label:"ERROR" },
    warn:    { color:"#fb923c", label:"WARN" },
  };
  const c = cfg[status] || cfg.idle;
  return <Badge label={c.label} color={c.color} pulse={c.pulse} />;
}
