import type { DimensionGroup } from "./schema.js";

export interface QuickstartQuestion {
  id: string;
  text: string;
  type: "text" | "single" | "multi";
  options?: string[];
  group: DimensionGroup;
  dimension: string;
  /** Mô tả ngắn cho UI + ngữ cảnh cho LLM chấm điểm (không phải chip lựa chọn — câu hỏi tự do). */
  description?: string;
  /** Gợi ý nhóm RIASEC hay gặp ở câu này — CHỈ để mồi ngữ cảnh cho LLM, không ép buộc kết quả. */
  hint_letters?: string;
}

// 6 câu hỏi tự do (Chặng 1 — theo đúng user-jouney.docx): mỗi câu chấm bằng LLM (gpt-oss-120b),
// KHÔNG còn là trắc nghiệm chọn đáp án. Xem profile/riasecScorer.ts.
export const QUICKSTART_QUESTIONS: QuickstartQuestion[] = [
  {
    id: "q1-interest",
    text: "Việc gì khiến bạn quên cả thời gian?",
    type: "text",
    group: "activity_interest",
    dimension: "Sở thích (Interest)",
    description: "Nhóm hứng thú tự nhiên, không \"gồng\"",
    hint_letters: "R / I / A / S — nhóm trội nhất",
  },
  {
    id: "q2-aptitude",
    text: "Điều gì bạn làm dễ mà người khác thấy khó?",
    type: "text",
    group: "ability_skill",
    dimension: "Năng lực (Aptitude)",
    description: "Điểm mạnh bẩm sinh, tách khỏi sở thích",
    hint_letters: "Bất kỳ nhóm nào — nhưng là năng lực thật",
  },
  {
    id: "q3-value",
    text: "Công việc phải có gì bạn mới thấy đáng làm?",
    type: "text",
    group: "work_values",
    dimension: "Giá trị (Value)",
    description: "Động lực cốt lõi → quyết định độ bền với nghề",
    hint_letters: "S (giúp người) / A (sáng tạo) / E (thành đạt) / C (ổn định)",
  },
  {
    id: "q4-environment",
    text: "Bạn làm tốt nhất khi một mình / nhóm / dẫn dắt?",
    type: "text",
    group: "context_preferences",
    dimension: "Môi trường & tương tác (Environment)",
    description: "Bối cảnh làm việc phù hợp",
    hint_letters: "I·R (độc lập) vs S (hợp tác) vs E (dẫn dắt)",
  },
  {
    id: "q5-trait",
    text: "Gặp vấn đề khó, bước đầu tiên bạn làm gì?",
    type: "text",
    group: "ability_skill",
    dimension: "Tính cách hành vi (Trait)",
    description: "Phong cách xử lý, phản xạ tự nhiên",
    hint_letters: "I (phân tích) / S (hỏi) / R (thử ngay) / C (lập kế hoạch)",
  },
  {
    id: "q6-aspiration",
    text: "5 năm nữa muốn được nhìn nhận là ai?",
    type: "text",
    group: "goals_exploration",
    dimension: "Khát vọng & bản sắc (Aspiration)",
    description: "Định hướng dài hạn, ghép chân dung tổng thể",
    hint_letters: "E (ảnh hưởng) / I (chuyên gia) / A (dấu ấn) / S (cống hiến)",
  },
];
