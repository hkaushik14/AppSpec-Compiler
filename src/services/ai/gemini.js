import { sleep } from "../../utils/helpers.js";

export async function callGemini(systemPrompt, userContent, apiKey, jsonMode = true, onCall, onTokens) {
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
  const text = data.choices?.[0]?.message?.content || "";
  return text;
}

export async function callGeminiWithRetry(systemPrompt, userContent, apiKey, jsonMode = true, onCall, onTokens, retries = 3, delay = 1000) {
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
