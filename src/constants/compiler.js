export const STAGES = [
  { id: "intent",     num: "01", name: "Intent Extraction",   color: "#38bdf8", icon: "◎" },
  { id: "design",     num: "02", name: "System Design",        color: "#818cf8", icon: "⬡" },
  { id: "schema",     num: "03", name: "Schema Generation",    color: "#34d399", icon: "⊞", subs: ["DB","API","UI"] },
  { id: "validation", num: "04", name: "Validation & Repair",  color: "#fb923c", icon: "⚿" },
];

export const SCHEMA_TABS = ["DB Schema", "API Schema", "UI Schema", "Auth Rules", "Execution Plan", "Generated Code"];

export const ARCH_NODES = [
  { id:"client",   label:"Client",          x:60,  y:160, color:"#38bdf8" },
  { id:"gateway",  label:"API Gateway",     x:200, y:160, color:"#818cf8" },
  { id:"auth",     label:"Auth Service",    x:340, y:80,  color:"#fb923c" },
  { id:"task",     label:"Task Service",    x:340, y:160, color:"#34d399" },
  { id:"notify",   label:"Notify Service",  x:340, y:240, color:"#f472b6" },
  { id:"db",       label:"PostgreSQL",      x:480, y:140, color:"#94a3b8" },
  { id:"redis",    label:"Redis Cache",     x:480, y:220, color:"#fbbf24" },
  { id:"queue",    label:"Bull Queue",      x:480, y:300, color:"#a78bfa" },
];

export const ARCH_EDGES = [
  ["client","gateway"], ["gateway","auth"], ["gateway","task"], ["gateway","notify"],
  ["task","db"], ["task","redis"], ["notify","queue"], ["auth","db"],
];

export const SUGGESTIONS = [
  "Task manager with teams, tags, due dates, email notifications",
  "E-commerce store with cart, Stripe payments, inventory tracking",
  "Real-time chat app with rooms, presence, and message history",
  "SaaS dashboard with multi-tenant billing and usage analytics",
];

export const PLURAL_MAP = {
  user: "users", task: "tasks", team: "teams", tag: "tags",
  notification: "notifications", role: "roles", comment: "comments",
};

export const AUTH_ENDPOINT_SEGMENTS = new Set([
  "register", "login", "logout", "refresh-token", "signin", "signup", "signout"
]);

export const UTILITY_ENDPOINT_SEGMENTS = new Set(["health", "status", "metrics"]);

export const AUTH_ENTITY = "users";

export const PAGE_ENDPOINT_SEGMENTS = new Set([
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
  "login",
  "register",
  "checkout",
  "cart",
  "order-confirmation"
]);

export const RUN_STATUS_COLORS = { SUCCESS: "#34d399", PARTIAL: "#fb923c", FAILED: "#f87171" };
