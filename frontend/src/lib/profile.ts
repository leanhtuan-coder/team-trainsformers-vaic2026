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
