// NVIDIA NIM — chấm RIASEC bằng gpt-oss-120b. Dùng chung NVIDIA_API_KEY đã cấu hình sẵn cho
// route /:id/interview (chatbot La Bàn, model Llama 3.1 70B) — cùng base URL, khác model.
// Ưu tiên hơn Groq vì key đã có sẵn trong dự án, không cần đăng ký thêm.
// Nguồn xác nhận model: https://build.nvidia.com/openai/gpt-oss-120b (model id "openai/gpt-oss-120b",
// base URL "https://integrate.api.nvidia.com/v1", OpenAI-compatible chat completions).

import { callOpenAiCompatibleChat, type QuestionAnswer, type RiasecLlmResult } from "./riasecPrompt.js";

const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
const NVIDIA_RIASEC_MODEL = process.env.NVIDIA_RIASEC_MODEL || "openai/gpt-oss-120b";

export function isNvidiaConfigured(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY);
}

export async function scoreRiasecWithNvidia(qas: QuestionAnswer[]): Promise<RiasecLlmResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("nvidia_not_configured");
  return callOpenAiCompatibleChat({ baseUrl: NVIDIA_BASE_URL, apiKey, model: NVIDIA_RIASEC_MODEL, qas });
}
