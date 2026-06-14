import { useState, useCallback } from "react";
import { now } from "../utils/helpers.js";

export function useCompiler() {
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

  const [promptCache, setPromptCache] = useState(() => {
    try {
      const saved = localStorage.getItem("compiler_prompt_cache");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const addLog = useCallback((msg, type="info") => {
    setLogs(p => [...p.slice(-200), { msg, type, t: now(), id: Math.random() }]);
  }, []);

  const addRepair = useCallback((msg, type="info") => {
    setRepairLogs(p => [...p.slice(-100), { msg, type, t: now(), id: Math.random() }]);
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
    setActiveSchemaTab(0);
    setActiveSubTab("SQL");
    setShowEvalLog(false);
    setActiveMainTab("pipeline");
  }, []);

  return {
    prompt,
    setPrompt,
    statuses,
    setStatuses,
    subSt,
    setSubSt,
    expanded,
    setExpanded,
    running,
    setRunning,
    done,
    setDone,
    activeSchemaTab,
    setActiveSchemaTab,
    activeMainTab,
    setActiveMainTab,
    logs,
    setLogs,
    repairLogs,
    setRepairLogs,
    assumptions,
    setAssumptions,
    metrics,
    setMetrics,
    stageOutputs,
    setStageOutputs,
    runCount,
    setRunCount,
    elapsed,
    setElapsed,
    tokenCount,
    setTokenCount,
    schemas,
    setSchemas,
    activeSubTab,
    setActiveSubTab,
    validationResults,
    setValidationResults,
    evaluationLog,
    setEvaluationLog,
    repairAttempts,
    setRepairAttempts,
    showEvalLog,
    setShowEvalLog,
    promptCache,
    setPromptCache,
    addLog,
    addRepair,
    handleReset
  };
}
