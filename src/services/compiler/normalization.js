import { PLURAL_MAP } from "../../constants/compiler.js";

export const toSnakeCase = (str) =>
  String(str)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .replace(/__+/g, "_")
    .toLowerCase();

export const singularize = (name) => {
  const s = toSnakeCase(name);
  if (s.endsWith("ies")) return s.slice(0, -3) + "y";
  if (s.endsWith("ses") || s.endsWith("xes") || s.endsWith("ches") || s.endsWith("shes")) return s.slice(0, -2);
  if (s.endsWith("s") && !s.endsWith("ss")) return s.slice(0, -1);
  return s;
};

export const toPluralSnake = (name) => {
  const s = singularize(name);
  if (PLURAL_MAP[s]) return PLURAL_MAP[s];
  if (s.endsWith("y") && !/[aeiou]y$/.test(s)) return s.slice(0, -1) + "ies";
  if (/(s|x|ch|sh)$/.test(s)) return s + "es";
  if (s.endsWith("s")) return s;
  return s + "s";
};

export const canonicalTableName = (name) => toPluralSnake(name);

export const isInvalidField = (field) =>
  /Array<[^>]+>/i.test(String(field)) || /^Array<.+>$/i.test(String(field));

export const standardizeFieldName = (field) => toSnakeCase(field);

export const normalizeColumnType = (colName, colType) => {
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

export const cloneSchema = (obj) => JSON.parse(JSON.stringify(obj ?? {}));

export const renameFieldInList = (fields, report, onLog, ctx) => {
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

export const normalizeDbSchema = (db, report, onLog) => {
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

export const normalizeApiSchema = (api, report, onLog) => {
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

export const normalizeUiSchema = (ui) => cloneSchema(ui);

export function normalizeSchemas(db, api, ui, onLog = () => {}) {
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
