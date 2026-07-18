// ─── Module chấm Holland Code (RIASEC) — DETERMINISTIC, KHÔNG dùng LLM ───
// Additive lên trên Evidence Ledger: đọc evidence đã có, KHÔNG sửa schema/ledger.
// Nguyên tắc:
//  - Chỉ dùng tín hiệu sở thích/năng lực/hành vi. TUYỆT ĐỐI không đọc giới tính/địa phương (ETH-02).
//  - Mỗi điểm số kèm "reasons" (evidence nào đóng góp) để truy vết minh bạch (ETH-06).
//  - Thiếu dữ liệu thì hạ confidence / báo insufficient_data, không bịa (ETH-04).
//
// Công thức (theo spec BA Canvas):
//   raw_X = Σ (signal_base × source_weight × sign)
//   chuẩn hoá về thang 0..10 (tương đối theo nhóm điểm cao nhất)
//   confidence = completeness×0.4 + evidence_ratio×0.4 + consistency×0.2

import { buildSnapshot } from "./snapshot.js";
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

/** Ánh xạ đáp án quickstart → nhóm RIASEC. Key = question id; giá trị = { sign, options }.
 *  sign = -1 nghĩa là câu phản chứng (né tránh) → TRỪ điểm nhóm tương ứng.
 *  Q9 (độ mở định hướng nghề) cố ý KHÔNG map — nó nuôi "lộ trình/horizon", không phải type RIASEC. */
type OptionMap = Record<string, RiasecLetter[]>;
const RIASEC_MAP: Record<string, { sign: 1 | -1; options: OptionMap }> = {
  "qs-01-object": {
    sign: 1,
    options: {
      "Máy móc, thiết bị, xây dựng thứ gì đó bằng tay": ["R"],
      "Con số, dữ liệu, phân tích": ["I"],
      "Con người: giúp đỡ, chăm sóc, dạy dỗ": ["S"],
      "Ý tưởng, sáng tạo, cái đẹp": ["A"],
    },
  },
  "qs-02-teamrole": {
    sign: 1,
    options: {
      "Đứng ra dẫn dắt, thuyết phục mọi người": ["E"],
      "Lên kế hoạch, sắp xếp cho chạy trơn tru": ["C"],
      "Kết nối, hòa giải, chăm lo cảm xúc nhóm": ["S"],
      "Giải quyết phần khó nhất về kỹ thuật/logic": ["I"],
    },
  },
  "qs-03-satisfaction": {
    sign: 1,
    options: {
      "Sửa được một thứ hỏng / làm ra sản phẩm chạy được": ["R"],
      "Tìm ra quy luật ẩn trong mớ thông tin": ["I"],
      "Thấy người khác tiến bộ/khỏe hơn nhờ mình": ["S"],
      "Tạo ra thứ chưa ai làm, được công nhận": ["A"],
    },
  },
  "qs-04-subject": {
    sign: 1,
    options: {
      "Toán, Lý, Tin": ["I"],
      "Văn, Ngoại ngữ, Sử": ["A"],
      "Sinh, Hóa": ["I"],
      "Mỹ thuật, Âm nhạc, sáng tạo": ["A"],
    },
  },
  "qs-05-building": {
    sign: 1,
    options: {
      "Thứ vô hình: phần mềm, hệ thống, quy trình": ["I"],
      "Thứ sờ được: máy móc, công trình, sản phẩm vật lý": ["R"],
      "Thứ thuộc về con người: trải nghiệm, bài giảng, dịch vụ": ["S"],
      "Thứ thuộc về cái đẹp: hình ảnh, âm thanh, tác phẩm": ["A"],
    },
  },
  "qs-06-strength": {
    sign: 1,
    options: {
      "Giải bài logic/toán khó": ["I"],
      "Viết, thuyết trình, thuyết phục": ["E"],
      "Nhớ chi tiết, làm cẩn thận không sai sót": ["C"],
      "Vẽ, thiết kế, cảm nhận thẩm mỹ": ["A"],
      "Làm tay chân, lắp ráp, sửa chữa": ["R"],
    },
  },
  "qs-07-datahandling": {
    sign: 1,
    options: {
      "Kiểm tra cho khớp, đúng quy tắc, không sai sót": ["C"],
      "Tìm insight, dự đoán xu hướng từ nó": ["I"],
      "Trình bày cho người khác hiểu, kể thành câu chuyện": ["S"],
    },
  },
  "qs-08-environment": {
    sign: 1,
    options: {
      "Ngoài hiện trường, vận động, không ngồi bàn nhiều": ["R"],
      "Văn phòng, ổn định, quy trình rõ ràng": ["C"],
      "Tiếp xúc nhiều người, năng động": ["S"],
      "Tự do, linh hoạt, tự đặt nhịp": ["A"],
    },
  },
  "qs-10-avoid": {
    sign: -1, // phản chứng: né tránh việc gì → trừ điểm nhóm đó
    options: {
      "Ngồi yên một chỗ, lặp đi lặp lại": ["C"],
      "Giao tiếp/thuyết phục người lạ liên tục": ["E", "S"],
      "Làm việc mơ hồ, không có đáp án đúng": ["A"],
      "Áp lực deadline/cạnh tranh cao": ["E"],
    },
  },
};

const SIGNAL_BASE = 1; // mỗi tín hiệu chip = 1 đơn vị (không có LLM chấm 0-10)
// Số câu quickstart ĐÓNG GÓP vào RIASEC (Q9 cố ý loại → nuôi horizon/lộ trình).
// Dùng làm mẫu số cho completeness để không phạt oan người đã trả lời đủ.
const RIASEC_QUESTION_COUNT = Object.keys(RIASEC_MAP).length;
const MIN_FULL_ANSWERS = 6; // < 6 câu → chỉ là chân dung sơ bộ (E1.2 need_more_info)

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
    const map = RIASEC_MAP[e.source_ref];
    if (!map) continue; // evidence không map được sang RIASEC (vd assessment không có claim type) → chỉ tính vào confidence
    answeredQuickstart.add(e.source_ref);
    const weight = sourceWeight(e);
    for (const claim of e.claims) {
      const letters = map.options[claim.value];
      if (!letters) continue;
      for (const letter of letters) {
        raw[letter] += SIGNAL_BASE * weight * map.sign;
        reasons[letter].push({ source_ref: e.source_ref, value: claim.value, weight, sign: map.sign });
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
