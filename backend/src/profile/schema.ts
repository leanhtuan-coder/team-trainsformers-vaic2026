// Profile Framework ("File A") — xem docs/BA_DESIGN.md §6.2, §6.3.
// Nguyên tắc cốt lõi: hồ sơ KHÔNG lưu kết luận trực tiếp — mọi thứ đi qua Evidence Ledger
// (append-only), rồi Derived Profile Snapshot được TÍNH LẠI từ evidence mỗi lần đọc.
// Không có nhãn tính cách cố định; không có demographic field dùng cho matching (ETH-02).

/** 6 nhóm dimension của Profile Framework (BA_DESIGN.md §6.2). */
export type DimensionGroup =
  | "ability_skill" // năng lực/kỹ năng (kèm evidence, không phải verdict)
  | "activity_interest" // hoạt động thích làm/muốn khám phá
  | "work_values" // giá trị nghề nghiệp (ổn định, thu nhập, sáng tạo...)
  | "goals_exploration" // mục tiêu & trạng thái khám phá
  | "context_preferences"; // thời gian, chi phí, địa lý, hình thức học — preference, đổi được
// Nhóm thứ 6 (evidence_coverage) không phải input — được TÍNH từ ledger, xem DerivedProfileSnapshot.

export type EvidenceSourceType =
  | "self_report" // câu trả lời quickstart / khai báo trực tiếp
  | "document" // trích từ tài liệu user chủ động tải lên (tiểu sử, portfolio...)
  | "assessment" // kết quả bài test/quiz có nguồn
  | "interaction" // insight từ hội thoại AI phỏng vấn
  | "ai_inference"; // suy luận của AI (phải gắn nhãn rõ, tách khỏi lời user nói — ETH-06)

export interface EvidenceClaim {
  group: DimensionGroup;
  /** Tên dimension cụ thể trong nhóm, vd "kỹ năng giao tiếp", "thích làm việc ngoài trời". */
  dimension: string;
  /** Giá trị dạng text — giữ nguyên ngôn ngữ của user khi là self_report. */
  value: string;
}

/** Kết quả bài test/quiz — theo yêu cầu: "được bao điểm trên thang bao nhiêu, top bao nhiêu %, bài nào nguồn nào". */
export interface AssessmentDetail {
  /** Tên bài test, vd "IELTS", "Đánh giá tư duy ĐHQG". */
  name: string;
  /** Nguồn/đơn vị tổ chức — bắt buộc để evidence có provenance (ETH-07). */
  provider: string;
  score: number;
  scale_max: number;
  /** Top % nếu có norm group hợp lệ — không có thì bỏ trống, KHÔNG tự suy (ETH-12). */
  percentile_top?: number;
  taken_at?: string;
}

export interface Evidence {
  evidence_id: string;
  source_type: EvidenceSourceType;
  /** Cái gì tạo ra evidence này: id câu hỏi quickstart, tên file, tên bài test, id phiên chat... */
  source_ref: string;
  claims: EvidenceClaim[];
  assessment_detail?: AssessmentDetail;
  confidence: "low" | "medium" | "high";
  collected_at: string;
  /** User đã xác nhận evidence này chưa — document/ai_inference mặc định false tới khi confirm (ETH-11). */
  user_confirmed: boolean;
  /** Evidence mới thay evidence cũ (không xóa bản cũ — ledger là append-only). */
  supersedes?: string;
  /** Điểm RIASEC do AI (hoặc fallback từ khoá) chấm cho câu trả lời tự do — chỉ có trên evidence
   *  source_type "ai_inference" tạo ra từ profile/riasecScorer.ts. Tách khỏi claims (text tự do)
   *  để không lẫn "fact" (lời user nói) với "inference" (điểm do AI suy ra) — ETH-06. */
  ai_riasec?: { letter: "R" | "I" | "A" | "S" | "E" | "C"; score: number; reason: string }[];
}

/** File A của 1 học sinh: chỉ gồm metadata + Evidence Ledger. Snapshot không lưu, tính khi đọc. */
export interface Profile {
  profile_id: string;
  created_at: string;
  evidence: Evidence[];
}

/** Ước lượng cho 1 dimension trong snapshot — luôn kèm evidence refs để truy vết được. */
export interface DimensionEstimate {
  dimension: string;
  values: { value: string; evidence_refs: string[] }[];
  /** Có evidence mâu thuẫn thì giữ và phơi ra, không average mù (BA_DESIGN.md §6.5). */
  has_conflict: boolean;
}

export interface DerivedProfileSnapshot {
  profile_id: string;
  generated_at: string;
  /** Chỉ tính từ evidence đã user_confirmed (hoặc self_report — user tự nói là tự xác nhận). */
  groups: Record<DimensionGroup, DimensionEstimate[]>;
  evidence_coverage: {
    total_evidence: number;
    confirmed_evidence: number;
    by_source_type: Record<EvidenceSourceType, number>;
    groups_with_evidence: number;
    groups_total: number;
  };
  assessments: (AssessmentDetail & { evidence_id: string })[];
}

export const ALL_GROUPS: DimensionGroup[] = [
  "ability_skill",
  "activity_interest",
  "work_values",
  "goals_exploration",
  "context_preferences",
];
