export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const now = () => new Date().toISOString().slice(11, 23);

export function safeParseJson(text) {
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
