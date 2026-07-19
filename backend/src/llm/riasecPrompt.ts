// Prompt + validate dùng chung cho mọi provider LLM chấm RIASEC (NVIDIA NIM, Groq, ...).
// Tách riêng để đổi/thêm provider không làm lệch quy tắc chấm điểm giữa các nơi gọi.

import type { RiasecLetter } from "../profile/riasec.js";

export interface QuestionAnswer {
  id: string;
  dimension: string; // tên nhóm câu hỏi, vd "Sở thích (Interest)"
  question: string;
  answer: string; // câu trả lời tự do của học sinh
}

export interface LetterScore {
  letter: RiasecLetter;
  score: number; // 0..10
  reason: string;
}

/** Kết quả chấm: mỗi câu hỏi → danh sách (chữ RIASEC, điểm, lý do). Chỉ liệt kê chữ có tín hiệu. */
export type RiasecLlmResult = Record<string, LetterScore[]>;

const RIASEC_DEF = `
R (Realistic — Kỹ thuật/thực hành): thích máy móc, tay chân, vận động, cụ thể rõ ràng.
I (Investigative — Nghiên cứu/phân tích): thích phân tích, logic, tìm quy luật, khoa học.
A (Artistic — Sáng tạo/thẩm mỹ): thích sáng tạo, nghệ thuật, ý tưởng mới, biểu đạt cá nhân.
S (Social — Con người/hỗ trợ): thích giúp đỡ, dạy dỗ, kết nối, chăm sóc người khác.
E (Enterprising — Dẫn dắt/kinh doanh): thích thuyết phục, lãnh đạo, tham vọng, ảnh hưởng.
C (Conventional — Quy trình/tổ chức): thích trật tự, chi tiết, quy tắc, dữ liệu có cấu trúc.
`.trim();

export function buildRiasecPrompt(qas: QuestionAnswer[]): string {
  const lines = qas
    .map((qa, i) => `Câu ${i + 1} [${qa.dimension}] "${qa.question}"\nTrả lời: "${qa.answer}"`)
    .join("\n\n");
  return `Bạn là chuyên gia hướng nghiệp, chấm điểm mô hình Holland Code (RIASEC) cho học sinh THPT Việt Nam
dựa trên câu trả lời tự do dưới đây.

${RIASEC_DEF}

QUY TẮC BẮT BUỘC:
- CHỈ dựa vào NỘI DUNG câu trả lời (sở thích, năng lực, giá trị, hành vi, khát vọng).
- TUYỆT ĐỐI không suy luận từ giới tính, tên gọi, địa phương, hoàn cảnh gia đình, tôn giáo — những
  thông tin này KHÔNG có trong câu trả lời và không được giả định.
- Không suy diễn quá những gì học sinh thực sự nói. Câu trả lời ngắn/mơ hồ → chấm điểm thấp hơn hoặc bỏ qua.
- Mỗi câu có thể gợi ý 1-3 chữ RIASEC (không bắt buộc đủ cả 6 chữ mỗi câu).
- Điểm 0-10: 10 = tín hiệu rất rõ ràng và mạnh, 3-5 = tín hiệu nhẹ, dưới 3 thì đừng liệt kê.

Các câu trả lời:

${lines}

Trả về DUY NHẤT một JSON object, key là id câu hỏi (đúng theo thứ tự: ${qas.map((q) => q.id).join(", ")}),
value là mảng {"letter":"R|I|A|S|E|C","score":number,"reason":"lý do ngắn gọn bằng tiếng Việt"}.
Không kèm giải thích ngoài JSON.`;
}

const VALID_LETTERS = new Set(["R", "I", "A", "S", "E", "C"]);

export function validateRiasecResult(raw: unknown, expectedIds: string[]): RiasecLlmResult {
  if (typeof raw !== "object" || raw === null) throw new Error("llm_bad_shape");
  const out: RiasecLlmResult = {};
  for (const id of expectedIds) {
    const entries = (raw as Record<string, unknown>)[id];
    if (!Array.isArray(entries)) {
      out[id] = [];
      continue;
    }
    out[id] = entries
      .filter(
        (e): e is { letter: string; score: number; reason: string } =>
          typeof e === "object" &&
          e !== null &&
          VALID_LETTERS.has((e as any).letter) &&
          typeof (e as any).score === "number"
      )
      .map((e) => ({
        letter: e.letter as RiasecLetter,
        score: Math.max(0, Math.min(10, e.score)),
        reason: typeof e.reason === "string" ? e.reason.slice(0, 300) : "",
      }));
  }
  return out;
}

/** Gọi 1 endpoint chat-completions kiểu OpenAI-compatible (dùng chung cho NVIDIA NIM / Groq). */
export async function callOpenAiCompatibleChat(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  qas: QuestionAnswer[];
  timeoutMs?: number;
  supportsJsonMode?: boolean; // một số NIM endpoint không hỗ trợ response_format json_object
}): Promise<RiasecLlmResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);

  let res: Response;
  try {
    res = await fetch(`${opts.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: 0.2,
        ...(opts.supportsJsonMode === false ? {} : { response_format: { type: "json_object" } }),
        messages: [{ role: "user", content: buildRiasecPrompt(opts.qas) }],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`llm_http_${res.status}: ${body.slice(0, 300)}`);
  }

  const payload = await res.json();
  let content: string | undefined = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("llm_empty_response");

  // Một số model reasoning (vd gpt-oss) có thể bọc JSON trong ```json ... ``` — bóc ra nếu có.
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) content = fenced[1];

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("llm_invalid_json");
  }

  return validateRiasecResult(parsed, opts.qas.map((q) => q.id));
}
