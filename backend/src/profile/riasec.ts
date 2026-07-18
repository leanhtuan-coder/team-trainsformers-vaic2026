// ─── Module chấm Holland Code (RIASEC) ───
// 6 câu tự do (Chặng 1, user-jouney.docx) được chấm bằng LLM (gpt-oss-120b qua Groq — xem
// llm/groq.ts), lưu kết quả có cấu trúc vào evidence.ai_riasec (source_type "ai_inference").
// Không có key/lỗi mạng → fallback đếm từ khoá (riasecFallback.ts), gắn nhãn rõ độ tin cậy thấp hơn.
// Nguyên tắc:
//  - Chỉ dùng tín hiệu sở thích/năng lực/hành vi. TUYỆT ĐỐI không đọc giới tính/địa phương (ETH-02).
//  - Mỗi điểm số kèm "reasons" (evidence + lý do AI/từ khoá) để truy vết minh bạch (ETH-06).
//  - Thiếu dữ liệu thì hạ confidence / báo insufficient_data, không bịa (ETH-04).
//
// Công thức (theo spec BA Canvas):
//   raw_X = Σ (điểm_AI_0-10 × source_weight × sign)
//   chuẩn hoá về thang 0..10 (tương đối theo nhóm điểm cao nhất)
//   confidence = completeness×0.4 + evidence_ratio×0.4 + consistency×0.2

import { buildSnapshot } from "./snapshot.js";
import { QUICKSTART_QUESTIONS } from "./quickstart.js";
import type { Evidence, Profile } from "./schema.js";

export type RiasecLetter = "R" | "I" | "A" | "S" | "E" | "C";
export const RIASEC_LETTERS: RiasecLetter[] = ["R", "I", "A", "S", "E", "C"];

export const RIASEC_LABELS: Record<RiasecLetter, string> = {
  R: "Realistic — Kỹ thuật / thực hành",
  I: "Investigative — Nghiên cứu / phân tích",
  A: "Artistic — Sáng tạo / thẩm mỹ",
  S: "Social — Con người / hỗ trợ",
  E: "Enterprising — Dẫn dắt / kinh doanh",
  C: "Conventional — Quy trình / tổ chức",
};

/** Trọng số theo NGUỒN dữ liệu (spec: dự án 1.5, chứng chỉ 1.3, hành vi 1.2, tự khai 1.0). */
export function sourceWeight(e: Evidence): number {
  switch (e.source_type) {
    case "document": return 1.5; // dự án/portfolio thực tế
    case "assessment": return 1.3; // chứng chỉ / bài test có nguồn
    case "interaction": return 1.2; // hành vi rút ra từ phỏng vấn AI
    case "self_report": return 1.0; // tự khai quickstart
    case "ai_inference": return 1.0; // suy luận AI (đã phải user_confirmed)
    default: return 1.0;
  }
}

const SIGNAL_BASE = 1; // mỗi tín hiệu phá hoà = 1 đơn vị (điểm AI/fallback đã có sẵn thang 0-10)
// 6 id câu hỏi quickstart tự do — nguồn sự thật duy nhất, tránh lệch giữa route/scorer.
const QUICKSTART_IDS = new Set(QUICKSTART_QUESTIONS.map((q) => q.id));
const RIASEC_QUESTION_COUNT = QUICKSTART_QUESTIONS.length; // = 6
const MIN_FULL_ANSWERS = RIASEC_QUESTION_COUNT; // < 6 câu → chỉ là chân dung sơ bộ (E1.2 need_more_info)

export interface RiasecReason {
  source_ref: string; // câu hỏi / bài test tạo ra tín hiệu
  value: string; // đáp án cụ thể
  weight: number; // trọng số nguồn đã áp
  sign: 1 | -1; // + đóng góp / - phản chứng
}

export interface RiasecScore {
  letter: RiasecLetter;
  label: string;
  raw: number; // điểm thô trước chuẩn hoá
  score: number; // 0..10 sau chuẩn hoá
  reasons: RiasecReason[];
}

export interface RiasecResult {
  status: "ok" | "insufficient_data" | "need_more_info" | "need_tiebreaker";
  answered_count: number;
  scores: RiasecScore[]; // 6 nhóm, giảm dần theo score
  holland_code: string | null; // vd "ISC"
  alt_holland_code: string | null; // vd "ISA" khi điểm sát nhau
  missing_axes: RiasecLetter[]; // các nhóm CHƯA có tín hiệu (E1.2 — nêu trục còn thiếu)
  needs_tiebreaker: boolean;
  tiebreaker: { a: RiasecLetter; b: RiasecLetter } | null;
  confidence: {
    score: number; // 0..1
    completeness: number;
    evidence_ratio: number;
    consistency: number;
  };
  conflicts: string[]; // ghi chú mâu thuẫn (giữ, không ghi đè — ETH-06)
  note: string;
}

function isActive(e: Evidence): boolean {
  if (e.source_type === "self_report" || e.source_type === "assessment") return true;
  return e.user_confirmed;
}

export function scoreRiasec(profile: Profile): RiasecResult {
  const superseded = new Set(
    profile.evidence.map((e) => e.supersedes).filter(Boolean) as string[]
  );
  const active = profile.evidence.filter((e) => isActive(e) && !superseded.has(e.evidence_id));

  // ─── Tích luỹ điểm thô theo nhóm RIASEC ───
  const raw: Record<RiasecLetter, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const reasons: Record<RiasecLetter, RiasecReason[]> = { R: [], I: [], A: [], S: [], E: [], C: [] };
  const answeredQuickstart = new Set<string>();

  for (const e of active) {
    // Trắc nghiệm Holland đầy đủ (108 câu)
    if (e.source_ref === "Trắc nghiệm sở thích nghề nghiệp Holland đầy đủ") {
      const weight = sourceWeight(e);
      answeredQuickstart.add("full-holland-test");
      for (const claim of e.claims) {
        const letter = claim.dimension.replace("Holland ", "").toUpperCase() as RiasecLetter;
        if (RIASEC_LETTERS.includes(letter)) {
          const valNum = Number(claim.value) || 0;
          raw[letter] += valNum * weight;
          reasons[letter].push({
            source_ref: e.source_ref,
            value: `Điểm trắc nghiệm đầy đủ: ${valNum}/18`,
            weight,
            sign: 1
          });
        }
      }
      continue;
    }

    // Câu phá hoà (E1.3): claim.value là chữ RIASEC → cộng thẳng, KHÔNG tính vào answered_count.
    if (e.source_ref.startsWith("riasec-tiebreak")) {
      const w = sourceWeight(e);
      for (const claim of e.claims) {
        const L = claim.value as RiasecLetter;
        if (RIASEC_LETTERS.includes(L)) {
          raw[L] += SIGNAL_BASE * w;
          reasons[L].push({ source_ref: e.source_ref, value: `Phá hoà: chọn ${L}`, weight: w, sign: 1 });
        }
      }
      continue;
    }
    if (!QUICKSTART_IDS.has(e.source_ref)) continue; // evidence khác (vd assessment) — không tính RIASEC ở đây

    // self_report của 1 trong 6 câu tự do = "đã trả lời" (dùng cho completeness), KHÔNG tự nó cho điểm —
    // điểm đến từ evidence ai_inference đi kèm (do LLM/fallback chấm, xem dưới).
    if (e.source_type === "self_report") {
      answeredQuickstart.add(e.source_ref);
      continue;
    }

    // ai_inference mang điểm RIASEC đã chấm sẵn (LLM gpt-oss-120b qua Groq, hoặc fallback từ khoá).
    if (e.source_type === "ai_inference" && e.ai_riasec) {
      const weight = sourceWeight(e);
      for (const s of e.ai_riasec) {
        if (!RIASEC_LETTERS.includes(s.letter)) continue;
        raw[s.letter] += s.score * weight;
        reasons[s.letter].push({ source_ref: e.source_ref, value: s.reason || `${s.letter} ${s.score}/10`, weight, sign: 1 });
      }
    }
  }

  const answered_count = answeredQuickstart.size;

  // ─── Edge case: quá ít dữ liệu (< 3 câu) → không xuất Holland Code ───
  if (answered_count < 3) {
    return {
      status: "insufficient_data",
      answered_count,
      scores: RIASEC_LETTERS.map((letter) => ({
        letter, label: RIASEC_LABELS[letter], raw: raw[letter], score: 0, reasons: reasons[letter],
      })),
      holland_code: null,
      alt_holland_code: null,
      missing_axes: [...RIASEC_LETTERS],
      needs_tiebreaker: false,
      tiebreaker: null,
      confidence: { score: 0, completeness: round2(answered_count / RIASEC_QUESTION_COUNT), evidence_ratio: 0, consistency: 0 },
      conflicts: [],
      note: "Chưa đủ dữ liệu (cần ít nhất 3 câu) để tính Holland Code. Hãy hoàn thành thêm khảo sát.",
    };
  }

  // ─── Chuẩn hoá 0..10 (tương đối theo nhóm cao nhất; điểm âm kẹp về 0) ───
  const maxRaw = Math.max(...RIASEC_LETTERS.map((l) => raw[l]), 0);
  const scores: RiasecScore[] = RIASEC_LETTERS.map((letter) => ({
    letter,
    label: RIASEC_LABELS[letter],
    raw: round1(raw[letter]),
    score: maxRaw > 0 ? round1(Math.max(0, (raw[letter] / maxRaw) * 10)) : 0,
    reasons: reasons[letter],
  })).sort((a, b) => b.score - a.score);

  // ─── Holland Code = top 3 trong số nhóm CÓ tín hiệu (>0) ───
  // Không ép đủ 3 chữ từ nhóm rỗng (tránh "bịa type" khi không có bằng chứng — ETH-04).
  const positive = scores.filter((s) => s.score > 0);
  const holland_code = positive.length > 0 ? positive.slice(0, 3).map((s) => s.letter).join("") : null;

  // ─── Tie-breaker: chênh giữa hạng 3 và hạng 4 < 0.5 → hiện cả 2 mã ───
  let alt_holland_code: string | null = null;
  let needs_tiebreaker = false;
  let tiebreaker: { a: RiasecLetter; b: RiasecLetter } | null = null;
  // Chỉ phá hoà khi nhóm hạng 3 thực sự có tín hiệu (>0) — không hỏi giữa 2 nhóm rỗng.
  if (scores.length >= 4 && scores[2].score > 0 && Math.abs(scores[2].score - scores[3].score) < 0.5) {
    needs_tiebreaker = true;
    alt_holland_code = scores.slice(0, 2).map((s) => s.letter).join("") + scores[3].letter;
    tiebreaker = { a: scores[2].letter, b: scores[3].letter };
  }

  // ─── Confidence ───
  const completeness = answered_count / RIASEC_QUESTION_COUNT;

  // evidence_ratio: tỉ lệ có bằng chứng "thật" (assessment/document) chứ không chỉ tự khai.
  const realEvidence = active.filter((e) => e.source_type === "assessment" || e.source_type === "document").length;
  const evidence_ratio = clamp01(realEvidence / Math.max(answered_count, 1) + (realEvidence > 0 ? 0.3 : 0));

  // consistency: 1 - tỉ lệ dimension bị mâu thuẫn (nhiều giá trị khác nhau cho cùng dimension).
  const snapshot = buildSnapshot(profile);
  let totalDims = 0;
  let conflictDims = 0;
  const conflicts: string[] = [];
  for (const group of Object.values(snapshot.groups)) {
    for (const dim of group) {
      totalDims++;
      if (dim.has_conflict) {
        conflictDims++;
        conflicts.push(`Mâu thuẫn ở "${dim.dimension}": ${dim.values.map((v) => v.value).join(" ↔ ")}`);
      }
    }
  }
  const consistency = totalDims > 0 ? 1 - conflictDims / totalDims : 1;

  const confidenceScore = clamp01(completeness * 0.4 + evidence_ratio * 0.4 + consistency * 0.2);

  // Trục còn thiếu = nhóm chưa có tín hiệu (score 0) — dùng cho E1.2 "nêu trục còn thiếu".
  const missing_axes = scores.filter((s) => s.score <= 0).map((s) => s.letter);

  // Status: 3–5 câu → need_more_info (chân dung sơ bộ); đủ nhưng hoà → need_tiebreaker; còn lại ok.
  const status: RiasecResult["status"] =
    answered_count < MIN_FULL_ANSWERS ? "need_more_info" : needs_tiebreaker ? "need_tiebreaker" : "ok";

  return {
    status,
    answered_count,
    scores,
    holland_code,
    alt_holland_code,
    missing_axes,
    needs_tiebreaker,
    tiebreaker,
    confidence: {
      score: round2(confidenceScore),
      completeness: round2(completeness),
      evidence_ratio: round2(evidence_ratio),
      consistency: round2(consistency),
    },
    conflicts,
    note:
      status === "need_more_info"
        ? `Mới trả lời ${answered_count} câu — đây là chân dung sơ bộ, độ tin cậy thấp. Làm thêm khảo sát để chốt Holland Code.`
        : needs_tiebreaker
        ? `Điểm nhóm ${tiebreaker!.a} và ${tiebreaker!.b} sát nhau — chọn 1 câu phá hoà để chốt chữ thứ 3.`
        : positive.length < 3
        ? `Mới có ${positive.length} nhóm sở thích rõ tín hiệu — làm thêm khảo sát để đủ mã Holland 3 chữ.`
        : "Holland Code tính từ khảo sát; mọi điểm số đều truy được về evidence trong 'reasons'.",
  };
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }
