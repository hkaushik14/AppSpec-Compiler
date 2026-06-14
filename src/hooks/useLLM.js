import { useState, useCallback } from "react";
import { callGeminiWithRetry } from "../services/ai/gemini.js";

export function useLLM(onApiCall, onTokens) {
  const [apiKey, setApiKeyState] = useState(() => {
    return localStorage.getItem("gemini_api_key") || import.meta.env.VITE_GEMINI_API_KEY || "";
  });

  const setApiKey = useCallback((val) => {
    setApiKeyState(val);
    localStorage.setItem("gemini_api_key", val);
  }, []);

  const callLLM = useCallback(async (systemPrompt, userContent, jsonMode = true) => {
    return await callGeminiWithRetry(
      systemPrompt,
      userContent,
      apiKey,
      jsonMode,
      onApiCall,
      onTokens
    );
  }, [apiKey, onApiCall, onTokens]);

  return { apiKey, setApiKey, callLLM };
}
