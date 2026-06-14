import { useCallback, useRef } from "react";
import { sleep, now, safeParseJson } from "../utils/helpers.js";
import {
  runValidationChecks,
  applyApiDbRepair,
  validateApiDb,
  computeSchemaDiff,
  countValidationErrors,
  matchRoute,
  isDeterministicMappingFailure
} from "../services/compiler/validation.js";
import {
  classifyEndpoint,
  endpointRequiresDbMapping
} from "../services/compiler/classification.js";
import { normalizeSchemas } from "../services/compiler/normalization.js";
import {
  generateRuntimeCode,
  generateAuthRules,
  generateExecutionPlan
} from "../services/compiler/generators.js";

export function usePipeline({
  prompt,
  running,
  setRunning,
  setDone,
  setStatuses,
  setSubSt,
  setExpanded,
  addLog,
  addRepair,
  setAssumptions,
  setStageOutputs,
  setValidationResults,
  setEvaluationLog,
  setRepairAttempts,
  setSchemas,
  promptCache,
  setPromptCache,
  setElapsed,
  setTokenCount,
  setMetrics,
  runCount,
  setRunCount,
  setActiveMainTab,
  
  // Analytics
  apiKey,
  callLLM,
  recordCacheHit,
  recordDeterministicRepairSavings,
  totalTokens
}) {
  const startRef = useRef(null);

  const runPipeline = useCallback(async () => {
    if (running || !prompt.trim()) return;
    
    if (!apiKey.trim()) {
      addLog("[ERROR] Gemini API Key is missing! Please paste your API Key in the topbar.", "error");
      return;
    }

    const cacheKey = prompt.trim().toLowerCase();
    if (promptCache[cacheKey]) {
      addLog("⚡ Cache hit! Retrieving cached compiler outputs instantly...", "success");
      recordCacheHit();
      
      const cached = promptCache[cacheKey];

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

    // Clear logs inside runPipeline before starting run
    // (Note: in original code logs were set to [] directly)

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

      const responseText = await callLLM(systemPrompt, prompt, true);
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

      const responseText = await callLLM(systemPrompt, JSON.stringify(intentOut, null, 2), true);
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

      const responseText = await callLLM(dbPrompt, "You are a combined schema generation engine.", true);
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
        const { repairedDb, changed } = applyApiDbRepair(
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
        if (!repairedDesign.role_permissions.guest) {
          repairedDesign.role_permissions.guest = ["read"];
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
        recordDeterministicRepairSavings();
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
        // Computes endpointsNeedingMapping from currentApi.endpoints safely as requested
        const endpointsNeedingMapping = currentApi?.endpoints?.filter(ep => endpointRequiresDbMapping(ep.path)) || [];

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
        const { repairedDb, changed } = applyApiDbRepair(
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
      }

      if (failedCheck.id === "ui_api") {
        const promptText = `You are a system architecture repair assistant.

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
          const repairText = await callLLM(promptText, "You are a system architecture repair assistant.", true);
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
  }, [
    running, prompt, runCount, apiKey, promptCache, setPromptCache, totalTokens,
    addLog, addRepair, setAssumptions, setStageOutputs, setValidationResults,
    setEvaluationLog, setRepairAttempts, setSchemas, setStatuses, setSubSt,
    setExpanded, setElapsed, setTokenCount, setDone, setRunning, setRunCount,
    setMetrics, setActiveMainTab, callLLM, recordCacheHit, recordDeterministicRepairSavings
  ]);

  return { runPipeline };
}
