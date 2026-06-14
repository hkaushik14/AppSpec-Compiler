export function Kbd({ children }) {
  return (
    <span style={{ fontSize:9, padding:"1px 5px", borderRadius:3, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", color:"#64748b", fontFamily:"inherit" }}>
      {children}
    </span>
  );
}
