// Hồ sơ người dùng — 2 loại tín hiệu (tự khai / có bằng chứng), lưu localStorage.

export interface CareerRec {
  title: string;
  match: number;            // % phù hợp
  why: string;              // vì sao hợp bạn
  skills: string[];         // kỹ năng cần học
  path: string;             // lộ trình học (tuyến + thời gian)
  evidence: string[];       // chip nguồn/bằng chứng
}

export interface UserProfile {
  profile_id?: string;
  name: string;
  region: string;
  level: string;
  // Loại 1 — tự khai
  workStyle: string;        // thích làm việc với gì
  angle: string;            // ngả cụ thể (insight/build/finance...)
  subjects: string[];       // môn mạnh
  values: string[];         // ưu tiên
  studyHorizon: string;     // đường ngắn / cao đẳng / đại học
  dream?: string;
  // Kết quả
  recommendations: CareerRec[];
  completedAt: string;
}

/** Tham chiếu Portal cá nhân — chỉ giữ con trỏ tới hồ sơ backend, dữ liệu thật nằm ở Evidence Ledger. */
export interface PortalRef {
  profile_id: string;
  name: string;
  region: string;
  completedAt: string;
}

const KEY = "cc_profile_v1";
const PORTAL_KEY = "lbn_portal_ref_v1";

export function loadPortalRef(): PortalRef | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PORTAL_KEY);
    return raw ? (JSON.parse(raw) as PortalRef) : null;
  } catch { return null; }
}

export function savePortalRef(ref: PortalRef) {
  localStorage.setItem(PORTAL_KEY, JSON.stringify(ref));
}

export function clearPortalRef() {
  localStorage.removeItem(PORTAL_KEY);
}

export function loadProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch { return null; }
}

export function saveProfile(p: UserProfile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile() {
  localStorage.removeItem(KEY);
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export type DimensionGroup =
  | "ability_skill"
  | "activity_interest"
  | "work_values"
  | "goals_exploration"
  | "context_preferences";

export interface QuickstartQuestion {
  id: string;
  text: string;
  type: "text" | "single" | "multi";
  options?: string[];
  group: DimensionGroup;
  dimension: string;
}

export interface EvidenceClaim {
  group: DimensionGroup;
  dimension: string;
  value: string;
}

export interface EvidenceItem {
  evidence_id: string;
  source_type: "self_report" | "document" | "assessment" | "interaction" | "ai_inference" | string;
  source_ref?: string;
  claims: EvidenceClaim[];
  assessment_detail?: {
    name: string;
    provider: string;
    score: number;
    scale_max: number;
    percentile_top?: number;
    taken_at?: string;
  };
  confidence: "low" | "medium" | "high" | string;
  collected_at: string;
  user_confirmed?: boolean;
  supersedes?: string;
}

export interface ProfileApiResponse {
  snapshot: {
    profile_id: string;
    evidence_coverage: {
      total_evidence: number;
      confirmed_evidence: number;
      groups_with_evidence: number;
      groups_total: number;
    };
  };
  evidence: EvidenceItem[];
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || body?.error || `api_error_${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function createBackendProfile(): Promise<string> {
  const data = await apiJson<{ profile_id: string }>("/profile", { method: "POST" });
  return data.profile_id;
}

export async function getQuickstartQuestions(): Promise<QuickstartQuestion[]> {
  const data = await apiJson<{ questions: QuickstartQuestion[] }>("/profile/quickstart");
  return data.questions;
}

export async function getBackendProfile(profileId: string): Promise<ProfileApiResponse> {
  return apiJson<ProfileApiResponse>(`/profile/${profileId}`);
}

export async function submitQuickstartAnswers(
  profileId: string,
  answers: { question_id: string; answer: string | string[] }[]
) {
  return apiJson(`/profile/${profileId}/quickstart`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

export async function addEvidence(
  profileId: string,
  payload: {
    source_type?: "self_report" | "document" | "interaction" | "ai_inference";
    source_ref?: string;
    confidence?: "low" | "medium" | "high";
    claims: EvidenceClaim[];
    /** ID evidence bị thay thế (đúng nguyên tắc append-only — xem backend routes/profile.ts). */
    supersedes?: string;
  }
) {
  return apiJson(`/profile/${profileId}/evidence`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addAssessment(
  profileId: string,
  payload: {
    name: string;
    provider: string;
    score: number;
    scale_max: number;
    percentile_top?: number;
    taken_at?: string;
    claims?: EvidenceClaim[];
  }
) {
  return apiJson(`/profile/${profileId}/assessment`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// 6 id câu hỏi quickstart tự do (Chặng 1) — phải khớp backend/src/profile/quickstart.ts.
const RIASEC_QUESTION_IDS = [
  "q1-interest",
  "q2-aptitude",
  "q3-value",
  "q4-environment",
  "q5-trait",
  "q6-aspiration",
];

export function hasCompletedOnboarding(profile: ProfileApiResponse): boolean {
  const quickstartCount = profile.evidence.filter(
    (e) => e.source_type === "self_report" && !!e.source_ref && RIASEC_QUESTION_IDS.includes(e.source_ref)
  ).length;

  const hasFullHolland = profile.evidence.some(
    (e) =>
      e.source_type === "assessment" &&
      (e.source_ref?.includes("Trắc nghiệm sở thích nghề nghiệp Holland đầy đủ") ||
       e.assessment_detail?.name === "Trắc nghiệm sở thích nghề nghiệp Holland đầy đủ")
  );

  return quickstartCount >= 3 || hasFullHolland;
}
