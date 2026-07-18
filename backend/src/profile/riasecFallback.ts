// Fallback chấm RIASEC bằng từ khoá — dùng khi chưa cấu hình NVIDIA_API_KEY/GROQ_API_KEY hoặc LLM lỗi.
// Không chặn cứng luồng (rule #1 journey): user vẫn có chân dung sơ bộ, chỉ kém chính xác hơn
// và được gắn nhãn rõ trong "reason" để không đánh lừa là đã được AI chấm.

import type { RiasecLetter } from "./riasec.js";
import type { QuestionAnswer, RiasecLlmResult, LetterScore } from "../llm/riasecPrompt.js";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

// Từ khoá tiếng Việt (đã bỏ dấu) gợi ý từng nhóm RIASEC — dùng đếm số lần khớp trong câu trả lời tự do.
const KEYWORDS: Record<RiasecLetter, string[]> = {
  R: ["may moc", "sua chua", "lap rap", "cu the", "tay chan", "van dong", "the thao", "xay dung", "ngoai troi", "thiet bi", "dung cu"],
  I: ["phan tich", "logic", "nghien cuu", "quy luat", "du lieu", "khoa hoc", "toan", "ly thuyet", "tim hieu", "thi nghiem", "suy luan"],
  A: ["sang tao", "nghe thuat", "ve", "thiet ke", "am nhac", "viet lach", "y tuong moi", "tuong tuong", "doc dao", "tham my", "sang tac"],
  S: ["giup do", "day", "cham soc", "ket noi", "lang nghe", "chia se", "ho tro", "hoa giai", "tinh nguyen", "ban be", "cong dong"],
  E: ["dan dat", "thuyet phuc", "lanh dao", "kinh doanh", "tham vong", "anh huong", "ban hang", "khoi nghiep", "chien luoc", "quyet doan"],
  C: ["ngan nap", "quy trinh", "chi tiet", "can than", "ke hoach", "to chuc", "trat tu", "chinh xac", "quy tac", "so sach", "van ban"],
};

const LETTERS: RiasecLetter[] = ["R", "I", "A", "S", "E", "C"];

/** Chấm 1 câu trả lời bằng đếm từ khoá — trả về điểm 0..8 (thấp hơn trần LLM để phản ánh độ tin cậy thấp hơn). */
function scoreOneAnswer(answer: string): LetterScore[] {
  const t = normalize(answer);
  if (t.trim().length < 3) return [];
  const out: LetterScore[] = [];
  for (const letter of LETTERS) {
    const hits = KEYWORDS[letter].filter((kw) => t.includes(kw)).length;
    if (hits === 0) continue;
    out.push({
      letter,
      score: Math.min(8, hits * 3),
      reason: `[ước lượng từ khoá — chưa có AI thật] khớp ${hits} từ khoá nhóm ${letter}`,
    });
  }
  return out;
}

export function scoreRiasecFallback(qas: QuestionAnswer[]): RiasecLlmResult {
  const out: RiasecLlmResult = {};
  for (const qa of qas) out[qa.id] = scoreOneAnswer(qa.answer);
  return out;
}
