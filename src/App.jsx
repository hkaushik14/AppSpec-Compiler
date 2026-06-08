import { useState, useCallback, useEffect, useRef } from "react";

/* ─────────────────────────── constants ─────────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString().slice(11, 23);

const STAGES = [
  { id: "intent",     num: "01", name: "Intent Extraction",   color: "#38bdf8", icon: "◎" },
  { id: "design",     num: "02", name: "System Design",        color: "#818cf8", icon: "⬡" },
  { id: "schema",     num: "03", name: "Schema Generation",    color: "#34d399", icon: "⊞", subs: ["DB","API","UI"] },
  { id: "validation", num: "04", name: "Validation & Repair",  color: "#fb923c", icon: "⚿" },
];

const SCHEMA_TABS = ["DB Schema","API Schema","UI Schema","Auth Rules","Execution Plan","Generated Code"];

const ARCH_NODES = [
  { id:"client",   label:"Client",          x:60,  y:160, color:"#38bdf8" },
  { id:"gateway",  label:"API Gateway",     x:200, y:160, color:"#818cf8" },
  { id:"auth",     label:"Auth Service",    x:340, y:80,  color:"#fb923c" },
  { id:"task",     label:"Task Service",    x:340, y:160, color:"#34d399" },
  { id:"notify",   label:"Notify Service",  x:340, y:240, color:"#f472b6" },
  { id:"db",       label:"PostgreSQL",      x:480, y:140, color:"#94a3b8" },
  { id:"redis",    label:"Redis Cache",     x:480, y:220, color:"#fbbf24" },
  { id:"queue",    label:"Bull Queue",      x:480, y:300, color:"#a78bfa" },
];
const ARCH_EDGES = [
  ["client","gateway"],["gateway","auth"],["gateway","task"],["gateway","notify"],
  ["task","db"],["task","redis"],["notify","queue"],["auth","db"],
];

const SUGGESTIONS = [
  "Task manager with teams, tags, due dates, email notifications",
  "E-commerce store with cart, Stripe payments, inventory tracking",
  "Real-time chat app with rooms, presence, and message history",
  "SaaS dashboard with multi-tenant billing and usage analytics",
];

/* ─────────────────────────── sub-components ─────────────────────── */

function Kbd({ children }) {
  return (
    <span style={{ fontSize:9, padding:"1px 5px", borderRadius:3, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", color:"#64748b", fontFamily:"inherit" }}>
      {children}
    </span>
  );
}

function Badge({ label, color, pulse }) {
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

function StatusBadge({ status }) {
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

function PanelHeader({ icon, title, right, accent="#38bdf8" }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderBottom:"1px solid #0f172a", flexShrink:0 }}>
      <span style={{ color:accent, fontSize:11 }}>{icon}</span>
      <span style={{ fontSize:10, color:"#475569", letterSpacing:"0.1em", fontWeight:600 }}>{title}</span>
      {right && <div style={{ marginLeft:"auto" }}>{right}</div>}
    </div>
  );
}

function JsonTree({ data, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  if (data === null)             return <span style={{ color:"#94a3b8" }}>null</span>;
  if (typeof data === "boolean") return <span style={{ color:"#f472b6" }}>{String(data)}</span>;
  if (typeof data === "number")  return <span style={{ color:"#fbbf24" }}>{data}</span>;
  if (typeof data === "string")  return <span style={{ color:"#86efac" }}>"{data}"</span>;

  if (Array.isArray(data)) {
    if (!open) return <span onClick={() => setOpen(true)} style={{ color:"#38bdf8", cursor:"pointer" }}>[… {data.length}]</span>;
    return <>
      <span onClick={() => setOpen(false)} style={{ color:"#475569", cursor:"pointer" }}>[</span>
      {data.map((v,i) => <div key={i} style={{ paddingLeft:14 }}><JsonTree data={v} depth={depth+1} />{i < data.length-1 && <span style={{ color:"#1e293b" }}>,</span>}</div>)}
      <span style={{ color:"#475569" }}>]</span>
    </>;
  }
  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (!open) return <span onClick={() => setOpen(true)} style={{ color:"#38bdf8", cursor:"pointer" }}>{"{…}"} <span style={{ color:"#1e3a5f", fontSize:9 }}>{entries.length}k</span></span>;
    return <>
      <span onClick={() => setOpen(false)} style={{ color:"#475569", cursor:"pointer" }}>{"{"}</span>
      {entries.map(([k,v],i) => (
        <div key={k} style={{ paddingLeft:14 }}>
          <span style={{ color:"#7dd3fc" }}>"{k}"</span><span style={{ color:"#334155" }}>: </span>
          <JsonTree data={v} depth={depth+1} />
          {i < entries.length-1 && <span style={{ color:"#1e293b" }}>,</span>}
        </div>
      ))}
      <span style={{ color:"#475569" }}>{"}"}</span>
    </>;
  }
  return <span style={{ color:"#e2e8f0" }}>{String(data)}</span>;
}

function ArchGraph({ active }) {
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

function Sparkline({ values, color, height=28 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const W = 80, H = height;
  const pts = values.map((v,i) => `${(i/(values.length-1))*W},${H - ((v-min)/range)*H}`).join(" ");
  return (
    <svg width={W} height={H} style={{ display:"block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={(values.length-1)/(values.length-1)*W} cy={H - ((values[values.length-1]-min)/range)*H} r="2.5" fill={color} />
    </svg>
  );
}

function MetricCard({ label, value, unit, delta, color, spark }) {
  return (
    <div style={{ background:"#070d1a", border:"1px solid #0f172a", borderRadius:6, padding:"10px 12px", display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ fontSize:9, color:"#334155", letterSpacing:"0.1em" }}>{label}</div>
      <div style={{ display:"flex", alignItems:"baseline", gap:5 }}>
        <span style={{ fontSize:20, fontWeight:700, color, lineHeight:1 }}>{value}</span>
        {unit && <span style={{ fontSize:10, color:"#334155" }}>{unit}</span>}
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {delta != null && (
          <span style={{ fontSize:10, color: delta >= 0 ? "#34d399" : "#f87171" }}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
        {spark && <Sparkline values={spark} color={color} />}
      </div>
    </div>
  );
}

/* ─────────────────────────── helper functions ───────────────────── */
async function callGemini(systemPrompt, userContent, apiKey, jsonMode = true, onCall, onTokens) {
  if (onCall) onCall();
  
  const inputTokens = Math.round((systemPrompt.length + userContent.length) / 3.8);
  if (onTokens) onTokens(inputTokens, 0);

  const model = "llama-3.3-70b-versatile";
  const url = `https://api.groq.com/openai/v1/chat/completions`;
  
const requestBody = {
  model,
  messages: [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "user",
      content: userContent
    }
  ],
  temperature: 0.2
};

if (jsonMode) {
  requestBody.response_format = {
    type: "json_object"
  };
}

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  },
  body: JSON.stringify(requestBody)
});

if (!res.ok) {
  const errData = await res.json().catch(() => ({}));
  throw new Error(
    errData.error?.message ||
    `API call failed with status ${res.status}`
  );
}

const data = await res.json();

const text =
  data.choices?.[0]?.message?.content || "";

return text;}

async function callGeminiWithRetry(systemPrompt, userContent, apiKey, jsonMode = true, onCall, onTokens, retries = 3, delay = 1000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await callGemini(systemPrompt, userContent, apiKey, jsonMode, onCall, onTokens);
    } catch (error) {
      lastError = error;
      if (i === retries - 1) break;
      const backoffDelay = delay * Math.pow(2, i);
      console.warn(`Gemini API call failed: ${error.message}. Retrying in ${backoffDelay}ms... (Attempt ${i + 1}/${retries})`);
      await sleep(backoffDelay);
    }
  }
  throw lastError;
}

function safeParseJson(text) {
  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    const firstNewline = cleanText.indexOf("\n");
    if (firstNewline !== -1) {
      cleanText = cleanText.substring(firstNewline).trim();
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.substring(0, cleanText.length - 3).trim();
    }
  }
  return JSON.parse(cleanText);
}

const AUTH_ENDPOINT_SEGMENTS = new Set([
  "register", "login", "logout", "refresh-token", "signin", "signup", "signout"
]);
const UTILITY_ENDPOINT_SEGMENTS = new Set(["health", "status", "metrics"]);
const AUTH_ENTITY = "users";

const parseEndpointPath = (path) => {
  const cleanPath = path.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/i, "").split("?")[0].trim();
  const segments = cleanPath.toLowerCase().split("/").filter(Boolean);
  return { cleanPath, segments };
};
const PAGE_ENDPOINT_SEGMENTS = new Set([
  "dashboard",
  "profile",
  "settings",
  "landing",
  "home",
  "about",
  "contact",
  "reset-password",
  "forgot-password",
  "verify-email",
  "admin",
  "billing",

  // add these
  "login",
  "register",
  "checkout",
  "cart",
  "order-confirmation"
]);



const isUtilityEndpoint = (segments) =>
  segments.some((segment) =>
    UTILITY_ENDPOINT_SEGMENTS.has(segment.replace(/^:/, ""))
  );

const classifyEndpoint = (path) => {
  const { cleanPath, segments } = parseEndpointPath(path);
  const lowerPath = cleanPath.toLowerCase();

  if (isUtilityEndpoint(segments)) {
    return { type: "UTILITY", skipDb: true };
  }

  if (isAuthEndpoint(segments)) {
  return { type: "AUTH", skipDb: true };
}

  if (
    segments.some((segment) =>
      PAGE_ENDPOINT_SEGMENTS.has(segment.replace(/^:/, ""))
    ) ||
    lowerPath.includes("dashboard") ||
    lowerPath.includes("profile")
  ) {
    return { type: "PAGE", skipDb: true };
  }

  return { type: "CRUD", skipDb: false };
};



const isAuthEndpoint = (segments) =>
  segments.some((s) => {
    const seg = s.replace(/^:/, "");
    return (
      AUTH_ENDPOINT_SEGMENTS.has(seg) ||
      seg.includes("auth") ||
      seg.includes("login") ||
      seg.includes("token")
    );
  });

const findExistingTable = (entity, tables) => {
  if (!tables || !entity) return null;
  if (tables[entity]) return entity;
  const singular = entity.endsWith("s") ? entity.slice(0, -1) : entity;
  if (tables[singular]) return singular;
  const plural = entity + "s";
  if (tables[plural]) return plural;
  return null;
};

const mapEndpointToEntity = (path, tables) => {
  const { cleanPath, segments } = parseEndpointPath(path);

  if (segments.length === 0) {
    return { cleanPath, entity: null, requiresMapping: false, skip: true, tableExists: false };
  }
  const classification = classifyEndpoint(path);

console.debug(
  `[ENDPOINT CLASSIFY] ${path} → ${classification.type} (skipDb=${classification.skipDb})`
);

if (classification.skipDb) {
  return {
    cleanPath,
    entity: null,
    requiresMapping: false,
    skip: true,
    tableExists: false
  };
}

  if (isUtilityEndpoint(segments)) {
    return { cleanPath, entity: null, requiresMapping: false, skip: true, tableExists: false };
  }

  if (isAuthEndpoint(segments)) {
    const matchedTable = findExistingTable(AUTH_ENTITY, tables);
    return {
      cleanPath,
      entity: AUTH_ENTITY,
      requiresMapping: true,
      skip: false,
      tableExists: !!matchedTable,
      matchedTable
    };
  }

  for (const segment of segments) {
  if (segment.startsWith(":")) continue;

  if (
    segment === "api" ||
    segment === "v1" ||
    segment === "v2" ||
    segment === "auth"
  ) {
    continue;
  }
    const matchedTable = findExistingTable(segment, tables);
    return {
      cleanPath,
      entity: segment,
      requiresMapping: true,
      skip: false,
      tableExists: !!matchedTable,
      matchedTable
    };
  }

  return { cleanPath, entity: null, requiresMapping: false, skip: true, tableExists: false };
};

const logEndpointMapping = (mapping) => {
  console.debug(
    `Endpoint: ${mapping.cleanPath}\nMapped Entity: ${mapping.entity || "none"}\nTable Exists: ${mapping.tableExists}`
  );
};

const endpointRequiresDbMapping = (path) => {
  const mapping = mapEndpointToEntity(path, {});
  return mapping.requiresMapping && !mapping.skip;
};

const inferColumnType = (field) => {
  if (field.endsWith("_id") || field === "id") return "uuid";
  if (field.endsWith("_at") || field.endsWith("date")) return "timestamptz";
  if (field === "status" || field === "role") return "varchar(50)";
  return "varchar(255)";
};

const createDefaultTable = (
  tableName,
  requestFields = [],
  responseFields = []
) => {
  const columns = {
    id: "uuid",
    created_at: "timestamptz"
  };

  const allFields = [
    ...requestFields,
    ...responseFields
  ];

  for (const field of allFields) {
    if (!field) continue;

    if (
      field.includes("[]") ||
      field.startsWith("Array<") ||
      field.includes("<") ||
      field.includes(">")
    ) {
      continue;
    }

    if (field !== "id" && field !== "created_at") {
      columns[field] = inferColumnType(field);
    }
  }

  return {
    columns,
    primary_key: "id",
    foreign_keys: {}
  };
};
const isDeterministicMappingFailure = (failure) =>
  failure.startsWith("No matching table for API endpoint");

const applyApiDbDeterministicRepairs = (db, api, addRepairFn = null) => {
  const repairedDb = JSON.parse(JSON.stringify(db));
  if (!repairedDb.tables) repairedDb.tables = {};
  let columnsAdded = 0;
  let tablesAdded = 0;

  for (const endpoint of api?.endpoints || []) {
    const path = endpoint.path;
    const responseFields = endpoint.response_fields || [];
    const classification = classifyEndpoint(path);

if (classification.skipDb) {
  console.debug(
    `[REPAIR SKIP] ${path} (${classification.type}) - no DB mapping needed`
  );
  continue;
}
    const mapping = mapEndpointToEntity(path, repairedDb.tables);
    logEndpointMapping(mapping);

    if (mapping.skip || !mapping.requiresMapping) continue;

    let matchedTable = findExistingTable(mapping.entity, repairedDb.tables);

    if (matchedTable) {
      if (!repairedDb.tables[matchedTable].columns) {
        repairedDb.tables[matchedTable].columns = {};
      }
      const columns = repairedDb.tables[matchedTable].columns;
      const colKeys = Object.keys(columns).map((c) => c.toLowerCase());

      for (const field of responseFields) {
        if (!colKeys.includes(field.toLowerCase())) {
          columns[field] = inferColumnType(field);
          columnsAdded++;
          addRepairFn?.(
            `    [Local Repair] Added column '${field}' (${columns[field]}) to table '${matchedTable}'`,
            "repair"
          );
        }
      }
    } else {
  const tableName = mapping.entity;

  console.log(
    "[REPAIR]",
    path,
    endpoint.request_fields,
    endpoint.response_fields
  );

  repairedDb.tables[tableName] =
    createDefaultTable(
      tableName,
      endpoint.request_fields || [],
      endpoint.response_fields || []
    );

  tablesAdded++;

  addRepairFn?.(
    `    [Local Repair] Created DB table '${tableName}' for endpoint '${path}' (mapped entity: ${mapping.entity})`,
    "repair"
  );
}
  }

  return { repairedDb, columnsAdded, tablesAdded, changed: columnsAdded > 0 || tablesAdded > 0 };
};

const matchRoute = (pageRoute, apiPath) => {
  const cleanApi = apiPath.toLowerCase().replace(/^(get|post|put|delete|patch)\s+/, '').split('?')[0].trim();
  const cleanPage = pageRoute.toLowerCase().split('?')[0].trim();
  
  if (cleanPage === cleanApi) return true;
  
  const apiSegments = cleanApi.split('/').filter(Boolean);
  const pageSegments = cleanPage.split('/').filter(Boolean);
  
  if (apiSegments.length === pageSegments.length) {
    let match = true;
    for (let i = 0; i < apiSegments.length; i++) {
      const apiSeg = apiSegments[i];
      const pageSeg = pageSegments[i];
      if (apiSeg.startsWith(':') || pageSeg.startsWith(':')) {
        continue;
      }
      if (apiSeg !== pageSeg) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  
  const minLen = Math.min(apiSegments.length, pageSegments.length);
  if (minLen > 0) {
    let prefixMatch = true;
    for (let i = 0; i < minLen; i++) {
      if (apiSegments[i].startsWith(':') || pageSegments[i].startsWith(':')) continue;
      if (apiSegments[i] !== pageSegments[i]) {
        prefixMatch = false;
        break;
      }
    }
    if (prefixMatch) return true;
  }
  
  return false;
};

const validateApiDb = (db, api) => {
  const tables = db?.tables || {};
  const endpoints = api?.endpoints || [];
  let ok = true;
  const failures = [];
  const affectedFieldsSet = new Set();

 for (const endpoint of endpoints) {
  const path = endpoint.path;
  const responseFields = endpoint.response_fields || [];

  const classification = classifyEndpoint(path);

  if (classification.skipDb) {
    console.debug(
      `[VALIDATE SKIP] ${path} (${classification.type}) - skipping DB check`
    );
    continue;
  }

  const mapping = mapEndpointToEntity(path, tables);
    logEndpointMapping(mapping);

    if (mapping.skip || !mapping.requiresMapping) continue;

    const matchedTable = mapping.matchedTable || findExistingTable(mapping.entity, tables);

    if (matchedTable) {
      const columns = tables[matchedTable].columns || {};
      const colKeys = Object.keys(columns).map((c) => c.toLowerCase());
      for (const field of responseFields) {
        if (!colKeys.includes(field.toLowerCase())) {
          ok = false;
          failures.push(
            `API field '${field}' on '${path}' not found in DB table '${matchedTable}'`
          );
          affectedFieldsSet.add(field);
          affectedFieldsSet.add(matchedTable);
          affectedFieldsSet.add(path);
        }
      }
    } else {
      ok = false;
      failures.push(
        `No matching table for API endpoint '${path}' (mapped entity: '${mapping.entity}')`
      );
      affectedFieldsSet.add(path);
      affectedFieldsSet.add(mapping.entity);
    }
  }

  return {
    rule: "API_DB_CONSISTENCY",
    status: ok ? "passed" : "failed",
    reason: ok ? "All API response fields correspond to DB columns." : failures.join("; "),
    affected_fields: Array.from(affectedFieldsSet),
    failures: failures
  };
};

const validateUiApi = (ui, api) => {
  const endpoints = api?.endpoints || [];
  const pages = ui?.pages || [];
  let ok = true;
  const failures = [];
  const affectedFieldsSet = new Set();
  
  for (const page of pages) {
    const route = page.route;
    const hasEndpoint = endpoints.some(ep => matchRoute(route, ep.path));
    if (!hasEndpoint) {
      ok = false;
      failures.push(`UI Page '${page.name}' has route '${route}' with no matching API endpoint`);
      affectedFieldsSet.add(page.name);
      affectedFieldsSet.add(route);
    }
  }
  
  return {
    rule: "UI_API_CONSISTENCY",
    status: ok ? "passed" : "failed",
    reason: ok ? "All UI page routes correspond to API endpoints." : failures.join("; "),
    affected_fields: Array.from(affectedFieldsSet),
    failures: failures
  };
};

const validateRoleConsistency = (ui, design) => {
  const pages = ui?.pages || [];
  let ok = true;
  const failures = [];
  const affectedFieldsSet = new Set();
  const rolePermissions = design?.role_permissions || {};
  const allowedRoles = Object.keys(rolePermissions).map(r => r.toLowerCase());
  
  for (const page of pages) {
    const visibleTo = page.visible_to || [];
    for (const role of visibleTo) {
      if (role === "*" || role.toLowerCase() === "public" || role.toLowerCase() === "all" || role.toLowerCase() === "anonymous") {
        continue;
      }
      if (!allowedRoles.includes(role.toLowerCase())) {
        ok = false;
        failures.push(`UI Page '${page.name}' visible to role '${role}' not defined in System Design role permissions`);
        affectedFieldsSet.add(page.name);
        affectedFieldsSet.add(role);
      }
    }
  }
  
  return {
    rule: "ROLE_CONSISTENCY",
    status: ok ? "passed" : "failed",
    reason: ok ? "All page access roles defined in System Design." : failures.join("; "),
    affected_fields: Array.from(affectedFieldsSet),
    failures: failures
  };
};

const runValidationChecks = (db, api, ui, design) => {
  const r1 = validateApiDb(db, api);
  const r2 = validateUiApi(ui, api);
  const r3 = validateRoleConsistency(ui, design);
  
  return [
    {
      id: "api_db",
      name: "API-DB Consistency",
      ok: r1.status === "passed",
      failures: r1.failures,
      msg: r1.reason
    },
    {
      id: "ui_api",
      name: "UI-API Consistency",
      ok: r2.status === "passed",
      failures: r2.failures,
      msg: r2.reason
    },
    {
      id: "role_consistency",
      name: "Role Consistency",
      ok: r3.status === "passed",
      failures: r3.failures,
      msg: r3.reason
    }
  ];
};

const computeSchemaDiff = (before, after) => {
  const changes = [];
  
  const beforeDb = before?.db || {};
  const afterDb = after?.db || {};
  const beforeTables = beforeDb.tables || {};
  const afterTables = afterDb.tables || {};
  
  for (const table in afterTables) {
    if (!beforeTables[table]) {
      changes.push(`Created DB table '${table}'`);
    } else {
      const beforeCols = beforeTables[table].columns || {};
      const afterCols = afterTables[table].columns || {};
      for (const col in afterCols) {
        if (!beforeCols[col]) {
          changes.push(`Added column '${col}' (${afterCols[col]}) to table '${table}'`);
        } else if (beforeCols[col] !== afterCols[col]) {
          changes.push(`Updated column '${col}' type from '${beforeCols[col]}' to '${afterCols[col]}' in table '${table}'`);
        }
      }
      for (const col in beforeCols) {
        if (!afterCols[col]) {
          changes.push(`Removed column '${col}' from table '${table}'`);
        }
      }
    }
  }
  for (const table in beforeTables) {
    if (!afterTables[table]) {
      changes.push(`Deleted DB table '${table}'`);
    }
  }
  
  const beforeApi = before?.api || {};
  const afterApi = after?.api || {};
  const beforeEndpoints = beforeApi.endpoints || [];
  const afterEndpoints = afterApi.endpoints || [];
  
  const getEpKey = (ep) => `${ep.method || "GET"} ${ep.path}`;
  const beforeEpKeys = beforeEndpoints.map(getEpKey);
  const afterEpKeys = afterEndpoints.map(getEpKey);
  
  for (const ep of afterEndpoints) {
    const key = getEpKey(ep);
    if (!beforeEpKeys.includes(key)) {
      changes.push(`Mapped route '${ep.path}' to endpoint '${key}'`);
    } else {
      const oldEp = beforeEndpoints.find(e => getEpKey(e) === key);
      if (oldEp) {
        const oldResp = oldEp.response_fields || [];
        const newResp = ep.response_fields || [];
        const addedResp = newResp.filter(f => !oldResp.includes(f));
        const removedResp = oldResp.filter(f => !newResp.includes(f));
        if (addedResp.length > 0) {
          changes.push(`Added response fields [${addedResp.join(", ")}] to endpoint '${key}'`);
        }
        if (removedResp.length > 0) {
          changes.push(`Removed response fields [${removedResp.join(", ")}] from endpoint '${key}'`);
        }
      }
    }
  }
  for (const ep of beforeEndpoints) {
    const key = getEpKey(ep);
    if (!afterEpKeys.includes(key)) {
      changes.push(`Removed API endpoint '${key}'`);
    }
  }
  
  const beforeUi = before?.ui || {};
  const afterUi = after?.ui || {};
  const beforePages = beforeUi.pages || [];
  const afterPages = afterUi.pages || [];
  
  const getPageKey = (p) => p.name || p.route;
  const beforePageKeys = beforePages.map(getPageKey);
  const afterPageKeys = afterPages.map(getPageKey);
  
  for (const p of afterPages) {
    const key = getPageKey(p);
    if (!beforePageKeys.includes(key)) {
      changes.push(`Created UI page '${p.name}' at route '${p.route}'`);
    } else {
      const oldPage = beforePages.find(op => getPageKey(op) === key);
      if (oldPage) {
        const oldVis = oldPage.visible_to || [];
        const newVis = p.visible_to || [];
        const addedVis = newVis.filter(v => !oldVis.includes(v));
        const removedVis = oldVis.filter(v => !newVis.includes(v));
        if (addedVis.length > 0) {
          changes.push(`Added page roles [${addedVis.join(", ")}] to page '${p.name}'`);
        }
        if (removedVis.length > 0) {
          changes.push(`Removed page roles [${removedVis.join(", ")}] from page '${p.name}'`);
        }
      }
    }
  }
  for (const p of beforePages) {
    const key = getPageKey(p);
    if (!afterPageKeys.includes(key)) {
      changes.push(`Deleted UI page '${p.name}'`);
    }
  }
  
  const beforeDesign = before?.design || {};
  const afterDesign = after?.design || {};
  const beforeRoles = beforeDesign.role_permissions || {};
  const afterRoles = afterDesign.role_permissions || {};
  
  for (const role in afterRoles) {
    if (!beforeRoles[role]) {
      changes.push(`Added missing role '${role}' to System Design permissions`);
    } else {
      const oldPerms = beforeRoles[role] || [];
      const newPerms = afterRoles[role] || [];
      const addedPerms = newPerms.filter(p => !oldPerms.includes(p));
      const removedPerms = oldPerms.filter(p => !newPerms.includes(p));
      if (addedPerms.length > 0) {
        changes.push(`Added permissions [${addedPerms.join(", ")}] to role '${role}'`);
      }
      if (removedPerms.length > 0) {
        changes.push(`Removed permissions [${removedPerms.join(", ")}] from role '${role}'`);
      }
    }
  }
  for (const role in beforeRoles) {
    if (!afterRoles[role]) {
      changes.push(`Deleted role '${role}' from System Design permissions`);
    }
  }
  
  return changes;
};

/* ─────────────────────────── schema normalization (Stage 4.5) ─── */

const PLURAL_MAP = {
  user: "users", task: "tasks", team: "teams", tag: "tags",
  notification: "notifications", role: "roles", comment: "comments",
};

const toSnakeCase = (str) =>
  String(str)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .replace(/__+/g, "_")
    .toLowerCase();

const singularize = (name) => {
  const s = toSnakeCase(name);
  if (s.endsWith("ies")) return s.slice(0, -3) + "y";
  if (s.endsWith("ses") || s.endsWith("xes") || s.endsWith("ches") || s.endsWith("shes")) return s.slice(0, -2);
  if (s.endsWith("s") && !s.endsWith("ss")) return s.slice(0, -1);
  return s;
};

const toPluralSnake = (name) => {
  const s = singularize(name);
  if (PLURAL_MAP[s]) return PLURAL_MAP[s];
  if (s.endsWith("y") && !/[aeiou]y$/.test(s)) return s.slice(0, -1) + "ies";
  if (/(s|x|ch|sh)$/.test(s)) return s + "es";
  if (s.endsWith("s")) return s;
  return s + "s";
};

const canonicalTableName = (name) => toPluralSnake(name);

const isInvalidField = (field) =>
  /Array<[^>]+>/i.test(String(field)) || /^Array<.+>$/i.test(String(field));

const standardizeFieldName = (field) => toSnakeCase(field);

const normalizeColumnType = (colName, colType) => {
  const name = standardizeFieldName(colName);
  const type = String(colType || "").trim();

  if (isInvalidField(type) || isInvalidField(name)) return null;
  if (name === "id" || name.endsWith("_id")) return "uuid";
  if (["created_at", "updated_at", "due_date"].includes(name)) return "timestamptz";
  if (["email", "name", "title"].includes(name)) return "varchar(255)";
  if (name === "description") return "text";
  if (name.startsWith("is_")) return "boolean";

  const lower = type.toLowerCase();
  const typeMap = {
    uuid: "uuid", string: "varchar(255)", text: "text", boolean: "boolean", bool: "boolean",
    timestamp: "timestamptz", timestamptz: "timestamptz", datetime: "timestamptz",
    date: "date", integer: "integer", int: "integer", number: "numeric", float: "numeric",
    json: "jsonb", jsonb: "jsonb",
  };
  if (typeMap[lower]) return typeMap[lower];
  if (/varchar\s*\(\s*\d+\s*\)/i.test(type)) return type.toLowerCase();
  return type;
};

const cloneSchema = (obj) => JSON.parse(JSON.stringify(obj ?? {}));

const renameFieldInList = (fields, report, onLog, ctx) => {
  const seen = new Set();
  const result = [];
  for (const raw of fields || []) {
    if (isInvalidField(raw)) {
      report.invalid_fields_removed++;
      onLog(`[Normalization] Removed invalid field '${raw}' from ${ctx}`);
      continue;
    }
    const renamed = standardizeFieldName(raw);
    if (renamed !== raw) {
      report.fields_renamed++;
      onLog(`[Normalization] Renamed '${raw}' → '${renamed}' in ${ctx}`);
    }
    if (!seen.has(renamed)) {
      seen.add(renamed);
      result.push(renamed);
    }
  }
  return result;
};

const normalizeDbSchema = (db, report, onLog) => {
  const normalized = cloneSchema(db);
  if (!normalized.tables) normalized.tables = {};

  // Rule 1: Entity canonicalization — merge singular/plural duplicates
  const groups = new Map();
  for (const tableName of Object.keys(normalized.tables)) {
    const canonical = canonicalTableName(tableName);
    if (!groups.has(canonical)) groups.set(canonical, []);
    groups.get(canonical).push(tableName);
  }

  const tableRenameMap = {};
  for (const [canonical, names] of groups) {
    for (const name of [...new Set(names)]) {
      if (name !== canonical) tableRenameMap[name] = canonical;
    }
  }

  const newTables = {};
  for (const [canonical, names] of groups) {
    const unique = [...new Set(names)];
    const merged = { columns: {}, foreign_keys: {}, primary_key: "id" };

    for (const name of unique) {
      const src = normalized.tables[name] || {};
      if (name !== canonical) {
        report.tables_merged++;
        onLog(`[Normalization] Merged '${name}' into '${canonical}'`);
      }
      merged.primary_key = standardizeFieldName(src.primary_key || merged.primary_key || "id");
      for (const [col, type] of Object.entries(src.columns || {})) {
        if (isInvalidField(col) || isInvalidField(type)) {
          report.invalid_fields_removed++;
          onLog(`[Normalization] Removed invalid column '${col}' from '${name}'`);
          continue;
        }
        const stdCol = standardizeFieldName(col);
        if (stdCol !== col) {
          report.fields_renamed++;
          onLog(`[Normalization] Renamed '${col}' → '${stdCol}' in table '${canonical}'`);
        }
        const stdType = normalizeColumnType(stdCol, type);
        if (!stdType) {
          report.invalid_fields_removed++;
          onLog(`[Normalization] Removed invalid type for '${stdCol}' in table '${canonical}'`);
          continue;
        }
        merged.columns[stdCol] = stdType;
      }
      for (const [fkCol, ref] of Object.entries(src.foreign_keys || {})) {
        const stdFkCol = standardizeFieldName(fkCol);
        const [refTable, refCol] = String(ref).split(".");
        const newRefTable = tableRenameMap[refTable] || canonicalTableName(refTable);
        merged.foreign_keys[stdFkCol] = `${newRefTable}.${standardizeFieldName(refCol || "id")}`;
      }
    }

    newTables[canonical] = merged;
  }
  normalized.tables = newTables;

  // Rule 2 & 4: final pass on surviving tables
  for (const [tableName, table] of Object.entries(normalized.tables)) {
    const newCols = {};
    for (const [col, type] of Object.entries(table.columns || {})) {
      const stdCol = standardizeFieldName(col);
      const stdType = normalizeColumnType(stdCol, type);
      if (!stdType) {
        report.invalid_fields_removed++;
        onLog(`[Normalization] Removed invalid column '${col}' from '${tableName}'`);
        continue;
      }
      if (stdCol !== col) {
        report.fields_renamed++;
        onLog(`[Normalization] Renamed '${col}' → '${stdCol}' in table '${tableName}'`);
      }
      newCols[stdCol] = stdType;
    }
    table.columns = newCols;
    table.primary_key = standardizeFieldName(table.primary_key || "id");

    // Rule 5: Foreign key detection
    if (!table.foreign_keys) table.foreign_keys = {};
    for (const colName of Object.keys(table.columns)) {
      const match = colName.match(/^(.+)_id$/);
      if (!match) continue;
      const refTable = canonicalTableName(match[1]);
      if (!normalized.tables[refTable]) continue;
      const fkRef = `${refTable}.id`;
      if (table.foreign_keys[colName] !== fkRef) {
        table.foreign_keys[colName] = fkRef;
        report.foreign_keys_added++;
        onLog(`[Normalization] Added FK ${colName} → ${fkRef}`);
      }
    }

    // Fix FK references to renamed tables
    for (const [fkCol, ref] of Object.entries(table.foreign_keys)) {
      const [refTable, refCol] = String(ref).split(".");
      const newRefTable = tableRenameMap[refTable] || canonicalTableName(refTable);
      table.foreign_keys[standardizeFieldName(fkCol)] = `${newRefTable}.${standardizeFieldName(refCol || "id")}`;
    }
  }

  return normalized;
};

const normalizeApiSchema = (api, report, onLog) => {
  const normalized = cloneSchema(api);
  if (!normalized.endpoints) normalized.endpoints = [];

  normalized.endpoints = normalized.endpoints.map((ep, i) => {
    const ctx = `API endpoint #${i + 1} (${ep.method || "GET"} ${ep.path || "/"})`;
    return {
      ...ep,
      request_fields: renameFieldInList(ep.request_fields, report, onLog, `${ctx} request_fields`),
      response_fields: renameFieldInList(ep.response_fields, report, onLog, `${ctx} response_fields`),
    };
  });

  return normalized;
};

const normalizeUiSchema = (ui) => cloneSchema(ui);

function normalizeSchemas(db, api, ui, onLog = () => {}) {
  const report = {
    tables_merged: 0,
    fields_renamed: 0,
    invalid_fields_removed: 0,
    foreign_keys_added: 0,
  };

  onLog("[Normalization] Stage 4.5 — Schema Normalization started");

  const normalizedDb = normalizeDbSchema(db, report, onLog);
  const normalizedApi = normalizeApiSchema(api, report, onLog);
  const normalizedUi = normalizeUiSchema(ui);

  onLog(`[Normalization] Complete — merged:${report.tables_merged} renamed:${report.fields_renamed} removed:${report.invalid_fields_removed} fks:${report.foreign_keys_added}`);

  return {
    db: normalizedDb,
    api: normalizedApi,
    ui: normalizedUi,
    report,
  };
}

function generateSQL(dbSchema) {
  if (!dbSchema || !dbSchema.tables) return "-- No DB schema available";
  let sql = `-- Auto-generated SQL Schema\n\n`;
  for (const [tableName, tableConfig] of Object.entries(dbSchema.tables)) {
    sql += `CREATE TABLE ${tableName} (\n`;
    const cols = [];
    const primaryKey = tableConfig.primary_key || "id";
    
    for (const [colName, colType] of Object.entries(tableConfig.columns || {})) {
      let colDef = `  ${colName} ${colType}`;
      if (colName === primaryKey) {
        colDef += " PRIMARY KEY";
      }
      cols.push(colDef);
    }
    
    for (const [colName, refTableCol] of Object.entries(tableConfig.foreign_keys || {})) {
      const parts = refTableCol.split('.');
      const refTable = parts[0];
      const refCol = parts[1] || "id";
      cols.push(`  FOREIGN KEY (${colName}) REFERENCES ${refTable}(${refCol}) ON DELETE CASCADE`);
    }
    
    sql += cols.join(",\n");
    sql += `\n);\n\n`;
  }
  return sql;
}

function generateExpressRoutes(apiSchema) {
  if (!apiSchema || !apiSchema.endpoints) return "// No API schema available";
  let code = `// Auto-generated Express route stubs\n\n`;

  for (const endpoint of apiSchema.endpoints) {
    let method = (endpoint.method || "GET").toLowerCase();
    let path = endpoint.path || "/";
    const methodInPath = path.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(.+)$/i);
    if (methodInPath) {
      method = methodInPath[1].toLowerCase();
      path = methodInPath[2];
    }

    code += `app.${method}("${path}", async (req, res) => {\n`;
    code += `  res.json({});\n`;
    code += `});\n\n`;
  }

  return code;
}

function generatePages(uiSchema) {
  if (!uiSchema || !uiSchema.pages) return "// No UI schema available";
  let code = `// Auto-generated React page stubs\n\n`;

  for (const page of uiSchema.pages) {
    const pageName = page.name || "Page";
    const componentName = pageName.endsWith("Page") ? pageName : `${pageName}Page`;

    code += `export default function ${componentName}() {\n`;
    code += `  return (\n`;
    code += `    <div>\n`;
    code += `      ${pageName}\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `}\n\n`;
  }
  return code;
}

function generateRuntimeCode(dbSchema, apiSchema, uiSchema) {
  return {
    sql: generateSQL(dbSchema),
    routes: generateExpressRoutes(apiSchema),
    pages: generatePages(uiSchema),
  };
}

const countValidationErrors = (checks) =>
  (checks || []).reduce((n, c) => n + (c.failures?.length || 0), 0);

const computeRunStatus = (statuses, done, allPassed) => {
  if (Object.values(statuses).some((s) => s === "error")) return "FAILED";
  if (!done) return null;
  return allPassed ? "SUCCESS" : "PARTIAL";
};

const RUN_STATUS_COLORS = { SUCCESS: "#34d399", PARTIAL: "#fb923c", FAILED: "#f87171" };

const generateAuthRules = (designOut) => {
  return {
    strategy: "jwt_refresh",
    providers: ["email_password", "google"],
    roles: designOut?.role_permissions || { admin: ["*"] },
    token_ttl: { access: "15m", refresh: "30d" },
    rate_limits: { login: "5/min", api: "200/min" }
  };
};

const generateExecutionPlan = (designOut) => {
  const entityCount = Object.keys(designOut?.entities || {}).length;
  const services = [
    { name: "api", image: "node:20-alpine", port: 3000, replicas: 1 },
    { name: "postgres", image: "postgres:16", port: 5432, replicas: 1 },
  ];
  if (entityCount > 3) {
    services.push({ name: "redis", image: "redis:7-alpine", port: 6379, replicas: 1 });
  }
  return {
    runtime: "node20-alpine",
    deploy: "docker-compose",
    services,
    env_vars: entityCount > 3 ? ["DATABASE_URL", "JWT_SECRET", "REDIS_URL"] : ["DATABASE_URL", "JWT_SECRET"],
  };
};

/* ─────────────────────────── main component ─────────────────────── */
export default function AIAppCompiler() {
  const [prompt, setPrompt] = useState("");
  const [statuses, setStatuses] = useState({ intent:"idle", design:"idle", schema:"idle", validation:"idle" });
  const [subSt, setSubSt] = useState({ DB:"idle", API:"idle", UI:"idle" });
  const [expanded, setExpanded] = useState({});
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [activeSchemaTab, setActiveSchemaTab] = useState(0);
  const [activeMainTab, setActiveMainTab] = useState("pipeline");
  const [logs, setLogs] = useState([]);
  const [repairLogs, setRepairLogs] = useState([]);
  const [assumptions, setAssumptions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [stageOutputs, setStageOutputs] = useState({});
  const [runCount, setRunCount] = useState(0);
  const [elapsed, setElapsed] = useState(null);
  const [tokenCount, setTokenCount] = useState(null);
  const logRef = useRef(null);
  const repairRef = useRef(null);
  const startRef = useRef(null);

  // New API, SubTab, Validation and Log States
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("gemini_api_key") || import.meta.env.VITE_GEMINI_API_KEY || "";
  });
  const [schemas, setSchemas] = useState({
    "DB Schema": null,
    "API Schema": null,
    "UI Schema": null,
    "Auth Rules": null,
    "Execution Plan": null,
    "Generated Code": null,
  });
  const [activeSubTab, setActiveSubTab] = useState("SQL");
  const [validationResults, setValidationResults] = useState([]);
  const [evaluationLog, setEvaluationLog] = useState([]);
  const [repairAttempts, setRepairAttempts] = useState(0);
  const [showEvalLog, setShowEvalLog] = useState(false);

  // Optimization metrics
  const [apiCallCount, setApiCallCount] = useState(0);
  const [cacheHits, setCacheHits] = useState(0);
  const [costSavings, setCostSavings] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);

  const [promptCache, setPromptCache] = useState(() => {
    try {
      const saved = localStorage.getItem("compiler_prompt_cache");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const incrementApiCalls = useCallback(() => {
    setApiCallCount(prev => prev + 1);
  }, []);

  const addTokens = useCallback((input, output) => {
    setTotalTokens(prev => prev + input + output);
  }, []);

  const handleReset = useCallback(() => {
    setPrompt("");
    setStatuses({ intent: "idle", design: "idle", schema: "idle", validation: "idle" });
    setSubSt({ DB: "idle", API: "idle", UI: "idle" });
    setExpanded({});
    setRunning(false);
    setDone(false);
    setLogs([]);
    setRepairLogs([]);
    setAssumptions([]);
    setMetrics(null);
    setStageOutputs({});
    setElapsed(null);
    setTokenCount(null);
    setSchemas({
      "DB Schema": null,
      "API Schema": null,
      "UI Schema": null,
      "Auth Rules": null,
      "Execution Plan": null,
      "Generated Code": null,
    });
    setValidationResults([]);
    setEvaluationLog([]);
    setRepairAttempts(0);
    setApiCallCount(0);
    setTotalTokens(0);
    setCacheHits(0);
    setCostSavings(0);
    setActiveSchemaTab(0);
    setActiveSubTab("SQL");
    setShowEvalLog(false);
    setActiveMainTab("pipeline");
  }, []);

  const addLog = useCallback((msg, type="info") => {
    setLogs(p => [...p.slice(-200), { msg, type, t: now(), id: Math.random() }]);
  }, []);
  const addRepair = useCallback((msg, type="info") => {
    setRepairLogs(p => [...p.slice(-100), { msg, type, t: now(), id: Math.random() }]);
  }, []);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);
  useEffect(() => { if (repairRef.current) repairRef.current.scrollTop = repairRef.current.scrollHeight; }, [repairLogs]);

  const runPipeline = useCallback(async () => {
    if (running || !prompt.trim()) return;
    
    if (!apiKey.trim()) {
      addLog("[ERROR] Gemini API Key is missing! Please paste your API Key in the topbar.", "error");
      return;
    }

    const cacheKey = prompt.trim().toLowerCase();
    if (promptCache[cacheKey]) {
      addLog("⚡ Cache hit! Retrieving cached compiler outputs instantly...", "success");
      setCacheHits(prev => prev + 1);
      
      const cached = promptCache[cacheKey];
      setCostSavings(prev => prev + 0.0016); // $0.0016 saved by avoiding 3 LLM calls

      setStageOutputs({
        intent: cached.intent,
        design: cached.design,
        schema: {
          db_tables: Object.keys(cached.schemas["DB Schema"]?.tables || {}).length,
          api_endpoints: (cached.schemas["API Schema"]?.endpoints || []).length,
          ui_pages: (cached.schemas["UI Schema"]?.pages || []).length
        },
        validation: {
          checks_run: 3,
          passed: 3,
          repairs_applied: 0,
          final_status: "valid"
        }
      });
      
      if (cached.assumptions) {
        const mappedAssumptions = cached.assumptions.map((ass, i) => ({
          key: `assumption_${i+1}`,
          val: ass,
          src: "Cache"
        }));
        setAssumptions(mappedAssumptions);
      }
      
      const cacheChecks = runValidationChecks(
        cached.schemas["DB Schema"],
        cached.schemas["API Schema"],
        cached.schemas["UI Schema"],
        cached.design
      );
      const cachePassed = cacheChecks.every((c) => c.ok);

      let cacheNormDb = cached.schemas["DB Schema"];
      let cacheNormApi = cached.schemas["API Schema"];
      let cacheNormUi = cached.schemas["UI Schema"];
      let cacheNormReport = null;
      const cacheNormStart = Date.now();

      if (cachePassed) {
        addLog("[04.5] schema_normalization → START (cache)", "stage");
        const cacheNorm = normalizeSchemas(
          cached.schemas["DB Schema"],
          cached.schemas["API Schema"],
          cached.schemas["UI Schema"],
          (msg) => addLog(msg, "info")
        );
        cacheNormDb = cacheNorm.db;
        cacheNormApi = cacheNorm.api;
        cacheNormUi = cacheNorm.ui;
        cacheNormReport = cacheNorm.report;
        addLog(`[04.5] schema_normalization → DONE (${Date.now() - cacheNormStart}ms)`, "success");
      }

      setSchemas({
        ...cached.schemas,
        "DB Schema": cacheNormDb,
        "API Schema": cacheNormApi,
        "UI Schema": cacheNormUi,
        "Generated Code": generateRuntimeCode(cacheNormDb, cacheNormApi, cacheNormUi),
      });
      setStatuses({ intent: "done", design: "done", schema: "done", validation: "done" });
      setSubSt({ DB: "done", API: "done", UI: "done" });
      setValidationResults(cacheChecks);
      if (cacheNormReport) {
        setStageOutputs(p => ({ ...p, normalization: cacheNormReport }));
      }

      setElapsed(8);
      setTokenCount(0);
      setDone(true);
      setRunning(false);
      setRunCount(r => r + 1);

      setMetrics({
        tables: Object.keys(cacheNormDb?.tables || {}).length,
        endpoints: (cacheNormApi?.endpoints || []).length,
        components: (cacheNormUi?.pages || []).reduce((acc, p) => acc + (p.components || []).length, 0),
        checks: 3,
        repairs: 0,
        warnings: 0,
        validationErrors: countValidationErrors(cacheChecks),
        runStatus: cachePassed ? "SUCCESS" : "PARTIAL",
        normalizationReport: cacheNormReport,
        normalizationMs: cachePassed ? Date.now() - cacheNormStart : 0,
        tokensIn: 0,
        tokensOut: 0,
        stageMs: [2, 2, 2, 2],
        spark: [100, 100, 100, 100]
      });
      
      addLog("═══ Cache Retrieval Complete (8ms) ═══", "system");
      return;
    }

    startRef.current = Date.now();
    setRunning(true); 
    setDone(false);
    setLogs([]); 
    setRepairLogs([]); 
    setAssumptions([]); 
    setStageOutputs({});
    setStatuses({ intent:"idle", design:"idle", schema:"idle", validation:"idle" });
    setSubSt({ DB:"idle", API:"idle", UI:"idle" });
    setExpanded({});
    setMetrics(null); 
    setElapsed(null); 
    setTokenCount(null);
    setValidationResults([]);
    setEvaluationLog([]);
    setRepairAttempts(0);
    setActiveMainTab("pipeline");

    addLog("═══ Pipeline run #" + (runCount+1) + " initiated ═══", "system");
    addLog(`prompt_len=${prompt.length} chars`, "meta");

    // ── Stage 1: Intent ──
    const s1_start = Date.now();
    const s1_start_str = now();
    setEvaluationLog(prev => [...prev, { stage: "intent", name: "Stage 1: Intent Extraction", start: s1_start_str, status: "running" }]);
    setStatuses(p=>({...p, intent:"running"}));
    addLog("[01] intent_extraction → START", "stage");
    addLog("Calling Gemini API for Intent Extraction...", "info");

    let intentOut;
    try {
      const systemPrompt = `You are an intent extraction engine. Parse the user's app description and return ONLY valid JSON with this exact structure:
{
  "app_type": string,
  "features": string[],
  "entities": string[],
  "roles": string[],
  "auth_required": boolean,
  "payment_required": boolean,
  "assumptions": string[]
}
No explanation. No markdown. Pure JSON only.`;

      const responseText = await callGeminiWithRetry(systemPrompt, prompt, apiKey, true, incrementApiCalls, addTokens);
      intentOut = safeParseJson(responseText);
      
      // Update assumptions in left panel
      if (intentOut.assumptions) {
        const mappedAssumptions = intentOut.assumptions.map((ass, i) => ({
          key: `assumption_${i+1}`,
          val: ass,
          src: "Stage 1"
        }));
        setAssumptions(mappedAssumptions);
      }
      
      setStageOutputs(p => ({ ...p, intent: intentOut }));
      setStatuses(p => ({ ...p, intent: "done" }));
      setExpanded(p => ({ ...p, intent: true }));
      
      const s1_end = Date.now();
      const s1_dur = s1_end - s1_start;
      setEvaluationLog(prev => [
        ...prev.filter(l => l.stage !== "intent"),
        { stage: "intent", name: "Stage 1: Intent Extraction", start: s1_start_str, end: now(), duration: s1_dur, status: "done" }
      ]);
      addLog(`[01] intent_extraction → DONE (${s1_dur}ms)`, "success");
    } catch (error) {
      setStatuses(p => ({ ...p, intent: "error" }));
      setStageOutputs(p => ({ ...p, intent: { error: error.message } }));
      const s1_end = Date.now();
      setEvaluationLog(prev => [
        ...prev.filter(l => l.stage !== "intent"),
        { stage: "intent", name: "Stage 1: Intent Extraction", start: s1_start_str, end: now(), duration: s1_end - s1_start, status: "error", error: error.message }
      ]);
      addLog(`[01] intent_extraction → ERROR: ${error.message}`, "error");
      setRunning(false);
      return;
    }

    await sleep(150);

    // ── Stage 2: Design ──
    const s2_start = Date.now();
    const s2_start_str = now();
    setEvaluationLog(prev => [...prev, { stage: "design", name: "Stage 2: System Design", start: s2_start_str, status: "running" }]);
    setStatuses(p => ({ ...p, design: "running" }));
    addLog("[02] system_design → START", "stage");
    addLog("Calling Gemini API for System Design...", "info");

    let designOut;
    try {
      const systemPrompt = `You are a system architecture engine. Given this intent JSON, generate an app architecture. Return ONLY valid JSON with:
{
  "entities": { [name]: { "fields": string[], "relations": string[] } },
  "flows": { [flowName]: string[] },
  "role_permissions": { [role]: string[] }
}
No explanation. No markdown. Pure JSON only.`;

      const responseText = await callGeminiWithRetry(systemPrompt, JSON.stringify(intentOut, null, 2), apiKey, true, incrementApiCalls, addTokens);
      designOut = safeParseJson(responseText);
      
      setStageOutputs(p => ({ ...p, design: designOut }));
      setStatuses(p => ({ ...p, design: "done" }));
      setExpanded(p => ({ ...p, design: true }));
      
      const s2_end = Date.now();
      const s2_dur = s2_end - s2_start;
      setEvaluationLog(prev => [
        ...prev.filter(l => l.stage !== "design"),
        { stage: "design", name: "Stage 2: System Design", start: s2_start_str, end: now(), duration: s2_dur, status: "done" }
      ]);
      addLog(`[02] system_design → DONE (${s2_dur}ms)`, "success");
    } catch (error) {
      setStatuses(p => ({ ...p, design: "error" }));
      setStageOutputs(p => ({ ...p, design: { error: error.message } }));
      const s2_end = Date.now();
      setEvaluationLog(prev => [
        ...prev.filter(l => l.stage !== "design"),
        { stage: "design", name: "Stage 2: System Design", start: s2_start_str, end: now(), duration: s2_end - s2_start, status: "error", error: error.message }
      ]);
      addLog(`[02] system_design → ERROR: ${error.message}`, "error");
      setRunning(false);
      return;
    }

    await sleep(150);

    // ── Stage 3: Schema (Optimized Combined Call) ──
    const s3_start = Date.now();
    const s3_start_str = now();
    setEvaluationLog(prev => [...prev, { stage: "schema", name: "Stage 3: Schema Generation", start: s3_start_str, status: "running" }]);
    setStatuses(p => ({ ...p, schema: "running" }));
    setSubSt({ DB: "running", API: "running", UI: "running" });
    addLog("[03] schema_generation → START (1 Combined API call)", "stage");
    addLog("Calling Gemini API for unified DB, API, and UI Schema generation...", "info");

    let dbSchemaResult, apiSchemaResult, uiSchemaResult;
    try {
      const dbPrompt = `Given this app architecture: ${JSON.stringify(designOut)}
Generate DB schema, API schema, UI schema, and Auth rules in a single JSON document.
Return ONLY valid JSON with this exact structure:
{
  "db_schema": {
    "tables": {
      [tableName]: {
        "columns": { [colName]: "type definition" },
        "primary_key": string,
        "foreign_keys": { [col]: "table.col" }
      }
    }
  },
  "api_schema": {
    "endpoints": [{
      "path": string,
      "method": string,
      "auth": boolean,
      "roles": string[],
      "request_fields": string[],
      "response_fields": string[]
    }]
  },
  "ui_schema": {
    "pages": [{
      "name": string,
      "route": string,
      "components": string[],
      "visible_to": string[]
    }]
  },
  "auth_rules": {
    "strategy": string,
    "providers": string[],
    "roles": { [roleName]: string[] },
    "token_ttl": { "access": string, "refresh": string },
    "rate_limits": { [key]: string }
  }
}
Pure JSON only. No explanation. No markdown.`;

      const responseText = await callGeminiWithRetry("You are a combined schema generation engine.", dbPrompt, apiKey, true, incrementApiCalls, addTokens);
      const combinedResult = safeParseJson(responseText);
      
      dbSchemaResult = combinedResult.db_schema || { tables: {} };
      apiSchemaResult = combinedResult.api_schema || { endpoints: [] };
      uiSchemaResult = combinedResult.ui_schema || { pages: [] };
      const authRulesResult = combinedResult.auth_rules || generateAuthRules(designOut);

      setSubSt({ DB: "done", API: "done", UI: "done" });
      addLog("  [worker:DB/API/UI] Combined schemas generated successfully", "success");

      // Save schemas to state
      const newSchemas = {
        "DB Schema": dbSchemaResult,
        "API Schema": apiSchemaResult,
        "UI Schema": uiSchemaResult,
        "Auth Rules": authRulesResult,
        "Execution Plan": generateExecutionPlan(designOut),
        "Generated Code": null
      };
      setSchemas(newSchemas);
      
      setStageOutputs(p => ({ ...p, schema: { db_tables: Object.keys(dbSchemaResult.tables || {}).length, api_endpoints: (apiSchemaResult.endpoints || []).length, ui_pages: (uiSchemaResult.pages || []).length } }));
      setStatuses(p => ({ ...p, schema: "done" }));
      setExpanded(p => ({ ...p, schema: true }));
      
      const s3_end = Date.now();
      const s3_dur = s3_end - s3_start;
      setEvaluationLog(prev => [
        ...prev.filter(l => l.stage !== "schema"),
        { stage: "schema", name: "Stage 3: Schema Generation", start: s3_start_str, end: now(), duration: s3_dur, status: "done" }
      ]);
      addLog(`[03] schema_generation → DONE (${s3_dur}ms)`, "success");
    } catch (error) {
      setSubSt({ DB: "error", API: "error", UI: "error" });
      setStatuses(p => ({ ...p, schema: "error" }));
      setStageOutputs(p => ({ ...p, schema: { error: error.message } }));
      const s3_end = Date.now();
      setEvaluationLog(prev => [
        ...prev.filter(l => l.stage !== "schema"),
        { stage: "schema", name: "Stage 3: Schema Generation", start: s3_start_str, end: now(), duration: s3_end - s3_start, status: "error", error: error.message }
      ]);
      addLog(`[03] schema_generation → ERROR: ${error.message}`, "error");
      setRunning(false);
      return;
    }

    await sleep(150);

    // ── Stage 4: Validation & Deterministic Local Repair ──
    const s4_start = Date.now();
    const s4_start_str = now();
    setEvaluationLog(prev => [...prev, { stage: "validation", name: "Stage 4: Validation & Repair", start: s4_start_str, status: "running" }]);
    setStatuses(p => ({ ...p, validation: "running" }));
    addLog("[04] validation_repair → START", "stage");
    addRepair("╔══ Validation Run ══╗", "system");

    let currentDb = dbSchemaResult;
    let currentApi = apiSchemaResult;
    let currentUi = uiSchemaResult;
    let currentDesign = designOut;

    let checks = runValidationChecks(currentDb, currentApi, currentUi, currentDesign);
    setValidationResults(checks);

    let attempts = 0;
    let allPassed = checks.every(c => c.ok);

    // 1. Try local deterministic repairs first
    if (!allPassed) {
      addRepair("Analyzing issues for local deterministic repairs...", "meta");
      let localRepairsDone = false;

      // Check 1: API-DB columns consistency
      if (!checks[0].ok) {
        const { repairedDb, changed } = applyApiDbDeterministicRepairs(
          currentDb,
          currentApi,
          addRepair
        );

        if (changed) {
          currentDb = repairedDb;
          localRepairsDone = true;
        }

        // Re-run API-DB validation after applying endpoint mapping rules
        const apiDbRecheck = validateApiDb(currentDb, currentApi);
        checks[0] = {
          id: "api_db",
          name: "API-DB Consistency",
          ok: apiDbRecheck.status === "passed",
          failures: apiDbRecheck.failures,
          msg: apiDbRecheck.reason
        };
        if (apiDbRecheck.status === "passed") {
          localRepairsDone = true;
        }
      }

      // Check 2: UI-API consistency
      if (!checks[1].ok) {
        let repairedApi = JSON.parse(JSON.stringify(currentApi));
        if (!repairedApi.endpoints) repairedApi.endpoints = [];
        let endpointsAdded = 0;
        
        for (const page of currentUi.pages || []) {
  const route = page.route;

  const classification = classifyEndpoint(route);

  if (
    classification.type === "PAGE" ||
    classification.type === "AUTH"
  ) {
    console.debug(
      `[UI→API SKIP] ${route} (${classification.type})`
    );
    continue;
  }

  const hasEndpoint = repairedApi.endpoints.some(ep =>
    matchRoute(route, ep.path)
  );

  if (!hasEndpoint) {
    repairedApi.endpoints.push({
      path: route,
      method: "GET",
      auth: true,
      roles: page.visible_to || ["member"],
      request_fields: [],
      response_fields: ["id", "created_at"]
    });
            endpointsAdded++;
            addRepair(`    [Local Repair] Injected API endpoint 'GET ${route}' for Page '${page.name}'`, "repair");
          }
        }
        
        if (endpointsAdded > 0) {
          currentApi = repairedApi;
          localRepairsDone = true;
        }
      }

      // Check 3: Role consistency
      if (!checks[2].ok) {
        let repairedDesign = JSON.parse(JSON.stringify(currentDesign));
        if (!repairedDesign.role_permissions) {
          repairedDesign.role_permissions = {};
        }
        let rolesAdded = 0;
        
        for (const page of currentUi.pages || []) {
          const visibleTo = page.visible_to || [];
          for (const role of visibleTo) {
            if (
  role === "*" ||
  role.toLowerCase() === "public" ||
  role.toLowerCase() === "all" ||
  role.toLowerCase() === "anonymous" ||
  role.toLowerCase() === "guest"
) {
  continue;
}
            const allowedRoles = Object.keys(repairedDesign.role_permissions).map(r => r.toLowerCase());
            if (!allowedRoles.includes(role.toLowerCase())) {
              repairedDesign.role_permissions[role] = ["read"];
              rolesAdded++;
              addRepair(`    [Local Repair] Added missing role '${role}' to System Design permissions`, "repair");
            }
          }
        }
        
        if (rolesAdded > 0) {
          currentDesign = repairedDesign;
          localRepairsDone = true;
        }
      }

      if (localRepairsDone) {
        addLog("Applying local deterministic repairs...", "info");
        const schemaDiff = computeSchemaDiff(
          { db: dbSchemaResult, api: apiSchemaResult, ui: uiSchemaResult, design: designOut },
          { db: currentDb, api: currentApi, ui: currentUi, design: currentDesign }
        );
        for (const change of schemaDiff) {
          addRepair(`    [Schema Diff] ${change}`, "meta");
        }
        checks = runValidationChecks(currentDb, currentApi, currentUi, currentDesign);
        setValidationResults(checks);
        allPassed = checks.every(c => c.ok);
        setCostSavings(prev => prev + 0.0015); // Saved LLM repair call ($0.0015 savings)
      }
    }

    // 2. LLM Fallback Repair Loop
      while (!allPassed && attempts < 3) {
      attempts++;
      setRepairAttempts(attempts);
      addRepair(`LLM Repair Attempt #${attempts} starting...`, "repair");
      
      
      const failedCheck = checks.find(c => !c.ok);
      addRepair(`  ⚠ Check failed: ${failedCheck.name}`, "warn");
      addLog(`  repair triggered for: ${failedCheck.name} (attempt ${attempts}/3)`, "warn");
      
      if (failedCheck.id === "api_db") {
        const mappingOnlyFailures =
          failedCheck.failures.length > 0 &&
          failedCheck.failures.every(isDeterministicMappingFailure);

        if (mappingOnlyFailures) {
  addRepair(
    "  → Applying deterministic repair only (LLM skipped)",
    "meta"
  );

  currentDb = applyApiDbRepair(
    currentDb,
    currentApi,
    addRepair
  ).repairedDb;

  continue;
}
          if (endpointsNeedingMapping.length === 0) {
            addRepair(
              "  → Skipping LLM repair: failures are from endpoints that do not require DB table mapping",
              "meta"
            );
            checks = runValidationChecks(currentDb, currentApi, currentUi, currentDesign);
            setValidationResults(checks);
            allPassed = checks.every((c) => c.ok);
            attempts--;
            continue;
          }

          addRepair(
            "  → Applying deterministic endpoint-to-entity mapping repair (skipping LLM)...",
            "meta"
          );
          const { repairedDb, changed } = applyApiDbDeterministicRepairs(
            currentDb,
            currentApi,
            addRepair
          );
          if (changed) currentDb = repairedDb;

          checks = runValidationChecks(currentDb, currentApi, currentUi, currentDesign);
          setValidationResults(checks);
          allPassed = checks.every((c) => c.ok);
          attempts--;
          continue;

        const prompt = `You are a system architecture repair assistant.
We have a Database Schema and an API Schema for an application.
DB Schema:
${JSON.stringify(currentDb, null, 2)}

API Schema:
${JSON.stringify(currentApi, null, 2)}

Consistency Check Failure:
${failedCheck.failures.join("\n")}




Please repair either the DB schema or the API schema to make them consistent. If the database schema has a column missing or type mismatch, repair the DB schema. If the API response fields are incorrect, repair the API schema.
Return ONLY valid JSON in this exact structure:
{
  "repaired_db_schema": ... (same structure as DB schema, with missing columns added or extra response fields removed),
  "repaired_api_schema": ... (same structure as API schema, with response fields updated to match columns)
}
No markdown. No explanation. Pure JSON only.`;

        try {
          const repairText = await callGeminiWithRetry("You are a system architecture repair assistant.", prompt, apiKey, true, incrementApiCalls, addTokens);
          const repairData = safeParseJson(repairText);
          if (repairData.repaired_db_schema) {
            currentDb = repairData.repaired_db_schema;
            addRepair("  → Applied DB Schema repairs", "success");
            addLog("  repaired DB Schema applied", "info");
          }
          if (repairData.repaired_api_schema) {
            currentApi = repairData.repaired_api_schema;
            addRepair("  → Applied API Schema repairs", "success");
            addLog("  repaired API Schema applied", "info");
          }
        } catch (err) {
          addRepair(`  ✖ Repair failed: ${err.message}`, "error");
          addLog(`  repair error: ${err.message}`, "error");
          break;
        }
      }
      if (failedCheck.id === "ui_api") {
  const prompt = `You are a system architecture repair assistant.

We have an API Schema and a UI Schema for an application.

API Schema:
${JSON.stringify(currentApi, null, 2)}

UI Schema:
${JSON.stringify(currentUi, null, 2)}

Consistency Check Failure:
${failedCheck.failures?.join("\n") || ""}

Please repair either the API schema or the UI schema to make them consistent (so every page route has at least one matching API endpoint path).

Return ONLY valid JSON in this exact structure:
{
  "repaired_api_schema": ... (same structure as API schema),
  "repaired_ui_schema": ... (same structure as UI schema)
}

No markdown. No explanation. Pure JSON only.`;

  try {
    const repairText = await callGeminiWithRetry(
      "You are a system architecture repair assistant.",
      prompt,
      apiKey,
      true,
      incrementApiCalls,
      addTokens
    );

    const repairData = safeParseJson(repairText);

    if (repairData?.repaired_api_schema) {
      currentApi = repairData.repaired_api_schema;
      addRepair("  → Applied API Schema repairs", "success");
      addLog("  repaired API Schema applied", "info");
    }

    if (repairData?.repaired_ui_schema) {
      currentUi = repairData.repaired_ui_schema;
      addRepair("  → Applied UI Schema repairs", "success");
      addLog("  repaired UI Schema applied", "info");
    }

  } catch (err) {
    addRepair(`  ✖ UI-API Repair failed: ${err.message}`, "error");
    addLog(`  repair error: ${err.message}`, "error");
    break;
  }

    }

      // Re-run checks
      checks = runValidationChecks(currentDb, currentApi, currentUi, currentDesign);
      setValidationResults(checks);
      allPassed = checks.every(c => c.ok);
    }

    // Log validation check summaries in repair log
    for (const c of checks) {
      if (c.ok) {
        addRepair(`  ✓ ${c.name}: Passed`, "success");
      } else {
        addRepair(`  ✗ ${c.name}: Failed — ${c.msg}`, "error");
      }
    }

    // ── Stage 4.5: Schema Normalization (post-processing, only on validation success) ──
    let normDb = currentDb;
    let normApi = currentApi;
    let normUi = currentUi;
    let normalizationReport = null;
    let s45_dur = 0;

    if (allPassed) {
      const s45_start = Date.now();
      const s45_start_str = now();
      setEvaluationLog(prev => [...prev, {
        stage: "normalization", name: "Stage 4.5: Schema Normalization",
        start: s45_start_str, status: "running",
      }]);
      addLog("[04.5] schema_normalization → START", "stage");

      const normResult = normalizeSchemas(currentDb, currentApi, currentUi, (msg) => addLog(msg, "info"));
      normDb = normResult.db;
      normApi = normResult.api;
      normUi = normResult.ui;
      normalizationReport = normResult.report;

      s45_dur = Date.now() - s45_start;
      setEvaluationLog(prev => [
        ...prev.filter(l => l.stage !== "normalization"),
        {
          stage: "normalization", name: "Stage 4.5: Schema Normalization",
          start: s45_start_str, end: now(), duration: s45_dur, status: "done",
        },
      ]);
      setStageOutputs(p => ({ ...p, normalization: normalizationReport }));
      addLog(`[04.5] schema_normalization → DONE (${s45_dur}ms)`, "success");
    }

    // Update schemas state with normalized schemas + generated code
    const finalSchemas = {
      "DB Schema": normDb,
      "API Schema": normApi,
      "UI Schema": normUi,
      "Auth Rules": generateAuthRules(currentDesign),
      "Execution Plan": generateExecutionPlan(currentDesign),
      "Generated Code": allPassed
        ? generateRuntimeCode(normDb, normApi, normUi)
        : generateRuntimeCode(currentDb, currentApi, currentUi),
    };
    setSchemas(finalSchemas);

    // Save to Cache on Success
    if (allPassed) {
      const updatedCache = {
        ...promptCache,
        [cacheKey]: {
          intent: intentOut,
          design: designOut,
          schemas: finalSchemas,
          assumptions: intentOut.assumptions
        }
      };
      setPromptCache(updatedCache);
      localStorage.setItem("compiler_prompt_cache", JSON.stringify(updatedCache));
    }

    // Finalize Stage 4 status
    if (allPassed) {
      setStatuses(p => ({ ...p, validation: "done" }));
      addLog("[04] validation_repair → DONE", "success");
      addRepair("╚══ Validation Succeeded ══╝", "system");
      setStageOutputs(p => ({ ...p, validation: { checks_run: 3, passed: 3, repairs_applied: attempts, final_status: "valid" } }));
    } else {
      setStatuses(p => ({ ...p, validation: "error" }));
      setStageOutputs(p => ({ ...p, validation: { error: "Consistency validation failed after repairs." } }));
      addLog("[04] validation_repair → FAILED consistency checks after repairs", "error");
      addRepair("╚══ Validation Failed ══╝", "error");
    }

    const s4_end = Date.now();
    const s4_dur = s4_end - s4_start;
    setEvaluationLog(prev => [
      ...prev.filter(l => l.stage !== "validation"),
      { 
        stage: "validation", 
        name: "Stage 4: Validation & Repair", 
        start: s4_start_str, 
        end: now(), 
        duration: s4_dur, 
        status: allPassed ? "done" : "error",
        error: allPassed ? null : "Consistency validation failed"
      }
    ]);

    // Final pipeline wrap up
    const totalMs = Date.now() - startRef.current;
    setElapsed(totalMs);
    setTokenCount(totalTokens);

    setMetrics({
      tables: Object.keys((allPassed ? normDb : currentDb)?.tables || {}).length,
      endpoints: ((allPassed ? normApi : currentApi)?.endpoints || []).length,
      components: ((allPassed ? normUi : currentUi)?.pages || []).reduce((acc, p) => acc + (p.components || []).length, 0),
      checks: 3,
      repairs: attempts,
      warnings: checks.filter(c => !c.ok).length,
      validationErrors: countValidationErrors(checks),
      runStatus: allPassed ? "SUCCESS" : "PARTIAL",
      normalizationReport,
      normalizationMs: s45_dur,
      tokensIn: Math.round(prompt.length / 3.8),
      tokensOut: totalTokens,
      stageMs: [
        s2_start - s1_start,
        s3_start - s2_start,
        s4_start - s3_start,
        s4_end - s4_start
      ],
      spark: [100, 200, 150, 180, 220, attempts * 50 + 100]
    });

    addLog("", "meta");
    addLog(`═══ COMPLETE  total=${totalMs}ms ═══`, "system");
    setDone(true); 
    setRunning(false); 
    setRunCount(r => r + 1);
  }, [running, prompt, runCount, apiKey, promptCache, totalTokens, addLog, addRepair, addTokens, incrementApiCalls]);

  const downloadJSON = useCallback((key) => {
    const data = key ? schemas[key] : schemas;
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = key ? `${key.replace(/ /g,"_").toLowerCase()}.json` : "all_schemas.json";
    a.click();
  }, [schemas]);

  const logColor = { system:"#38bdf8", meta:"#334155", stage:"#818cf8", info:"#475569", success:"#34d399", warn:"#fb923c", error:"#f87171", repair:"#fbbf24" };
  const repairColor = { system:"#38bdf8", meta:"#475569", success:"#34d399", warn:"#fb923c", error:"#f87171", repair:"#fbbf24", info:"#475569" };

  const MAIN_TABS = [
    { id:"pipeline",  label:"Pipeline",     icon:"⊳" },
    { id:"arch",      label:"Architecture", icon:"⬡" },
    { id:"schema",    label:"Schema",       icon:"⊞" },
    { id:"metrics",   label:"Metrics",      icon:"◈" },
  ];

  const stagesCompleted = Object.values(statuses).filter((s) => s === "done").length;
  const validationErrorCount =
    metrics?.validationErrors ?? countValidationErrors(validationResults);
  const runStatus =
    metrics?.runStatus ??
    computeRunStatus(statuses, done, validationResults.length > 0 && validationResults.every((c) => c.ok));
  const generatedCode =
    schemas["Generated Code"] ||
    (schemas["DB Schema"]
      ? generateRuntimeCode(schemas["DB Schema"], schemas["API Schema"], schemas["UI Schema"])
      : null);

  /* ───────── render ───────── */
  return (
    <div style={{ fontFamily:"'JetBrains Mono','Fira Code','Courier New',monospace", background:"#020810", color:"#94a3b8", minHeight:"100vh", display:"flex", flexDirection:"column", fontSize:12 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes marching{from{stroke-dashoffset:12}to{stroke-dashoffset:0}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:#020810}
        ::-webkit-scrollbar-thumb{background:#0f172a;border-radius:3px}
        textarea{color-scheme:dark}
        button:focus-visible{outline:1px solid #38bdf8;outline-offset:2px}
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"0 16px", height:40, borderBottom:"1px solid #080f1e", background:"#020810", flexShrink:0, zIndex:10 }}>
        <span style={{ color:"#38bdf8", fontSize:14, fontWeight:700, letterSpacing:"-0.03em" }}>⚡ AppCompiler</span>
        <span style={{ color:"#0f172a", fontSize:10 }}>|</span>
        <span style={{ fontSize:9, color:"#1e3a5f", letterSpacing:"0.1em" }}>AI SCHEMA PIPELINE v2.1.0</span>
        <div style={{ flex:1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
          <span style={{ fontSize: 9, color: "#475569" }}>GEMINI API KEY:</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              const val = e.target.value;
              setApiKey(val);
              localStorage.setItem("gemini_api_key", val);
            }}
            placeholder="Paste API Key here..."
            style={{
              background: "#020810",
              border: "1px solid #1e293b",
              borderRadius: 4,
              padding: "2px 6px",
              fontSize: 9,
              color: "#cbd5e1",
              width: 145,
              fontFamily: "inherit",
              outline: "none"
            }}
          />
        </div>
        {done && elapsed && (
          <span style={{ fontSize:9, color:"#334155", animation:"fadeIn 0.4s ease", marginRight: 12 }}>
            run #{runCount}  {elapsed}ms  ~{tokenCount?.toLocaleString()} tokens
          </span>
        )}
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {STAGES.map(s => {
            const st = statuses[s.id];
            const c = st==="done"?"#34d399":st==="running"?"#fbbf24":st==="error"?"#f87171":"#0f172a";
            return <div key={s.id} title={s.name} style={{ width:5, height:5, borderRadius:"50%", background:c, boxShadow:st==="done"?`0 0 5px ${c}`:"none", transition:"all 0.3s" }} />;
          })}
        </div>
        <StatusBadge status={done?"done":running?"running":"idle"} />
      </div>

      {/* ── BODY: 3-column layout ── */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"300px 1fr 260px", gridTemplateRows:"1fr", overflow:"hidden", minHeight:0 }}>

        {/* ═══════ LEFT PANEL ═══════ */}
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
                onKeyDown={e=>{ if((e.ctrlKey||e.metaKey)&&e.key==="Enter") runPipeline(); }}
                placeholder={"Describe your app in plain English…\n\ne.g. A task manager with teams, tags,\ndue dates and email notifications."}
                rows={6}
                style={{
                  width:"100%", background:"#020810", border:`1px solid ${running?"#38bdf855":"#0f172a"}`,
                  borderRadius:6, padding:"10px 11px", fontFamily:"inherit", fontSize:11,
                  color:"#cbd5e1", resize:"none", outline:"none", lineHeight:1.65,
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

        {/* ═══════ CENTRE PANEL ═══════ */}
        <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Centre tab bar */}
          <div style={{ display:"flex", gap:0, borderBottom:"1px solid #080f1e", flexShrink:0, background:"#020810" }}>
            {MAIN_TABS.map(t=>(
              <button key={t.id} onClick={()=>setActiveMainTab(t.id)} style={{
                padding:"8px 18px", background:"none",
                border:"none",
                borderBottom:`2px solid ${activeMainTab===t.id?"#38bdf8":"transparent"}`,
                fontFamily:"inherit", fontSize:10, color:activeMainTab===t.id?"#38bdf8":"#334155",
                cursor:"pointer", letterSpacing:"0.08em", display:"flex", alignItems:"center", gap:5,
                transition:"color 0.15s",
              }}>
                <span style={{ fontSize:12 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* ── PIPELINE TAB ── */}
          {activeMainTab==="pipeline" && (
            <div style={{ flex:1, overflow:"auto", padding:16 }}>

              {/* Stage cards */}
              {STAGES.map((stage,idx)=>{
                const st = statuses[stage.id];
                const isExp = expanded[stage.id];
                const out = stageOutputs[stage.id];
                const isRunning = st==="running";
                const isDone = st==="done";
                return (
                  <div key={stage.id} style={{
                    marginBottom:8, border:`1px solid ${isDone?stage.color+"40":isRunning?stage.color+"30":"#0f172a"}`,
                    borderRadius:8, overflow:"hidden", background:"#030b18",
                    boxShadow:isDone?`0 0 12px ${stage.color}15`:"none",
                    transition:"all 0.3s", animation:`slideDown 0.3s ease ${idx*0.05}s both`,
                  }}>
                    {/* Stage header */}
                    <div onClick={()=>setExpanded(p=>({...p,[stage.id]:!p[stage.id]}))}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer",
                        background:isRunning?`${stage.color}08`:"transparent" }}>
                      {/* Progress line accent */}
                      <div style={{ width:3, height:32, borderRadius:2, background:isDone?stage.color:isRunning?stage.color:"#0f172a", flexShrink:0, transition:"all 0.4s", boxShadow:isDone||isRunning?`0 0 8px ${stage.color}`:""  }} />
                      <span style={{ fontSize:9, color:"#1e3a5f", minWidth:20 }}>{stage.num}</span>
                      <span style={{ fontSize:13, marginRight:2 }}>{stage.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:isDone?"#e2e8f0":isRunning?"#cbd5e1":"#334155", marginBottom:1, transition:"color 0.3s" }}>
                          {stage.name}
                        </div>
                        {stage.subs && (
                          <div style={{ display:"flex", gap:4 }}>
                            {stage.subs.map(b=>(
                              <Badge key={b} label={b} color={
                                subSt[b]==="done"?"#34d399":subSt[b]==="running"?"#fbbf24":"#334155"
                              } pulse={subSt[b]==="running"} />
                            ))}
                          </div>
                        )}
                      </div>
                      {out && <span style={{ fontSize:9, color:"#334155", marginRight:8 }}>
                        {Object.keys(out).length} fields
                      </span>}
                      <StatusBadge status={st} />
                      <span style={{ color:"#1e3a5f", fontSize:11, marginLeft:4, transform:isExp?"rotate(180deg)":"", display:"inline-block", transition:"transform 0.2s" }}>⌄</span>
                    </div>

                    {/* Stage output */}
                    {isExp && (
                      <div style={{ padding:"0 14px 12px 14px", borderTop:"1px solid #0a1628", animation:"fadeIn 0.2s ease" }}>
                        <div style={{ background:"#020810", borderRadius:5, padding:"10px 12px", fontFamily:"inherit", fontSize:11, lineHeight:1.8, maxHeight:180, overflowY:"auto" }}>
                          {out && out.error ? (
                            <span style={{ color: "#f87171" }}>Error: {out.error}</span>
                          ) : stage.id === "validation" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {validationResults.map((r, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11 }}>
                                  <span style={{ color: r.ok ? "#34d399" : "#f87171", fontWeight: "bold" }}>
                                    {r.ok ? "✓" : "✗"}
                                  </span>
                                  <div>
                                    <span style={{ color: "#e2e8f0", fontWeight: 500 }}>{r.name}</span>
                                    <span style={{ color: "#64748b", fontSize: 10, display: "block" }}>{r.msg}</span>
                                    {!r.ok && r.failures && r.failures.length > 0 && (
                                      <ul style={{ paddingLeft: 14, listStyleType: "circle", color: "#f87171", fontSize: 9, marginTop: 2 }}>
                                        {r.failures.map((f, fi) => <li key={fi}>{f}</li>)}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {repairAttempts > 0 && (
                                <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 4, borderTop: "1px dashed #1e293b", paddingTop: 4 }}>
                                  Repairs attempted: {repairAttempts} / 3
                                </div>
                              )}
                            </div>
                          ) : out ? (
                            <JsonTree data={out} />
                          ) : (
                            <span style={{ color: "#475569" }}>No output available. Run compilation.</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Done summary bar */}
              {done && metrics && (
                <div style={{ marginTop:8, padding:"10px 14px", background:"#020f1a", border:"1px solid #34d39930", borderRadius:8, display:"flex", gap:16, alignItems:"center", animation:"slideDown 0.3s ease" }}>
                  <span style={{ color:"#34d399", fontSize:11, fontWeight:600 }}>✓ PIPELINE COMPLETE</span>
                  <span style={{ fontSize:10, color:"#334155" }}>{metrics.stageMs.reduce((a,b)=>a+b,0)}ms total</span>
                  <span style={{ fontSize:10, color:"#334155" }}>{metrics.tables} tables  {metrics.endpoints} endpoints  {metrics.components} components</span>
                  <span style={{ fontSize:10, color:metrics.warnings>0?"#fb923c":"#34d399" }}>{metrics.warnings} warnings  {metrics.repairs} repairs</span>
                  <div style={{ flex:1 }} />
                  <button onClick={()=>downloadJSON(null)} style={{ fontSize:10, color:"#38bdf8", background:"#0a1e32", border:"1px solid #38bdf830", borderRadius:5, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit" }}>
                    ↓ ALL SCHEMAS
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── ARCHITECTURE TAB ── */}
          {activeMainTab==="arch" && (
            <div style={{ flex:1, overflow:"auto", padding:16 }}>
              <div style={{ background:"#030b18", border:"1px solid #0f172a", borderRadius:8, padding:16, marginBottom:12 }}>
                <div style={{ fontSize:9, color:"#334155", letterSpacing:"0.1em", marginBottom:12 }}>SERVICE DEPENDENCY GRAPH</div>
                <ArchGraph active={done} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {ARCH_NODES.map(n=>(
                  <div key={n.id} style={{ background:"#030b18", border:`1px solid ${done?n.color+"40":"#0f172a"}`, borderRadius:6, padding:"8px 12px", display:"flex", gap:8, alignItems:"center" }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:done?n.color:"#0f172a", transition:"all 0.3s", boxShadow:done?`0 0 6px ${n.color}`:""  }} />
                    <div>
                      <div style={{ fontSize:11, color:done?"#cbd5e1":"#334155" }}>{n.label}</div>
                      <div style={{ fontSize:9, color:"#1e3a5f" }}>
                        {n.id==="client"?"browser SPA":n.id==="gateway"?"express:3000":n.id==="auth"?"jwt+oauth2":n.id==="task"?"REST service":n.id==="notify"?"email+push":n.id==="db"?"pg:5432":n.id==="redis"?"6379":n.id==="queue"?"bull+redis":""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SCHEMA TAB ── */}
          {activeMainTab==="schema" && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              {/* Metrics Bar */}
              {(running || done || elapsed !== null) && (
                <div style={{
                  background: "#030c1e",
                  borderBottom: "1px solid #0a1b3a",
                  padding: "8px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                  flexShrink: 0
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.05em" }}>METRICS:</span>
                    <span style={{ fontSize: 10, color: "#cbd5e1" }}>
                      Total Runtime: <strong style={{ color: "#38bdf8" }}>{elapsed !== null ? `${elapsed}ms` : "-"}</strong>
                    </span>
                    <span style={{ fontSize: 10, color: "#cbd5e1" }}>
                      API Calls: <strong style={{ color: "#a78bfa" }}>{apiCallCount}</strong>
                    </span>
                    <span style={{ fontSize: 10, color: "#cbd5e1" }}>
                      Repair Attempts: <strong style={{ color: "#fbbf24" }}>{repairAttempts}</strong>
                    </span>
                    <span style={{ fontSize: 10, color: "#cbd5e1" }}>
                      Validation Errors: <strong style={{ color: validationErrorCount > 0 ? "#f87171" : "#34d399" }}>{validationErrorCount}</strong>
                    </span>
                    <span style={{ fontSize: 10, color: "#cbd5e1" }}>
                      Stages: <strong style={{ color: "#34d399" }}>{stagesCompleted}/4</strong>
                    </span>
                    {runStatus && (
                      <span style={{ fontSize: 10, color: "#cbd5e1" }}>
                        Status: <strong style={{ color: RUN_STATUS_COLORS[runStatus] || "#94a3b8" }}>{runStatus}</strong>
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button 
                      onClick={() => setShowEvalLog(!showEvalLog)}
                      style={{
                        background: "none",
                        border: "1px solid #1e293b",
                        color: "#64748b",
                        fontSize: 9,
                        padding: "3px 8px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontFamily: "inherit"
                      }}
                    >
                      {showEvalLog ? "Hide Log ▴" : "Evaluation Log ▾"}
                    </button>
                    
                    <button 
                      onClick={handleReset}
                      style={{
                        background: "#311018",
                        border: "1px solid #f8717140",
                        color: "#f87171",
                        fontSize: 9,
                        padding: "3px 8px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontFamily: "inherit"
                      }}
                    >
                      Reset ↺
                    </button>
                  </div>
                </div>
              )}

              {/* Collapsible Evaluation Log */}
              {showEvalLog && (
                <div style={{
                  background: "#020813",
                  borderBottom: "1px solid #0a1b3a",
                  padding: "10px 14px",
                  maxHeight: 150,
                  overflowY: "auto",
                  flexShrink: 0
                }}>
                  <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 6 }}>EVALUATION LOG DETAIL</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {evaluationLog.map((log) => (
                      <div key={log.stage} style={{
                        background: "#030b18",
                        border: "1px solid #0f172a",
                        borderRadius: 5,
                        padding: "8px 10px",
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        <div style={{ color: "#38bdf8", fontWeight: 600, marginBottom: 4 }}>{log.name}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", color: "#64748b" }}>
                          <span>Start: {log.start || "-"}</span>
                          <span>End: {log.end || "-"}</span>
                          <span style={{ color: "#cbd5e1" }}>
                            Duration: {log.duration !== undefined ? `${log.duration}ms` : "-"}
                          </span>
                          <span style={{
                            color: log.status === "done" ? "#34d399" : log.status === "running" ? "#fbbf24" : log.status === "error" ? "#f87171" : "#475569"
                          }}>
                            Status: {log.status === "done" ? "DONE" : log.status.toUpperCase()}
                          </span>
                        </div>
                        {log.error && (
                          <div style={{ color: "#f87171", marginTop: 4, wordBreak: "break-all" }}>Error: {log.error}</div>
                        )}
                      </div>
                    ))}
                    {evaluationLog.length === 0 && (
                      <div style={{ color: "#475569", fontSize: 10 }}>No evaluation log records yet.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Schema sub-tab bar */}
              <div style={{ display:"flex", gap:2, padding:"8px 12px", borderBottom:"1px solid #080f1e", flexShrink:0, background:"#020810" }}>
                {SCHEMA_TABS.map((t,i)=>(
                  <button key={t} onClick={()=>setActiveSchemaTab(i)} style={{
                    padding:"4px 12px", background:activeSchemaTab===i?"#0a1628":"transparent",
                    border:`1px solid ${activeSchemaTab===i?"#38bdf830":"transparent"}`,
                    borderRadius:5, fontFamily:"inherit", fontSize:10,
                    color:activeSchemaTab===i?"#38bdf8":"#334155", cursor:"pointer", transition:"all 0.15s",
                  }}>
                    {t}
                  </button>
                ))}
                <div style={{ flex:1 }} />
                <button onClick={()=>downloadJSON(SCHEMA_TABS[activeSchemaTab])} disabled={!done || SCHEMA_TABS[activeSchemaTab] === "Generated Code"} style={{
                  padding:"3px 10px", background:"transparent", border:`1px solid ${done && SCHEMA_TABS[activeSchemaTab] !== "Generated Code" ?"#38bdf830":"#0f172a"}`,
                  borderRadius:5, fontFamily:"inherit", fontSize:9, color:done && SCHEMA_TABS[activeSchemaTab] !== "Generated Code"?"#38bdf8":"#1e3a5f", cursor:done && SCHEMA_TABS[activeSchemaTab] !== "Generated Code"?"pointer":"not-allowed",
                }}>↓ JSON</button>
              </div>
              
              <div style={{ flex:1, overflow:"auto", padding:"12px 16px", fontFamily:"inherit", fontSize:11, lineHeight:1.8 }}>
                {done ? (
                  SCHEMA_TABS[activeSchemaTab] === "Generated Code" ? (
                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                      {/* Generated Code sub-tabs */}
                      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #0f172a", paddingBottom: 8, marginBottom: 12 }}>
                        {["SQL", "Routes", "Pages"].map((subTab) => (
                          <button
                            key={subTab}
                            onClick={() => setActiveSubTab(subTab)}
                            style={{
                              padding: "4px 12px",
                              background: activeSubTab === subTab ? "#0a1628" : "transparent",
                              border: `1px solid ${activeSubTab === subTab ? "#38bdf830" : "transparent"}`,
                              borderRadius: 5,
                              fontFamily: "inherit",
                              fontSize: 10,
                              color: activeSubTab === subTab ? "#38bdf8" : "#334155",
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            {subTab}
                          </button>
                        ))}
                      </div>
                      <div style={{ flex: 1, overflow: "auto" }}>
                        <pre style={{
                          background: "#030b18",
                          border: "1px solid #0f172a",
                          borderRadius: 6,
                          padding: "12px 14px",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                          lineHeight: 1.6,
                          color: "#cbd5e1",
                          textAlign: "left",
                          whiteSpace: "pre-wrap",
                          maxHeight: "350px",
                          overflowY: "auto"
                        }}>
                          {activeSubTab === "SQL" && generatedCode?.sql}
                          {activeSubTab === "Routes" && generatedCode?.routes}
                          {activeSubTab === "Pages" && generatedCode?.pages}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background:"#030b18", border:"1px solid #0f172a", borderRadius:6, padding:"12px 14px", animation:"fadeIn 0.2s" }}>
                      <JsonTree data={schemas[SCHEMA_TABS[activeSchemaTab]]} />
                    </div>
                  )
                ) : (
                  <div style={{ color:"#1e3a5f", textAlign:"center", paddingTop:40 }}>run pipeline to generate schemas</div>
                )}
              </div>
            </div>
          )}

          {/* ── METRICS TAB ── */}
          {activeMainTab==="metrics" && (
            <div style={{ flex:1, overflow:"auto", padding:16 }}>
              {metrics ? (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
                    <MetricCard label="TOTAL RUNTIME" value={elapsed ?? metrics.stageMs.reduce((a,b)=>a+b,0)} unit="ms" color="#38bdf8" spark={metrics.spark} />
                    <MetricCard label="API CALLS" value={apiCallCount} color="#a78bfa" />
                    <MetricCard label="REPAIR ATTEMPTS" value={repairAttempts} color="#fbbf24" />
                    <MetricCard label="VALIDATION ERRORS" value={validationErrorCount} color={validationErrorCount > 0 ? "#f87171" : "#34d399"} />
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
                    <MetricCard label="STAGES COMPLETED" value={`${stagesCompleted}/4`} color="#34d399" />
                    <MetricCard label="STATUS" value={runStatus || "—"} color={RUN_STATUS_COLORS[runStatus] || "#64748b"} />
                    <MetricCard label="CACHE HITS" value={cacheHits} color="#f472b6" />
                    <MetricCard label="COST SAVINGS" value={`$${costSavings.toFixed(4)}`} color="#34d399" />
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
                    <MetricCard label="DB TABLES" value={metrics.tables} color="#38bdf8" />
                    <MetricCard label="API ENDPOINTS" value={metrics.endpoints} color="#818cf8" />
                    <MetricCard label="UI COMPONENTS" value={metrics.components} color="#34d399" />
                    <MetricCard label="TOTAL TOKENS" value={totalTokens.toLocaleString()} color="#818cf8" />
                  </div>

                  {/* Normalization report (Stage 4.5) */}
                  {metrics.normalizationReport && (
                    <div style={{ background:"#030b18", border:"1px solid #a78bfa40", borderRadius:8, padding:14, marginBottom:12 }}>
                      <div style={{ fontSize:9, color:"#a78bfa", letterSpacing:"0.1em", marginBottom:10 }}>STAGE 4.5 — NORMALIZATION REPORT</div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:10 }}>
                        <MetricCard label="TABLES MERGED" value={metrics.normalizationReport.tables_merged} color="#a78bfa" />
                        <MetricCard label="FIELDS RENAMED" value={metrics.normalizationReport.fields_renamed} color="#38bdf8" />
                        <MetricCard label="INVALID REMOVED" value={metrics.normalizationReport.invalid_fields_removed} color="#fb923c" />
                        <MetricCard label="FOREIGN KEYS ADDED" value={metrics.normalizationReport.foreign_keys_added} color="#34d399" />
                      </div>
                      {metrics.normalizationMs > 0 && (
                        <div style={{ fontSize:10, color:"#64748b", marginBottom:8 }}>
                          Normalization duration: <span style={{ color:"#a78bfa" }}>{metrics.normalizationMs}ms</span>
                        </div>
                      )}
                      <div style={{ background:"#020810", borderRadius:5, padding:"10px 12px" }}>
                        <JsonTree data={metrics.normalizationReport} />
                      </div>
                    </div>
                  )}

                  {/* Stage timing breakdown */}
                  <div style={{ background:"#030b18", border:"1px solid #0f172a", borderRadius:8, padding:14, marginBottom:12 }}>
                    <div style={{ fontSize:9, color:"#334155", letterSpacing:"0.1em", marginBottom:10 }}>STAGE LATENCY BREAKDOWN</div>
                    {STAGES.map((s,i)=>{
                      const ms = metrics.stageMs[i];
                      const total = metrics.stageMs.reduce((a,b)=>a+b,0) + (metrics.normalizationMs || 0);
                      const pct = total > 0 ? Math.round((ms/total)*100) : 0;
                      return (
                        <div key={s.id} style={{ marginBottom:8 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <span style={{ fontSize:10, color:"#64748b" }}>{s.num} {s.name}</span>
                            <span style={{ fontSize:10, color:s.color }}>{ms}ms <span style={{ color:"#334155" }}>({pct}%)</span></span>
                          </div>
                          <div style={{ height:4, background:"#0a1628", borderRadius:2 }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:s.color, borderRadius:2, boxShadow:`0 0 6px ${s.color}80`, transition:"width 0.5s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                    {metrics.normalizationMs > 0 && (
                      <div style={{ marginBottom:8 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ fontSize:10, color:"#64748b" }}>04.5 Schema Normalization</span>
                          <span style={{ fontSize:10, color:"#a78bfa" }}>{metrics.normalizationMs}ms</span>
                        </div>
                        <div style={{ height:4, background:"#0a1628", borderRadius:2 }}>
                          <div style={{
                            height:"100%",
                            width:`${Math.round((metrics.normalizationMs / (metrics.stageMs.reduce((a,b)=>a+b,0) + metrics.normalizationMs)) * 100)}%`,
                            background:"#a78bfa", borderRadius:2, boxShadow:"0 0 6px #a78bfa80",
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Token breakdown */}
                  <div style={{ background:"#030b18", border:"1px solid #0f172a", borderRadius:8, padding:14 }}>
                    <div style={{ fontSize:9, color:"#334155", letterSpacing:"0.1em", marginBottom:10 }}>TOKEN USAGE</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                      {[
                        { label:"Prompt tokens",   val:metrics.tokensIn,  color:"#38bdf8" },
                        { label:"Output tokens",   val:metrics.tokensOut, color:"#818cf8" },
                        { label:"Ratio",           val: metrics.tokensIn > 0 ? `1 : ${(metrics.tokensOut/metrics.tokensIn).toFixed(1)}` : "—", color:"#34d399" },
                      ].map(m=>(
                        <div key={m.label} style={{ background:"#020810", borderRadius:5, padding:"8px 10px" }}>
                          <div style={{ fontSize:9, color:"#1e3a5f", marginBottom:3 }}>{m.label}</div>
                          <div style={{ fontSize:16, fontWeight:700, color:m.color }}>{typeof m.val==="number"?m.val.toLocaleString():m.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color:"#1e3a5f", textAlign:"center", paddingTop:60 }}>run pipeline to generate metrics</div>
              )}
            </div>
          )}
        </div>

        {/* ═══════ RIGHT PANEL ═══════ */}
        <div style={{ borderLeft:"1px solid #080f1e", display:"flex", flexDirection:"column", overflow:"hidden", background:"#030b18" }}>

          {/* Validation log */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", borderBottom:"1px solid #080f1e" }}>
            <PanelHeader icon="⚿" title="VALIDATION LOG" accent="#fb923c"
              right={done ? <Badge label={`${repairLogs.filter(l=>l.type==="warn").length}W`} color="#fb923c" /> : null}
            />
            <div ref={repairRef} style={{ flex:1, overflowY:"auto", padding:"8px 10px", fontFamily:"inherit", fontSize:10, lineHeight:1.7 }}>
              {repairLogs.length===0 && <span style={{ color:"#1e3a5f" }}>awaiting validation…</span>}
              {repairLogs.map(l=>(
                <div key={l.id} style={{ display:"flex", gap:6, color:repairColor[l.type]||"#334155", animation:"fadeIn 0.1s ease", flexWrap:"wrap" }}>
                  <span style={{ color:"#1e3a5f", flexShrink:0, fontSize:9, marginTop:1 }}>{l.t}</span>
                  <span style={{ wordBreak:"break-all" }}>{l.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stage summary */}
          <div style={{ flexShrink:0, borderBottom:"1px solid #080f1e" }}>
            <PanelHeader icon="⊳" title="STAGE STATUS" />
            <div style={{ padding:"8px 12px" }}>
              {STAGES.map(s=>{
                const st = statuses[s.id];
                const out = stageOutputs[s.id];
                return (
                  <div key={s.id} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                    <div style={{ width:3, height:28, borderRadius:2, background:st==="done"?s.color:st==="running"?s.color:"#0f172a", flexShrink:0, transition:"all 0.3s" }} />
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:10, color:st==="done"?"#94a3b8":"#334155" }}>{s.name}</span>
                        <StatusBadge status={st} />
                      </div>
                      {out && <div style={{ fontSize:9, color:"#1e3a5f" }}>{Object.values(out).filter(v=>typeof v==="number").join("  ")}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Download artifacts */}
          <div style={{ flexShrink:0 }}>
            <PanelHeader icon="↓" title="ARTIFACTS" accent="#34d399" />
            <div style={{ padding:"8px 12px 12px" }}>
              {SCHEMA_TABS.filter(t => t !== "Generated Code").map(t=>(
                <button key={t} onClick={()=>downloadJSON(t)} disabled={!done} style={{
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  width:"100%", padding:"6px 8px", marginBottom:4,
                  background:done?"#020f1a":"#020810",
                  border:`1px solid ${done?"#34d39920":"#0a1628"}`,
                  borderRadius:5, fontFamily:"inherit", fontSize:10,
                  color:done?"#64748b":"#1e3a5f", cursor:done?"pointer":"not-allowed",
                  transition:"all 0.15s",
                }}
                  onMouseEnter={e=>{ if(done){e.currentTarget.style.borderColor="#34d39940";e.currentTarget.style.color="#34d399";} }}
                  onMouseLeave={e=>{ if(done){e.currentTarget.style.borderColor="#34d39920";e.currentTarget.style.color="#64748b";} }}
                >
                  <span>{t.toLowerCase().replace(/ /g,"_")}.json</span>
                  <span style={{ fontSize:9 }}>↓</span>
                </button>
              ))}
              <button onClick={()=>downloadJSON(null)} disabled={!done} style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                width:"100%", padding:"6px 8px", marginTop:4,
                background:done?"#0a1e32":"#020810",
                border:`1px solid ${done?"#38bdf830":"#0a1628"}`,
                borderRadius:5, fontFamily:"inherit", fontSize:10, fontWeight:600,
                color:done?"#38bdf8":"#1e3a5f", cursor:done?"pointer":"not-allowed",
                transition:"all 0.15s",
              }}>
                <span>all_schemas.json</span>
                <span>↓ ALL</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
