import {
  classifyEndpoint,
  mapEndpointToEntity,
  logEndpointMapping,
  findExistingTable,
  createDefaultTable,
  inferColumnType
} from "./classification.js";

export const isDeterministicMappingFailure = (failure) =>
  failure.startsWith("No matching table for API endpoint");

export const applyApiDbDeterministicRepairs = (db, api, addRepairFn = null) => {
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

// Safely alias applyApiDbRepair to applyApiDbDeterministicRepairs
export const applyApiDbRepair = applyApiDbDeterministicRepairs;

export const matchRoute = (pageRoute, apiPath) => {
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

export const validateApiDb = (db, api) => {
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

export const validateUiApi = (ui, api) => {
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

export const validateRoleConsistency = (ui, design) => {
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

export const runValidationChecks = (db, api, ui, design) => {
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

export const computeSchemaDiff = (before, after) => {
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
    if (!beforeRoles[role]) {
      changes.push(`Deleted role '${role}' from System Design permissions`);
    }
  }
  
  return changes;
};

export const countValidationErrors = (checks) =>
  (checks || []).reduce((n, c) => n + (c.failures?.length || 0), 0);

export const computeRunStatus = (statuses, done, allPassed) => {
  if (Object.values(statuses).some((s) => s === "error")) return "FAILED";
  if (!done) return null;
  return allPassed ? "SUCCESS" : "PARTIAL";
};
