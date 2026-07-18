// Groq — chấm RIASEC bằng gpt-oss-120b, dùng khi có GROQ_API_KEY (dự phòng nếu không dùng NVIDIA).
// Không chặn cứng luồng: lỗi/thiếu key thì caller (routes/profile.ts) tự thử provider khác/fallback.

import { callOpenAiCompatibleChat, type QuestionAnswer, type RiasecLlmResult } from "./riasecPrompt.js";

export type { QuestionAnswer, LetterScore, RiasecLlmResult } from "./riasecPrompt.js";

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function scoreRiasecWithGroq(qas: QuestionAnswer[]): Promise<RiasecLlmResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("groq_not_configured");
  return callOpenAiCompatibleChat({ baseUrl: GROQ_BASE_URL, apiKey, model: GROQ_MODEL, qas });
}
