"use client";

// LUỒNG 2 — Student Portal cá nhân hoá tại /profile/[id]:
// - Tải snapshot + evidence thật từ backend (GET /api/profile/:id)
// - Tính điểm 8 nhóm ngành thế mạnh từ 10 câu quickstart (đặc tả Canvas)
// - Cờ mâu thuẫn (phản chứng Q10 vs Q1-8) + mức độ tin cậy
// - Lộ trình kép song song từ GET /api/profile/:id/pathways (highlight matched_tokens)
// - Form khai báo chứng chỉ/học bạ → POST /api/profile/:id/assessment (Evidence Ledger)

import { useCallback, useEffect, useState, type ReactNode, Suspense, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/ui/Compass";
import { fmtInt, fmtSalaryFromMillions } from "@/lib/format";
import { clearPortalRef, loadPortalRef, savePortalRef, addEvidence } from "@/lib/profile";
import { MarketCharts } from "@/components/dashboard/MarketCharts";
import {
  IconBranch,
  IconCheck,
  IconTrendUp,
  IconChart,
  IconRoute,
  IconChat,
  IconPencil,
  IconGradCap,
  IconBulb,
  IconBriefcase,
  IconCoins
} from "@/components/ui/icons";
import { Loader2, LogOut } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/* ---------------------------------- Kiểu dữ liệu API ---------------------------------- */

interface Claim {
  group: string;
  dimension: string;
  value: string;
}

interface EvidenceItem {
  evidence_id: string;
  source_type: string;
  source_ref?: string;
  claims: Claim[];
  assessment_detail?: {
    name: string;
    provider: string;
    score: number;
    scale_max: number;
    percentile_top?: number;
    taken_at?: string;
  };
  confidence: string;
  collected_at: string;
  supersedes?: string;
}

interface ProfileResponse {
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

interface PathwayCandidate {
  industry: string;
  relevance_score: number;
  matched_profile_evidence: {
    dimension: string;
    value: string;
    matched_tokens: string[];
    evidence_refs: string[];
  }[];
  market_evidence: {
    industry: string;
    posting_count: number;
    demand_share: number;
    entry_level_ratio: number;
    salary: { median_trieu: number; min_trieu: number; max_trieu: number; sample_size: number } | null;
    top_skills: { name: string; count: number }[];
    top_provinces: { name: string; count: number }[];
  };
  ai_explanation?: string;
  ai_reasons?: string[];
  missing_skills?: string[];
  next_step?: string;
  ranking_source?: "ai" | "rule_based";
}

interface PathwayPortfolio {
  is_personalized: boolean;
  candidates: PathwayCandidate[];
  data_limitations: string[];
  prediction?: {
    source: "ai" | "rule_based_fallback";
    model?: string;
    disclaimer?: string;
  };
}

/* ---- Chặng 3: nhánh chức danh cụ thể trong 1 ngành — GET /api/profile/:id/jobs?industry=... ---- */
interface SkillWithTier {
  name: string;
  count: number;
  required_count: number;
  preferred_count: number;
  tier: "buoc_phai_co" | "can_co" | "nen_co";
}

interface JobTitleBranch {
  title: string;
  posting_count: number;
  fit_score: number;
  hiring_volume: "cao" | "vừa" | "thấp";
  recommended: boolean;
  entry_level_ratio: number;
  salary: { median_trieu: number; min_trieu: number; max_trieu: number; sample_size: number } | null;
  top_skills: SkillWithTier[];
}

/* --------------------------------- Tiện ích hiển thị --------------------------------- */

function highlightTokens(text: string, tokens: string[]): ReactNode {
  if (!tokens.length) return text;
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "giu");
  const lower = tokens.map((t) => t.toLowerCase());
  return text.split(re).map((part, i) =>
    lower.includes(part.toLowerCase()) ? (
      <mark key={i} className="rounded bg-accent/20 px-0.5 font-semibold text-accent-dark">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

interface HollandAdvice {
  traits: string[];
  environments: string[];
  actionPlan: string[];
}

function getHollandAdvice(code: string): HollandAdvice {
  const letters = (code || "").split("");
  const traits: string[] = [];
  const environments: string[] = [];
  const actionPlan: string[] = [];

  const traitMap: Record<string, string> = {
    R: "Thích làm việc thực tế với máy móc, công cụ, vận động thể thao hoặc ngoài trời; thẳng thắn và thực tế.",
    I: "Tư duy phân tích, tò mò, thích học hỏi, nghiên cứu khoa học và giải quyết các bài toán logic phức tạp.",
    A: "Sáng tạo, giàu trí tưởng tượng, nhạy cảm thẩm mỹ, thích tự do đổi mới và làm việc tự do.",
    S: "Thân thiện, hòa đồng, dễ thấu hiểu, thích giúp đỡ, truyền đạt thông tin và tư vấn cho người khác.",
    E: "Quyết đoán, thích phiêu lưu, có sức thuyết phục, có kỹ năng lãnh đạo đội nhóm và thương lượng kinh doanh.",
    C: "Tỉ mỉ, cẩn thận, ngăn nắp, làm việc nguyên tắc, có kế hoạch rõ ràng và có thế mạnh xử lý số liệu/văn bản."
  };

  const envMap: Record<string, string> = {
    R: "Ngoài hiện trường, xưởng kỹ thuật, nhà máy sản xuất, môi trường vận động cao.",
    I: "Phòng nghiên cứu, bộ phận phân tích dữ liệu, phòng kỹ thuật thuật toán/logic.",
    A: "Môi trường sáng tạo mở, studio thiết kế, các dự án truyền thông và marketing linh hoạt.",
    S: "Bộ phận nhân sự, tổ chức giáo dục, chăm sóc khách hàng, các tổ chức cộng đồng.",
    E: "Bộ phận kinh doanh, dự án khởi nghiệp, ban quản lý dự án, môi trường đàm phán.",
    C: "Phòng kế toán - tài chính, kiểm toán, hành chính văn phòng ổn định và quy trình rõ ràng."
  };

  const actionMap: Record<string, string> = {
    R: "Thực hành xây dựng sản phẩm vật lý/máy móc nhỏ; tham gia các câu lạc bộ kỹ thuật hoặc khóa học sửa chữa cơ bản.",
    I: "Đầu tư học sâu các công cụ phân tích (Python/Excel nâng cao), thử sức với các bài toán logic hoặc dự án khoa học.",
    A: "Tự xây dựng portfolio cá nhân (Behance, Figma, bài viết sáng tạo), tham gia thiết kế truyền thông giả lập.",
    S: "Tham gia tích cực hoạt động Đoàn/Đội/Tình nguyện viên; rèn luyện kỹ năng lắng nghe chủ động và làm việc nhóm.",
    E: "Thử sức làm nhóm trưởng các dự án trường lớp; học kỹ năng thuyết trình thuyết phục và bán hàng cơ bản.",
    C: "Đạt chứng chỉ Tin học văn phòng (MOS Excel); rèn luyện thói quen lập kế hoạch ngày/tuần ngăn nắp."
  };

  letters.forEach(L => {
    if (traitMap[L]) traits.push(traitMap[L]);
    if (envMap[L]) environments.push(envMap[L]);
    if (actionMap[L]) actionPlan.push(actionMap[L]);
  });

  return {
    traits: traits.slice(0, 2),
    environments: environments.slice(0, 2),
    actionPlan: actionPlan.slice(0, 3)
  };
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

const SOURCE_LABELS: Record<string, { label: string; icon: ReactNode }> = {
  self_report: { label: "Tự khai (khảo sát)", icon: <IconPencil className="w-4 h-4 text-brand shrink-0" /> },
  assessment: { label: "Chứng chỉ / bài đánh giá", icon: <IconGradCap className="w-4 h-4 text-[#3525CD] shrink-0" /> },
  document: { label: "Tài liệu tải lên", icon: <IconBriefcase className="w-4 h-4 text-emerald-600 shrink-0" /> },
  interaction: { label: "Phỏng vấn AI", icon: <IconChat className="w-4 h-4 text-blue-500 shrink-0" /> },
  ai_inference: { label: "AI suy luận", icon: <IconBulb className="w-4 h-4 text-purple-500 shrink-0" /> },
};

const TIMELINE_STEPS = ["Học nền tảng", "Lấy chứng chỉ", "Thực tập", "Việc đầu tiên"];
const MILESTONES: Record<string, string[]> = {
  "đường ngắn": ["Tháng 1–6", "Tháng 6–12", "Tháng 12–15", "Tháng 15–18"],
  "cao đẳng": ["Năm 1", "Năm 2", "Cuối năm 2", "Năm thứ 3"],
  "đại học": ["Năm 1–2", "Năm 2–3", "Năm 3–4", "Sau tốt nghiệp"],
};

function getOwnedSkills(evidenceList: EvidenceItem[], topSkillsList: any[]): Set<string> {
  const owned = new Set<string>();
  const subjects: string[] = [];
  evidenceList.forEach((ev) => {
    if (ev.source_type === "self_report") {
      ev.claims?.forEach((claim) => {
        if (claim.dimension === "môn học hoạt động dễ chịu") {
          subjects.push(claim.value);
        }
      });
    }
  });

  for (const s of topSkillsList) {
    if (subjects.some(sub => sub.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(sub.toLowerCase()))) {
      owned.add(s.name);
    }
  }

  const hasPeopleWorkstyle = evidenceList.some(ev =>
    ev.source_type === "self_report" &&
    ev.claims?.some(c => c.dimension === "đối tượng làm việc cuốn hút" && c.value.toLowerCase().includes("con người"))
  );
  if (hasPeopleWorkstyle) {
    owned.add("Giao tiếp");
    owned.add("Làm việc nhóm");
  }
  return owned;
}

function getSkillsToLearn(portfolio: PathwayPortfolio | null, topSkillsList: any[]): Set<string> {
  const learn = new Set<string>();
  if (!portfolio) return learn;
  for (const c of portfolio.candidates) {
    const skills = c.market_evidence?.top_skills || [];
    for (const skill of skills) {
      for (const t of topSkillsList) {
        if (skill.name?.toLowerCase().includes(t.name?.toLowerCase() || '') || t.name?.toLowerCase().includes(skill.name?.toLowerCase() || '')) {
          learn.add(t.name);
        }
      }
    }
  }
  return learn;
}

function Card({ title, sub, children, className = "" }: { title: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#C7C4D8] bg-white p-5 shadow-sm md:p-6 ${className}`}>
      <h2 className="text-lg font-bold text-[#131B2E]">{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-[#464555]">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ----------------------------- Form khai báo Evidence Ledger ----------------------------- */

function AssessmentForm({ profileId, onSaved }: { profileId: string; onSaved: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [score, setScore] = useState("");
  const [scaleMax, setScaleMax] = useState("");
  const [percentile, setPercentile] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const PRESETS = [
    { label: "IELTS", name: "IELTS", provider: "IDP/BC", scale: "9" },
    { label: "GPA lớp 12", name: "GPA lớp 12", provider: "Học bạ THPT", scale: "10" },
    { label: "SAT", name: "SAT", provider: "College Board", scale: "1600" },
    { label: "Ngoại khóa", name: "Hoạt động ngoại khóa", provider: "Tự khai", scale: "10" },
  ];

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const scoreNum = Number(score);
    const scaleNum = Number(scaleMax);
    if (!name.trim() || !provider.trim() || !Number.isFinite(scoreNum) || !Number.isFinite(scaleNum) || scaleNum <= 0) {
      setNotice({ ok: false, text: "Vui lòng điền đủ Tên, Nguồn cấp, Điểm và Thang điểm hợp lệ." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        provider: provider.trim(),
        score: scoreNum,
        scale_max: scaleNum,
        taken_at: new Date().toISOString(),
      };
      const pct = Number(percentile);
      if (percentile.trim() && Number.isFinite(pct)) body.percentile_top = pct;

      const res = await fetch(`${API_BASE}/profile/${profileId}/assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("submit_failed");

      await onSaved(); // backend đã ghi ledger — tải lại snapshot + pathways ngay tại chỗ
      setName(""); setProvider(""); setScore(""); setScaleMax(""); setPercentile("");
      setNotice({ ok: true, text: "Đã lưu vào Evidence Ledger ✓ — lộ trình học tập của bạn vừa được cập nhật." });
    } catch {
      setNotice({ ok: false, text: "Không lưu được — kiểm tra backend rồi thử lại nhé." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => { setName(p.name); setProvider(p.provider); setScaleMax(p.scale); }}
            className="rounded-full border border-brand/25 bg-brand-light/60 px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-light"
          >
            + {p.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#464555]">
          <span className="mb-1.5 block">Tên chứng chỉ / kết quả *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: IELTS, GPA lớp 12…"
            className="h-[42px] w-full rounded-lg border border-[#C7C4D8] bg-white px-3 text-sm font-normal text-[#131B2E] outline-none transition placeholder:text-slate-400 hover:border-[#777587] focus-visible:border-[#3525CD]" />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#464555]">
          <span className="mb-1.5 block">Nguồn cấp / đơn vị tổ chức *</span>
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="VD: IDP, trường THPT…"
            className="h-[42px] w-full rounded-lg border border-[#C7C4D8] bg-white px-3 text-sm font-normal text-[#131B2E] outline-none transition placeholder:text-slate-400 hover:border-[#777587] focus-visible:border-[#3525CD]" />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#464555]">
          <span className="mb-1.5 block">Điểm đạt được *</span>
          <input value={score} onChange={(e) => setScore(e.target.value)} type="number" step="any" placeholder="VD: 7.5"
            className="h-[42px] w-full rounded-lg border border-[#C7C4D8] bg-white px-3 text-sm font-normal text-[#131B2E] outline-none transition placeholder:text-slate-400 hover:border-[#777587] focus-visible:border-[#3525CD]" />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#464555]">
          <span className="mb-1.5 block">Thang điểm tối đa *</span>
          <input value={scaleMax} onChange={(e) => setScaleMax(e.target.value)} type="number" step="any" placeholder="VD: 9"
            className="h-[42px] w-full rounded-lg border border-[#C7C4D8] bg-white px-3 text-sm font-normal text-[#131B2E] outline-none transition placeholder:text-slate-400 hover:border-[#777587] focus-visible:border-[#3525CD]" />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#464555] md:col-span-2">
          <span className="mb-1.5 block">Top % (không bắt buộc — VD: 5 nghĩa là top 5%)</span>
          <input value={percentile} onChange={(e) => setPercentile(e.target.value)} type="number" step="any" placeholder="VD: 5"
            className="h-[42px] w-full rounded-lg border border-[#C7C4D8] bg-white px-3 text-sm font-normal text-[#131B2E] outline-none transition placeholder:text-slate-400 hover:border-[#777587] focus-visible:border-[#3525CD]" />
        </label>
      </div>
      {notice && (
        <p className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${notice.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {notice.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-[42px] items-center justify-center gap-2 rounded-lg bg-[#3525CD] px-5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#1E00A9] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Đang lưu…" : "Lưu vào Evidence Ledger →"}
      </button>
    </form>
  );
}

/* ------------------------------------ Trang Portal ------------------------------------ */

/* ---- Holland Code (RIASEC) từ GET /api/profile/:id/riasec ---- */
interface RiasecReason { source_ref: string; value: string; weight: number; sign: 1 | -1; }
interface RiasecScore { letter: string; label: string; raw: number; score: number; reasons: RiasecReason[]; }
interface RiasecResult {
  status: "ok" | "insufficient_data" | "need_more_info" | "need_tiebreaker";
  answered_count: number;
  scores: RiasecScore[];
  holland_code: string | null;
  alt_holland_code: string | null;
  missing_axes: string[];
  needs_tiebreaker: boolean;
  tiebreaker: { a: string; b: string } | null;
  confidence: { score: number; completeness: number; evidence_ratio: number; consistency: number };
  conflicts: string[];
  note: string;
}

const RIASEC_GRAD: Record<string, string> = {
  R: "from-orange-400 to-orange-600",
  I: "from-teal-400 to-teal-600",
  A: "from-purple-400 to-purple-600",
  S: "from-pink-400 to-pink-600",
  E: "from-amber-400 to-amber-600",
  C: "from-blue-400 to-blue-600",
};

/** "Mặt trái" của nghề — đặc thù ngành mang tính tham khảo chung (KHÔNG phải số liệu bịa từ hồ sơ).
 *  Ghép thêm 1 lưu ý từ tín hiệu THẬT (entry_level_ratio) khi ngành cạnh tranh cao. */
function careerTradeoffs(industry: string, entryRatio: number): string[] {
  const t: string[] = [];
  const s = industry.toLowerCase();
  if (/bán hàng|kinh doanh|sales/.test(s)) t.push("Áp lực chỉ tiêu doanh số; thu nhập dao động theo kết quả.");
  else if (/cntt|phần mềm|lập trình|dữ liệu|data|công nghệ thông tin/.test(s)) t.push("Công nghệ đổi nhanh, phải học liên tục; nhiều giờ ngồi máy tính.");
  else if (/marketing/.test(s)) t.push("Deadline dồn theo chiến dịch; liên tục đo lường và tối ưu.");
  else if (/kế toán|tài chính|kiểm toán|ngân hàng/.test(s)) t.push("Công việc tỉ mỉ, lặp lại; cao điểm mùa quyết toán.");
  else if (/giáo dục|giảng dạy|sư phạm|đào tạo/.test(s)) t.push("Giao tiếp nhiều, cần kiên nhẫn; áp lực cảm xúc.");
  else if (/sản xuất|kỹ thuật|vận hành|cnc|cơ khí|logistics|kho|xây dựng/.test(s)) t.push("Môi trường hiện trường/ca kíp; chú trọng an toàn lao động.");
  else if (/thiết kế|mỹ thuật|sáng tạo|nghệ thuật/.test(s)) t.push("Chỉnh sửa nhiều vòng; gu thẩm mỹ mang tính chủ quan.");
  else t.push("Nghề nào cũng có giai đoạn áp lực — tìm hiểu kỹ trước khi cam kết.");
  if (entryRatio < 0.2) t.push("Cạnh tranh cao, thường cần bằng cấp/kinh nghiệm — ít cửa cho người mới.");
  return t;
}

function StudentPortalPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const profileId = typeof params?.id === "string" ? params.id : "";
  const activeTab = searchParams.get("tab") || "roadmap";

  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "La Bàn AI đang đọc Evidence Ledger của bạn...",
    "Đang phân tích câu trả lời và tính toán mã Holland...",
    "Đang truy quét dữ liệu tuyển dụng thật từ snapshot thị trường...",
    "Đang sinh lộ trình cá nhân hóa và gợi ý kỹ năng...",
    "Đang hoàn thiện Student Portal cá nhân của bạn..."
  ];

  const [data, setData] = useState<ProfileResponse | null>(null);
  const [portfolio, setPortfolio] = useState<PathwayPortfolio | null>(null);
  const [pathwayError, setPathwayError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [studentName, setStudentName] = useState("Học sinh");
  const [studentRegion, setStudentRegion] = useState<string | null>(null);
  const [topSkills, setTopSkills] = useState<any[]>([]);
  const [riasec, setRiasec] = useState<RiasecResult | null>(null);
  const [rejected, setRejected] = useState<string[]>([]); // ngành đã bấm "Không phải tôi"
  const [selectedIndustries, setSelectedIndustries] = useState<string[] | null>(null);
  const [industryChoice, setIndustryChoice] = useState<{ primary: string; altPick: string } | null>(null);
  const [jobBranches, setJobBranches] = useState<Record<string, JobTitleBranch[] | null>>({});
  const [jobBranchesLoading, setJobBranchesLoading] = useState(false);
  const [marketIndustryFilter, setMarketIndustryFilter] = useState<string | null>(null);

  // Chỉnh sửa hồ sơ (tên/tuổi/giới tính/khu vực) — luôn truy cập được, không chỉ lần đăng nhập đầu.
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editRegion, setEditRegion] = useState("");

  // State chatbot AI La Bàn
  const [messages, setMessages] = useState<any[]>([
    {
      sender: "bot",
      text: "Xin chào! Mình là La Bàn — trợ lý hướng nghiệp AI của bạn.\nMình có thể giúp bạn khám phá nghề nghiệp, lập kế hoạch học tập, hoặc tư vấn kỹ năng cần phát triển. Bạn muốn bắt đầu từ đâu?",
      options: ["Nghề nào phù hợp tôi?", "Lương ngành IT ra sao?", "Làm sao học SQL?"],
      time: "09:42"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/market/snapshot`)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((apiData) => {
        if (apiData.top_skills_required) {
          const totalAnalyzed = apiData.total_jobs || 1332;
          const mapped = apiData.top_skills_required.slice(0, 8).map((s: any) => {
            const pct = Math.round((s.count / totalAnalyzed) * 100);
            return {
              name: s.name,
              pct: pct,
              cluster: "Kỹ năng chuyên môn",
              salary: "Đang cập nhật"
            };
          });
          setTopSkills(mapped);
        }
      })
      .catch((err) => {
        console.error("Lỗi khi tải dữ liệu kỹ năng thật:", err);
      });
  }, []);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(interval);
  }, [loading, loadingMessages.length]);

  const loadAll = useCallback(async () => {
    try {
      const resProfile = await fetch(`${API_BASE}/profile/${profileId}`);
      if (resProfile.status === 404) {
        // Profile không tồn tại trên server (có thể localStorage cũ) → xóa ref, về onboarding
        clearPortalRef();
        router.replace("/");
        return;
      }
      if (!resProfile.ok) throw new Error("profile_load_failed");
      const profileJson = await resProfile.json();
      setData(profileJson as ProfileResponse);

      const resPath = await fetch(`${API_BASE}/profile/${profileId}/pathways`);
      if (resPath.ok) {
        setPortfolio((await resPath.json()) as PathwayPortfolio);
        setPathwayError(null);
      } else {
        const err = await resPath.json().catch(() => null);
        setPathwayError(err?.message || "Chưa tải được gợi ý lộ trình từ backend.");
      }

      const resRia = await fetch(`${API_BASE}/profile/${profileId}/riasec`);
      if (resRia.ok) setRiasec((await resRia.json()) as RiasecResult);
    } catch (err) {
      throw err;
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    const ref = loadPortalRef();
    if (ref && ref.profile_id === profileId) {
      setStudentName(ref.name);
      setStudentRegion(ref.region);
    } else {
      setStudentName("Học sinh");
    }
    loadAll()
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [profileId, loadAll]);

  const handleRetake = () => {
    router.push(`/onboarding?profileId=${profileId}`);
  };

  // Chặng 3 — tải nhánh chức danh cụ thể (dữ liệu thật) cho mỗi ngành đang xem chi tiết.
  const jobBranchesRef = useRef<Record<string, JobTitleBranch[] | null>>({});
  const [selectedJobTitle, setSelectedJobTitle] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!selectedIndustries || selectedIndustries.length === 0 || !profileId) return;
    const toFetch = selectedIndustries.filter((ind) => !(ind in jobBranchesRef.current));
    if (toFetch.length === 0) return;
    setJobBranchesLoading(true);
    Promise.all(
      toFetch.map(async (ind) => {
        try {
          const res = await fetch(`${API_BASE}/profile/${profileId}/jobs?industry=${encodeURIComponent(ind)}`);
          if (!res.ok) return [ind, null] as const;
          const json = await res.json();
          return [ind, (json.branches as JobTitleBranch[]) || []] as const;
        } catch {
          return [ind, null] as const;
        }
      })
    ).then((entries) => {
      entries.forEach(([ind, branches]) => {
        jobBranchesRef.current[ind] = branches;
      });
      setJobBranches({ ...jobBranchesRef.current });
      setJobBranchesLoading(false);
    });
  }, [selectedIndustries, profileId]);

  // Chặng 2: xác nhận lựa chọn ngành từ hộp thoại trắc nghiệm — cập nhật cả tab chi tiết
  // và bộ lọc "Khối ngành" ở tab Tổng quan thị trường theo đúng lựa chọn của học sinh.
  const applyIndustryChoice = (industries: string[], filterAnchor: string) => {
    setSelectedIndustries(industries);
    setMarketIndustryFilter(filterAnchor);
    setIndustryChoice(null);
  };

  // Câu phá hoà (E1.3): user chọn 1 nhóm → ghi evidence, cập nhật RIASEC ngay.
  const handleTiebreak = async (letter: string) => {
    const res = await fetch(`${API_BASE}/profile/${profileId}/riasec/tiebreak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ letter }),
    });
    if (res.ok) setRiasec((await res.json()) as RiasecResult);
  };

  const handleLogout = () => {
    clearPortalRef();
    router.push("/");
  };

  // Tìm evidence self_report MỚI NHẤT (chưa bị supersedes) cho 1 dimension — dùng để "sửa" đúng
  // nguyên tắc append-only: evidence mới sẽ supersedes evidence này thay vì tạo giá trị mâu thuẫn.
  const latestActiveEvidence = (group: string, dimension: string): { id: string; value: string } | null => {
    if (!data) return null;
    const superseded = new Set(data.evidence.map((e) => e.supersedes).filter(Boolean));
    const matches = data.evidence
      .filter((e) => e.source_type === "self_report" && !superseded.has(e.evidence_id))
      .flatMap((e) => e.claims.filter((c) => c.group === group && c.dimension === dimension).map((c) => ({ id: e.evidence_id, value: c.value, at: e.collected_at })));
    if (matches.length === 0) return null;
    matches.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { id: matches[0].id, value: matches[0].value };
  };

  const openEditModal = () => {
    setEditName(latestActiveEvidence("goals_exploration", "tên")?.value || studentName || "");
    setEditAge(latestActiveEvidence("context_preferences", "tuổi")?.value || "");
    setEditGender(latestActiveEvidence("context_preferences", "giới tính")?.value || "");
    setEditRegion(latestActiveEvidence("context_preferences", "vùng miền mong muốn làm việc")?.value || studentRegion || "");
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    try {
      const fields: { group: string; dimension: string; value: string }[] = [
        { group: "goals_exploration", dimension: "tên", value: editName.trim() },
        { group: "context_preferences", dimension: "tuổi", value: editAge.trim() },
        { group: "context_preferences", dimension: "giới tính", value: editGender.trim() },
        { group: "context_preferences", dimension: "vùng miền mong muốn làm việc", value: editRegion.trim() },
      ];
      for (const f of fields) {
        if (!f.value) continue;
        const prev = latestActiveEvidence(f.group, f.dimension);
        if (prev && prev.value === f.value) continue; // không đổi — khỏi ghi evidence thừa
        await addEvidence(profileId, {
          source_type: "self_report",
          source_ref: "profile-edit",
          confidence: "medium",
          claims: [{ group: f.group as any, dimension: f.dimension, value: f.value }],
          ...(prev ? { supersedes: prev.id } : {}),
        });
      }
      savePortalRef({
        profile_id: profileId,
        name: editName.trim() || studentName,
        region: editRegion.trim() || studentRegion || "Toàn quốc",
        completedAt: new Date().toISOString(),
      });
      setStudentName(editName.trim() || studentName);
      setStudentRegion(editRegion.trim() || studentRegion);
      await loadAll();
      setEditOpen(false);
    } catch (err) {
      console.error("Lỗi lưu chỉnh sửa hồ sơ:", err);
    } finally {
      setEditSaving(false);
    }
  };

  const setTab = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  // Bot handler gửi tin nhắn qua backend API thật
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || chatBusy) return;

    const userMsg = {
      sender: "user",
      text: text,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setChatBusy(true);

    try {
      const res = await fetch(`${API_BASE}/profile/${profileId}/interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });

      const botData = await res.json();
      const replyText = botData.reply || "Mình gặp lỗi nhỏ khi xử lý câu hỏi. Bạn hỏi lại nhé!";

      let opts: string[] = ["Nghề nào phù hợp tôi?", "Lương các ngành ra sao?", "Làm sao học SQL?"];
      const query = text.toLowerCase();
      if (query.includes("phù hợp") || query.includes("gợi ý")) {
        opts = portfolio?.candidates.slice(0, 3).map(c => `Ngành ${c.industry}`) || [];
      } else if (query.includes("lương")) {
        opts = portfolio?.candidates.slice(0, 3).map(c => `Lương ${c.industry}`) || [];
      }

      const botMsg = {
        sender: "bot",
        text: replyText,
        options: opts,
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Lỗi chat với bot:", err);
      const errorMsg = {
        sender: "bot",
        text: "Xin lỗi bạn, kết nối của mình với máy chủ AI đang bị gián đoạn. Vui lòng kiểm tra lại backend hoặc thử lại sau.",
        options: ["Thử lại"],
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatBusy(false);
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  /* ----- Trạng thái đặc biệt ----- */
  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8FAFC] px-6 text-center">
        <LogoMark className="h-14 w-14 animate-pulse text-[#005c6d] mb-1" />
        <div className="flex items-center gap-2 text-[#005c6d]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <p className="font-bold text-[#111827] text-sm tracking-wide transition-all duration-300">
            {loadingMessages[loadingStep]}
          </p>
        </div>
        <p className="text-xs text-gray-400 max-w-sm">
          Đang đọc Evidence Ledger · tính điểm thế mạnh · truy quét dữ liệu tuyển dụng thật
        </p>
      </main>
    );
  }

  if (notFound || loadError || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8FAFC] px-6 text-center">
        <LogoMark className="h-14 w-14" />
        <h1 className="text-2xl font-extrabold text-[#131B2E]">
          {notFound ? "Không tìm thấy hồ sơ này" : "Không kết nối được backend"}
        </h1>
        <p className="max-w-md text-sm text-[#464555]">
          {notFound
            ? "Hồ sơ có thể đã bị xoá hoặc đường dẫn không đúng. Hãy làm khảo sát nhanh 10 câu để tạo hồ sơ mới nhé."
            : "Backend đang khởi động hoặc chưa kết nối. Vui lòng thử lại sau 30 giây."}
        </p>
        <Link href="/" className="inline-flex h-[42px] items-center justify-center rounded-lg bg-[#3525CD] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E00A9]">
          ← Về trang chủ làm khảo sát
        </Link>
      </main>
    );
  }

  /* ----- Dữ liệu dẫn xuất ----- */
  // Hiện chân dung (dù sơ bộ) khi có Holland Code — chỉ ẩn khi insufficient_data.
  const riasecReady = riasec && riasec.status !== "insufficient_data" && !!riasec.holland_code;
  const confCls = !riasec
    ? ""
    : riasec.confidence.score >= 0.7
      ? "bg-emerald-100 text-emerald-700"
      : riasec.confidence.score >= 0.4
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  const coverage = data.snapshot.evidence_coverage;
  const assessments = data.evidence.filter((e: any) => e.source_type === "assessment");

  const owned = getOwnedSkills(data.evidence, topSkills);
  const toLearn = getSkillsToLearn(portfolio, topSkills);
  const maxSkillPct = Math.max(...topSkills.map((s) => s.pct), 1);

  // Ứng viên nghề (loại ngành đã "Không phải tôi") — top 3 hiển thị, phần dư làm "Chân trời mới".
  const visibleCandidates = portfolio ? portfolio.candidates.filter((c: any) => !rejected.includes(c.industry)) : [];
  const topCandidates = visibleCandidates.slice(0, 3);
  const horizonCandidates = visibleCandidates.slice(3, 5);

  // Tìm câu trả lời Q9 "độ mở định hướng nghề"
  let horizonVal = "đại học";
  data.evidence.forEach((ev: any) => {
    if (ev.source_type === "self_report") {
      ev.claims?.forEach((claim: any) => {
        if (claim.dimension === "độ mở định hướng nghề") {
          horizonVal = claim.value;
        }
      });
    }
  });

  const horizonKey = horizonVal.toLowerCase().includes("ngắn") || horizonVal.toLowerCase().includes("nghề")
    ? "đường ngắn"
    : horizonVal.toLowerCase().includes("cao đẳng")
      ? "cao đẳng"
      : "đại học";

  const milestones = MILESTONES[horizonKey] ?? MILESTONES["đại học"];

  // Mapping Header titles và buttons
  const HEADER_TITLES: Record<string, string> = {
    market: "Tổng quan thị trường lao động",
    roadmap: "Lộ trình của tôi",
    ledger: "Học bạ & Bảng bằng bằng chứng",
    chat: "Trợ lý AI — La Bàn",
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] font-sans flex overflow-hidden">

      {/* ─── SIDEBAR TRÁI ─── */}
      <aside className="w-64 bg-[#005c6d] text-white flex flex-col h-screen fixed left-0 top-0 z-40 border-r border-[#004b58] flex-shrink-0">
        {/* Logo */}
        <div className="h-16 md:h-20 px-6 border-b border-[#004b58] flex items-center gap-3">
          <LogoMark className="w-9 h-9 text-white shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-wide leading-none">CareerRadar</span>
            <span className="text-[11px] text-white/60 mt-1">La Bàn Nghề</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition text-left text-white/70 hover:text-white mb-4"
          >
            <span className="text-xs font-semibold">← Về trang chủ</span>
          </Link>

          <button
            type="button"
            onClick={() => setTab("market")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition text-left ${activeTab === "market"
              ? "bg-[#004b58] text-white font-semibold shadow-sm"
              : "text-white/80 hover:bg-white/5 hover:text-white"
              }`}
          >
            <div className="flex items-center gap-3">
              <IconChart className="w-4 h-4 text-white/70" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold">Tổng quan</span>
                <span className="text-[10px] text-white/50">Xu thế thị trường</span>
              </div>
            </div>
            {activeTab === "market" && <span className="h-4 w-1 bg-white rounded-full" />}
          </button>

          <button
            type="button"
            onClick={() => setTab("roadmap")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition text-left ${activeTab === "roadmap"
              ? "bg-[#004b58] text-white font-semibold shadow-sm"
              : "text-white/80 hover:bg-white/5 hover:text-white"
              }`}
          >
            <div className="flex items-center gap-3">
              <IconRoute className="w-4 h-4 text-white/70" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold">Lộ trình của tôi</span>
                <span className="text-[10px] text-white/50">Cá nhân hoá</span>
              </div>
            </div>
            {activeTab === "roadmap" && <span className="h-4 w-1 bg-white rounded-full" />}
          </button>

          <button
            type="button"
            onClick={() => setTab("chat")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition text-left ${activeTab === "chat"
              ? "bg-[#004b58] text-white font-semibold shadow-sm"
              : "text-white/80 hover:bg-white/5 hover:text-white"
              }`}
          >
            <div className="flex items-center gap-3">
              <IconChat className="w-4 h-4 text-white/70" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold">Trợ lý AI</span>
                <span className="text-[10px] text-white/50">Chat tư vấn</span>
              </div>
            </div>
            {activeTab === "chat" && <span className="h-4 w-1 bg-white rounded-full" />}
          </button>

          <button
            type="button"
            onClick={() => setTab("ledger")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition text-left ${activeTab === "ledger"
              ? "bg-[#004b58] text-white font-semibold shadow-sm"
              : "text-white/80 hover:bg-white/5 hover:text-white"
              }`}
          >
            <div className="flex items-center gap-3">
              <IconBriefcase className="w-4 h-4 text-white/70" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold">Học bạ & Chứng chỉ</span>
                <span className="text-[10px] text-white/50">Evidence Ledger</span>
              </div>
            </div>
            {activeTab === "ledger" && <span className="h-4 w-1 bg-white rounded-full" />}
          </button>
        </nav>

        {/* User Block */}
        <div className="p-4 border-t border-[#004b58] flex items-center gap-3 bg-[#004e5d]">
          <div className="w-9 h-9 rounded-full bg-[#16a34a] text-white flex items-center justify-center font-bold text-sm">
            {studentName.charAt(0)}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-semibold text-xs truncate">{studentName}</span>
            <span className="text-[10px] text-white/60 truncate">{studentRegion ? `Học sinh · ${studentRegion}` : "Học sinh"}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT CONTAINER (BÊN PHẢI) ─── */}
      <div className="pl-64 flex-1 h-screen overflow-y-auto flex flex-col bg-[#F4F6F8]">

        {/* Header Bar */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-gray-200/70 bg-white sticky top-0 z-30">
          <h1 className="text-lg font-bold text-[#111827]">{HEADER_TITLES[activeTab] || "Student Portal"}</h1>
          <div>
            {activeTab === "roadmap" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-semibold text-[#111827] hover:bg-gray-50 transition"
                >
                  Làm lại khảo sát nhanh
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/holland-test?profileId=${profileId}`)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[#005c6d] bg-[#005c6d] px-3.5 text-xs font-semibold text-white hover:bg-[#004b58] transition"
                >
                  Làm lại trắc nghiệm Holland
                </button>
              </div>
            )}
            {activeTab === "chat" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Trực tuyến
              </span>
            )}
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-6 space-y-6">

          {/* TAB 1: ROADMAP ("Lộ trình của tôi") */}
          {activeTab === "roadmap" && (
            <div className="space-y-6 fade-up">
              {/* Profile Card Header */}
              <div className="rounded-3xl bg-white border border-gray-200/80 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xl">
                    {studentName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#111827]">{studentName}</h2>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      Học sinh{studentRegion ? ` · Khu vực ${studentRegion}` : ""}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {/* Thế mạnh THẬT từ RIASEC — không còn tag bịa cố định */}
                      {riasecReady && riasec!.holland_code ? (
                        riasec!.scores.filter((s) => s.score > 0).slice(0, 3).map((s) => (
                          <span key={s.letter} className="rounded-full bg-teal-50 border border-teal-100 text-teal-700 px-2.5 py-0.5 text-[10px] font-bold">
                            {s.label.split(" — ")[1] || s.label}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-gray-50 border border-gray-200 text-gray-500 px-2.5 py-0.5 text-[10px] font-medium">
                          Chưa đủ khảo sát để hiện thế mạnh
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 text-xs font-bold text-[#111827]"
                >
                  <span className="flex items-center gap-1.5">
                    <IconPencil className="w-3.5 h-3.5 text-[#111827]" />
                    Chỉnh sửa
                  </span>
                </button>
              </div>

              {/* Holland Code (RIASEC) — dữ liệu thật từ backend, deterministic, truy vết được */}
              <Card
                title="Sơ đồ Holland Code (RIASEC)"
                sub="Tính deterministic từ khảo sát — mỗi điểm truy được về bằng chứng; giới tính/địa phương không tham gia chấm điểm."
              >
                {!riasecReady ? (
                  <p className="rounded-xl bg-brand-light/50 px-4 py-3 text-sm text-[#464555]">
                    {riasec?.note || "Chưa đủ dữ liệu khảo sát để tính Holland Code."} Hãy{" "}
                    <Link href={`/holland-test?profileId=${profileId}`} className="font-semibold text-brand underline">làm khảo sát</Link> để xem sơ đồ.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {/* E1.2 — chân dung sơ bộ khi mới 3–5 câu */}
                    {riasec!.status === "need_more_info" && (
                      <div className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                        Đây mới là <b>chân dung sơ bộ</b> (độ tin cậy thấp).
                        {riasec!.missing_axes.length > 0 && (
                          <> Còn thiếu tín hiệu ở nhóm: <b>{riasec!.missing_axes.join(", ")}</b>.</>
                        )}{" "}
                        <Link href={`/holland-test?profileId=${profileId}`} className="font-semibold underline">Làm thêm khảo sát</Link> để chốt Holland Code.
                      </div>
                    )}

                    {/* Mã Holland + độ tin cậy */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-3xl font-extrabold tracking-tight text-[#005c6d]">{riasec!.holland_code}</span>
                        {riasec!.alt_holland_code && (
                          <span className="text-sm text-ink-soft">hoặc <b className="text-ink">{riasec!.alt_holland_code}</b></span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink-soft">Độ tin cậy</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${confCls}`}>
                          {Math.round(riasec!.confidence.score * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* 6 nhóm RIASEC (thang 0–10) */}
                    <div className="grid gap-2.5">
                      {riasec!.scores.map((s) => (
                        <div key={s.letter} className="flex items-center gap-3 text-sm">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#005c6d]/10 text-xs font-extrabold text-[#005c6d]">
                            {s.letter}
                          </span>
                          <span className="w-40 shrink-0 truncate text-ink" title={s.label}>
                            {s.label.split(" — ")[1] || s.label}
                          </span>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`grow-bar h-full rounded-full bg-gradient-to-r ${RIASEC_GRAD[s.letter] || "from-teal-400 to-teal-600"} ${s.score <= 0 ? "opacity-20" : ""}`}
                              style={{ width: `${Math.max(s.score * 10, 2)}%` }}
                            />
                          </div>
                          <span className="w-8 shrink-0 text-right tabular-nums text-ink-soft">{s.score}</span>
                        </div>
                      ))}
                    </div>

                    {/* Chi tiết độ tin cậy */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
                      <span>Hoàn thành khảo sát: <b className="text-ink">{Math.round(riasec!.confidence.completeness * 100)}%</b></span>
                      <span>Có bằng chứng thật: <b className="text-ink">{Math.round(riasec!.confidence.evidence_ratio * 100)}%</b></span>
                      <span>Nhất quán: <b className="text-ink">{Math.round(riasec!.confidence.consistency * 100)}%</b></span>
                    </div>

                    {/* E1.3 — câu phá hoà khi 2 nhóm sát điểm */}
                    {riasec!.needs_tiebreaker && riasec!.tiebreaker && (
                      <div className="rounded-xl border border-brand/30 bg-brand-light/40 p-3.5">
                        <p className="text-xs font-semibold text-brand">Hai nhóm đang sát điểm — chọn giúp mình 1 câu để chốt chữ thứ 3:</p>
                        <div className="mt-2.5 grid grid-cols-2 gap-2">
                          {[riasec!.tiebreaker.a, riasec!.tiebreaker.b].map((L) => {
                            const sc = riasec!.scores.find((s) => s.letter === L);
                            return (
                              <button
                                key={L}
                                type="button"
                                onClick={() => handleTiebreak(L)}
                                className="rounded-lg border border-brand/30 bg-white px-3 py-2.5 text-xs font-semibold text-brand transition hover:bg-brand hover:text-white active:scale-[0.98]"
                              >
                                {sc?.label.split(" — ")[1] || L}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Mâu thuẫn — giữ lại, không tự xóa (ETH-06) */}
                    {riasec!.conflicts.length > 0 && (
                      <div className="rounded-xl bg-[#FBF1DD] px-3.5 py-2.5 text-xs text-[#8A5B06]">
                        <p className="font-bold">Điểm đáng khám phá (mâu thuẫn — giữ lại để bạn tự quyết):</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                          {riasec!.conflicts.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Phân tích Cá nhân hóa & Khuyến nghị */}
                    {riasec!.holland_code && (
                      <div className="rounded-xl border border-[#005c6d]/20 bg-[#005c6d]/5 p-4 space-y-3.5">
                        <h4 className="text-xs font-extrabold text-[#005c6d] uppercase tracking-wider flex items-center gap-1.5">
                          <IconBulb className="w-4 h-4 text-[#005c6d]" />
                          Phân tích thế mạnh từ Holland Code ({riasec!.holland_code})
                        </h4>

                        <div className="grid gap-3 text-xs md:grid-cols-2">
                          <div className="space-y-1">
                            <p className="font-bold text-[#111827]">Thế mạnh & Hành vi:</p>
                            <ul className="list-disc pl-4 space-y-1 text-ink-soft">
                              {getHollandAdvice(riasec!.holland_code).traits.map((t, idx) => (
                                <li key={idx}>{t}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-1">
                            <p className="font-bold text-[#111827]">Môi trường phù hợp:</p>
                            <ul className="list-disc pl-4 space-y-1 text-ink-soft">
                              {getHollandAdvice(riasec!.holland_code).environments.map((e, idx) => (
                                <li key={idx}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="border-t border-dashed border-[#005c6d]/20 pt-3 text-xs">
                          <p className="font-bold text-[#111827] mb-1.5">Gợi ý Kế hoạch Hành động của bạn:</p>
                          <ol className="list-decimal pl-4 space-y-1 text-[#005c6d]">
                            {getHollandAdvice(riasec!.holland_code).actionPlan.map((act, idx) => (
                              <li key={idx} className="font-medium">{act}</li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}

                    {/* Vì sao — truy vết bằng chứng (ETH-06) */}
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-semibold text-brand hover:underline">
                        Vì sao có kết quả này? (bằng chứng từng nhóm)
                      </summary>
                      <div className="mt-2 space-y-1.5">
                        {riasec!.scores.filter((s) => s.reasons.length > 0).map((s) => (
                          <p key={s.letter} className="text-xs leading-relaxed">
                            <span className="mr-1 font-bold text-[#005c6d]">{s.letter}</span>
                            <span className="text-ink-soft">
                              {s.reasons.map((r) => `${r.sign < 0 ? "− " : ""}${r.value}`).join(" · ")}
                            </span>
                          </p>
                        ))}
                      </div>
                    </details>

                    <p className="text-[11px] text-ink-soft">{riasec!.note}</p>

                    <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                      <span className="text-gray-400 text-[10px]">Bạn muốn cập nhật kết quả mới?</span>
                      <Link href={`/holland-test?profileId=${profileId}`} className="font-bold text-[#005c6d] hover:underline">
                        Làm lại trắc nghiệm Holland đầy đủ →
                      </Link>
                    </div>
                  </div>
                )}
              </Card>

              {/* E1.5 — mời làm bài đánh giá chuẩn để nâng độ tin cậy (đã xác minh > tự khai) */}
              {riasecReady && riasec!.confidence.evidence_ratio < 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-gradient-to-r from-brand-light/60 to-white p-4">
                  <div>
                    <p className="text-sm font-bold text-ink">Muốn kết quả chắc chắn hơn?</p>
                    <p className="text-xs text-ink-soft">
                      Làm bài đánh giá chuẩn / khai chứng chỉ — bằng chứng đã xác minh sẽ nâng độ tin cậy (nguyên tắc: đã xác minh {">"} tự khai).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab("ledger")}
                    className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
                  >
                    Làm bài đánh giá chuẩn →
                  </button>
                </div>
              )}

              {/* 3 CARD GỢI Ý NGHỀ NGHIỆP DÀN NGANG (MD:GRID-COLS-3) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-[#111827]">
                    {selectedIndustries && selectedIndustries.length > 1
                      ? `So sánh ${selectedIndustries.length} ngành`
                      : selectedIndustries && selectedIndustries.length === 1
                        ? `Chi tiết ngành: ${selectedIndustries[0]}`
                        : "Nghề nghiệp phù hợp với bạn"}
                  </h3>
                  <span className="text-xs text-[#9CA3AF] font-medium flex items-center gap-1">
                    <IconRoute className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    Xếp theo độ phù hợp
                  </span>
                </div>

                {pathwayError ? (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{pathwayError}</p>
                ) : !portfolio ? (
                  <p className="text-sm text-gray-500">Đang tải gợi ý lộ trình…</p>
                ) : !selectedIndustries || selectedIndustries.length === 0 ? (
                  /* ─── CHẶNG 2: DANH SÁCH NGÀNH PHÙ HỢP ─── */
                  <div className="space-y-6">
                    {topCandidates.length === 0 ? (
                      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Bạn đã bỏ qua tất cả gợi ý.{" "}
                        <button type="button" onClick={() => setRejected([])} className="font-semibold underline">Khôi phục danh sách</button>{" "}
                        hoặc làm lại khảo sát để có hướng mới.
                      </p>
                    ) : (
                      <div className="grid gap-5 md:grid-cols-3">
                        {topCandidates.map((c: any) => {
                          const entryPct = Math.round((c.market_evidence?.entry_level_ratio ?? 0) * 100);
                          const vocationalFriendly = (c.market_evidence?.entry_level_ratio ?? 0) >= 0.25;
                          const gapSkill = c.market_evidence?.top_skills?.find((s: any) => !owned.has(s.name));
                          const suggestedGapSkill = c.missing_skills?.[0] || gapSkill?.name;
                          return (
                            <article key={c.industry} className="rounded-2xl border border-gray-200/80 bg-white p-5 flex flex-col shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-brand/40">
                              {/* Header */}
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <span className="inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                                    {c.ranking_source === "ai" ? "AI đề xuất" : "Gợi ý tham khảo"}
                                  </span>
                                  <h4 className="mt-2 text-base font-extrabold text-[#111827] leading-tight">{c.industry}</h4>
                                </div>
                                <div className="relative flex items-center justify-center w-11 h-11 rounded-full border-[3px] border-[#16a34a] text-[#16a34a] font-bold text-xs shrink-0">
                                  {c.relevance_score}%
                                  <span className="absolute -bottom-5 text-[8px] text-[#9CA3AF] uppercase whitespace-nowrap">phù hợp</span>
                                </div>
                              </div>

                              <div className="mt-4 space-y-2.5 text-xs flex-1">
                                {/* 1 · Vì em */}
                                <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3">
                                  <p className="font-bold uppercase tracking-wider text-[10px] text-teal-800">1 · Vì em</p>
                                  <p className="mt-1 leading-relaxed text-[#005c6d]">
                                    {c.ai_explanation && (
                                      <span className="mb-2 block font-semibold italic text-[#005c6d]/90 border-b border-teal-100 pb-1.5">&ldquo;{c.ai_explanation}&rdquo;</span>
                                    )}
                                    {c.matched_profile_evidence.length > 0 ? (
                                      <>&ldquo;{highlightTokens(c.matched_profile_evidence[0].value, c.matched_profile_evidence[0].matched_tokens)}&rdquo;</>
                                    ) : (
                                      "Chưa đủ bằng chứng khớp trực tiếp — làm thêm khảo sát/bổ sung hồ sơ để rõ hơn."
                                    )}
                                    {riasecReady && riasec!.holland_code && (
                                      <span className="mt-1 block text-ink-soft">Nhóm sở thích của em: <b>{riasec!.holland_code}</b>.</span>
                                    )}
                                  </p>
                                </div>

                                {/* 2 · Vì thị trường */}
                                <div className="rounded-xl bg-gray-50 p-3">
                                  <p className="font-bold uppercase tracking-wider text-[10px] text-gray-500">2 · Vì thị trường</p>
                                  <ul className="mt-1 space-y-0.5 text-[#111827]">
                                    <li>· <b>{fmtInt(c.market_evidence?.posting_count ?? 0)}</b> tin tuyển (trong snapshot)</li>
                                    <li>
                                      · Lương tham chiếu:{" "}
                                      <b className="text-[#005c6d]">
                                        {c.market_evidence?.salary ? (
                                          riasec && riasec.confidence.evidence_ratio > 0 ? (
                                            `${fmtSalaryFromMillions(c.market_evidence.salary.min_trieu)} - ${fmtSalaryFromMillions(c.market_evidence.salary.max_trieu)}/tháng`
                                          ) : (
                                            `${fmtSalaryFromMillions(c.market_evidence.salary.min_trieu)} - ${fmtSalaryFromMillions(c.market_evidence.salary.median_trieu)}/tháng`
                                          )
                                        ) : (
                                          "Thỏa thuận"
                                        )}
                                      </b>
                                      {c.market_evidence?.salary && (
                                        <span className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${riasec && riasec.confidence.evidence_ratio > 0
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : "bg-amber-50 text-amber-700 border border-amber-200"
                                          }`}>
                                          {riasec && riasec.confidence.evidence_ratio > 0 ? "Đã xác minh" : "Sơ khởi"}
                                        </span>
                                      )}
                                    </li>
                                    <li>· <b>{entryPct}%</b> tin nhận người mới</li>
                                  </ul>
                                </div>

                                {/* 3 · Nhiều đường đến */}
                                <div className="rounded-xl bg-gray-50 p-3">
                                  <p className="font-bold uppercase tracking-wider text-[10px] text-gray-500">3 · Nhiều đường đến</p>
                                  <ul className="mt-1 space-y-0.5 text-[#111827]">
                                    <li className="flex items-center gap-1.5"><IconGradCap className="w-3 h-3 text-[#9CA3AF] shrink-0" /> Đại học chính quy (4–5 năm)</li>
                                    <li className="flex items-center gap-1.5"><IconBriefcase className="w-3 h-3 text-[#9CA3AF] shrink-0" /> Cao đẳng / Trung cấp nghề (2–3 năm){vocationalFriendly ? " · khá rộng cửa" : ""}</li>
                                  </ul>
                                </div>

                                {/* 4 · Mặt trái */}
                                <div className="rounded-xl bg-[#FBF1DD]/60 p-3">
                                  <p className="font-bold uppercase tracking-wider text-[10px] text-[#8A5B06]">4 · Mặt trái (đặc thù ngành)</p>
                                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[#8A5B06]">
                                    {careerTradeoffs(c.industry, c.market_evidence?.entry_level_ratio ?? 0).map((tr, i) => <li key={i}>{tr}</li>)}
                                  </ul>
                                </div>

                                {/* 5 · Nếu — thì */}
                                <div className="rounded-xl border border-brand/20 bg-brand-light/40 p-3">
                                  <p className="font-bold uppercase tracking-wider text-[10px] text-brand">5 · Nếu — thì</p>
                                  <p className="mt-1 leading-relaxed text-ink">
                                    {c.next_step ? (
                                      <>{c.next_step}</>
                                    ) : suggestedGapSkill ? (
                                      <>Nếu em học thêm <b>{suggestedGapSkill}</b> → hồ sơ khớp ngành này rõ hơn.</>
                                    ) : (
                                      <>Em đã có nhiều kỹ năng cốt lõi — làm 1 dự án nhỏ để minh chứng là đủ mạnh.</>
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Xem chi tiết ngành (Chặng 2 → hộp thoại chọn ngành phân tích) */}
                              <button
                                type="button"
                                onClick={() => {
                                  const others = [...topCandidates, ...horizonCandidates].filter((x: any) => x.industry !== c.industry);
                                  setIndustryChoice({ primary: c.industry, altPick: others[0]?.industry || c.industry });
                                }}
                                className="mt-4 w-full rounded-xl bg-[#005c6d] hover:bg-[#004b58] py-2.5 text-xs font-bold text-white transition active:scale-[0.98]"
                              >
                                Xem chi tiết & kỹ năng cần có →
                              </button>

                              {/* Quyền từ chối */}
                              <button
                                type="button"
                                onClick={() => setRejected((r) => [...r, c.industry])}
                                className="mt-2 w-full rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-400 transition hover:border-red-200 hover:bg-red-50/30 hover:text-red-400 active:scale-[0.98]"
                              >
                                Không phải tôi / Muốn hướng khác
                              </button>
                            </article>
                          );
                        })}
                      </div>
                    )}

                    {/* Chân trời mới */}
                    {horizonCandidates.length > 0 && (
                      <div className="space-y-3 pt-4">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <IconBulb className="w-4 h-4 text-[#005c6d]" />
                          <h3 className="text-base font-extrabold text-[#111827]">Chân trời mới</h3>
                          <span className="text-xs text-ink-soft">— nghề bạn có thể chưa nghĩ tới, nhưng kỹ năng khá gần với hồ sơ hiện tại</span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {horizonCandidates.map((c: any) => (
                            <div key={c.industry} className="rounded-2xl border border-dashed border-[#005c6d]/30 bg-[#005c6d]/5 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <h4 className="font-bold text-[#111827]">{c.industry}</h4>
                                <span className="shrink-0 text-xs font-bold text-brand">{c.relevance_score}% phù hợp</span>
                              </div>
                              <p className="mt-1 text-xs text-ink-soft">
                                {fmtInt(c.market_evidence?.posting_count ?? 0)} tin · lương{" "}
                                {c.market_evidence?.salary ? `${fmtSalaryFromMillions(c.market_evidence.salary.median_trieu)}/tháng` : "thỏa thuận"}
                              </p>
                              <p className="mt-1.5 text-xs text-ink">
                              Kỹ năng gần: {c.market_evidence?.top_skills?.slice(0, 3).map((s: any) => s.name).join(", ") || "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ─── Chi tiết ngành: 100% số liệu thật từ market_evidence (không có RAG job-title
                     level trong dữ liệu nguồn, nên KHÔNG hiển thị "job title" bịa — chỉ chi tiết
                     ngành, dữ liệu vốn đã tính sẵn ở Chặng 2). ─── */
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => { setSelectedIndustries(null); setIndustryChoice(null); }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005c6d] hover:underline"
                      >
                        ← Quay lại danh sách ngành phù hợp
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("market")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                      >
                        Xem xu hướng ngành này trên Tổng quan thị trường →
                      </button>
                    </div>

                    <div className={selectedIndustries.length > 1 ? "grid gap-6 xl:grid-cols-2" : ""}>
                      {selectedIndustries.map((industryName) => {
                        const c = [...topCandidates, ...horizonCandidates].find((x: any) => x.industry === industryName);
                        if (!c) {
                          return (
                            <p key={industryName} className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                              Không tìm thấy dữ liệu ngành {industryName}.
                            </p>
                          );
                        }
                        const skills = c.market_evidence?.top_skills ?? [];
                        const salary = c.market_evidence?.salary;
                        const branches = jobBranches[industryName];
                        const activeTitle = selectedJobTitle[industryName] || null;
                        const activeBranch = branches?.find((b) => b.title === activeTitle) || null;
                        const TIER_META: Record<string, { label: string; cls: string }> = {
                          buoc_phai_co: { label: "Buộc phải có", cls: "bg-red-50 text-red-700 border-red-200" },
                          can_co: { label: "Cần có", cls: "bg-amber-50 text-amber-700 border-amber-200" },
                          nen_co: { label: "Nên có", cls: "bg-blue-50 text-blue-700 border-blue-200" },
                        };

                        return (
                          <div key={industryName} className="space-y-4 rounded-2xl border border-gray-200/60 bg-[#F4F6F8]/40 p-4">
                            {selectedIndustries.length > 1 && (
                              <h4 className="text-sm font-extrabold text-[#111827]">{industryName}</h4>
                            )}

                            {/* Chặng 3: nhánh chức danh cụ thể — 100% từ tin tuyển dụng thật */}
                            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm space-y-3">
                              <h3 className="font-bold text-ink text-base">Các vị trí cụ thể trong {industryName}</h3>
                              <p className="text-xs text-ink-soft">
                                Nhóm theo từ khoá chức danh xuất hiện trong tin tuyển dụng thật — bấm 1 vị trí để xem kỹ năng cần theo mức ưu tiên.
                              </p>
                              {jobBranchesLoading && !branches ? (
                                <p className="text-xs text-ink-soft">Đang tải các vị trí cụ thể…</p>
                              ) : !branches || branches.length === 0 ? (
                                <p className="text-xs text-ink-soft">Chưa đủ dữ liệu để tách vị trí cụ thể cho ngành này — xem thông tin ngành tổng quát bên dưới.</p>
                              ) : (
                                <div className="grid gap-2.5 sm:grid-cols-2">
                                  {branches.map((b) => {
                                    const active = activeTitle === b.title;
                                    return (
                                      <button
                                        key={b.title}
                                        type="button"
                                        onClick={() => setSelectedJobTitle((prev) => ({ ...prev, [industryName]: active ? null : b.title }))}
                                        className={`text-left rounded-xl border p-3 transition ${active ? "border-[#005c6d] bg-[#e6f1fb]" : "border-gray-200 bg-gray-50/50 hover:border-[#005c6d]/40"}`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <span className="font-bold text-xs text-[#111827]">{b.title}</span>
                                          <span className="shrink-0 text-[10px] font-bold text-[#16a34a]">{b.fit_score}% phù hợp</span>
                                        </div>
                                        {b.recommended && (
                                          <span className="mt-1 inline-block rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[9px] font-bold">
                                            ✓ Nên bắt đầu từ đây
                                          </span>
                                        )}
                                        <p className="mt-1 text-[10px] text-ink-soft">
                                          {fmtInt(b.posting_count)} tin · tuyển dụng {b.hiring_volume}
                                          {b.salary ? ` · ${fmtSalaryFromMillions(b.salary.min_trieu)}-${fmtSalaryFromMillions(b.salary.max_trieu)}` : ""}
                                        </p>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="grid gap-5 lg:grid-cols-12">
                              {/* Chặng 4: kỹ năng phân loại theo mức ưu tiên (khi đã chọn 1 vị trí) hoặc mức ngành */}
                              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm lg:col-span-7 space-y-3">
                                <h3 className="font-bold text-ink text-base">
                                  {activeBranch ? `Kỹ năng cần cho ${activeBranch.title}` : `Kỹ năng thị trường cần cho ${industryName}`}
                                </h3>
                                <p className="text-xs text-ink-soft">
                                  {activeBranch
                                    ? "Phân loại theo tần suất thật trong tin tuyển dụng — sắp theo mức độ ảnh hưởng."
                                    : "Tính từ tin tuyển dụng thật trong snapshot — chọn 1 vị trí cụ thể ở trên để xem phân loại chi tiết hơn."}
                                </p>
                                {activeBranch ? (
                                  activeBranch.top_skills.length === 0 ? (
                                    <p className="text-xs text-ink-soft">Chưa đủ dữ liệu kỹ năng cho vị trí này.</p>
                                  ) : (
                                    (["buoc_phai_co", "can_co", "nen_co"] as const).map((tier) => {
                                      const items = activeBranch.top_skills.filter((s) => s.tier === tier).sort((a, b) => b.count - a.count);
                                      if (items.length === 0) return null;
                                      return (
                                        <div key={tier} className="space-y-1.5">
                                          <p className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${TIER_META[tier].cls}`}>
                                            {TIER_META[tier].label}
                                          </p>
                                          <div className="grid gap-1.5">
                                            {items.map((s) => {
                                              const hasSk = owned.has(s.name);
                                              return (
                                                <div key={s.name} className="flex justify-between items-center text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50/50">
                                                  <span className="font-medium text-gray-700">{s.name}</span>
                                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${hasSk ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                                    {hasSk ? "Đã có" : "↗ Cần học"}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )
                                ) : skills.length === 0 ? (
                                  <p className="text-xs text-ink-soft">Chưa đủ dữ liệu kỹ năng cho ngành này trong snapshot hiện tại.</p>
                                ) : (
                                  <div className="grid gap-2 mt-2">
                                    {skills.map((s: any) => {
                                      const hasSk = owned.has(s.name);
                                      return (
                                        <div key={s.name} className="flex justify-between items-center text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50/50">
                                          <span className="font-medium text-gray-700">{s.name}</span>
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${hasSk ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                            {hasSk ? "Đã có" : "↗ Cần học"}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-5 lg:col-span-5">
                                {/* Số liệu thị trường thật */}
                                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-2 text-sm">
                                  <h3 className="font-bold text-ink text-base mb-1">Số liệu thị trường</h3>
                                  <p>· <b>{fmtInt(c.market_evidence?.posting_count ?? 0)}</b> tin tuyển (trong snapshot)</p>
                                  <p>
                                    · Lương:{" "}
                                    <b className="text-[#005c6d]">
                                      {salary ? `${fmtSalaryFromMillions(salary.min_trieu)} - ${fmtSalaryFromMillions(salary.max_trieu)}/tháng (trung vị ${fmtSalaryFromMillions(salary.median_trieu)})` : "Thỏa thuận"}
                                    </b>
                                  </p>
                                  <p>· <b>{Math.round((c.market_evidence?.entry_level_ratio ?? 0) * 100)}%</b> tin nhận người mới</p>
                                </div>

                                {/* Lộ trình chung (không gắn với 1 job title bịa) */}
                                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                  <h3 className="font-bold text-ink text-base">Lộ trình 4 bước của bạn</h3>
                                  <p className="mt-0.5 text-xs text-ink-soft">Mốc thời gian ước lượng theo lựa chọn học vấn của bạn</p>
                                  <ol className="relative mt-5 space-y-5">
                                    <span aria-hidden="true" className="absolute bottom-4 left-[15px] top-1 w-0.5 bg-brand-light" />
                                    {milestones.map((step, i) => (
                                      <li key={step} className="relative flex items-start gap-3.5">
                                        <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold bg-[#005c6d] text-white">
                                          {i + 1}
                                        </span>
                                        <div>
                                          <p className="font-semibold text-ink text-sm leading-relaxed">{step}</p>
                                        </div>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Mở rộng cơ hội — thông điệp chung, không gắn 1 ngành cụ thể */}
                    <div className="rounded-2xl border border-[#005c6d]/20 bg-[#005c6d]/5 p-5 flex items-start gap-3.5">
                      <IconBulb className="w-5 h-5 text-[#005c6d] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-[#005c6d] text-sm">Mở rộng cơ hội của bạn</h4>
                        <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                          Học bổng nghề nghiệp, chương trình thực tập trả lương, và sự kiện kết nối nhà tuyển dụng đang chờ bạn. Hướng đi không bao giờ đóng lại.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MARKET ("Tổng quan thị trường") */}
          {activeTab === "market" && (
            <div className="fade-up space-y-4">
              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
                <MarketCharts
                  onStart={handleRetake}
                  initialRegion={studentRegion || undefined}
                  initialCluster={marketIndustryFilter || undefined}
                  showCta={false}
                />
              </div>
            </div>
          )}

          {/* TAB 3: CHAT ("Trợ lý AI") */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col h-[calc(100vh-10rem)] bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm fade-up">

              {/* Chat messages */}
              <div ref={chatScrollRef} className="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-50/50 scrollbar-none">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"} items-start gap-2.5`}>
                    {m.sender === "bot" && (
                      <div className="w-8 h-8 rounded-full bg-[#005c6d] text-white flex items-center justify-center text-sm font-semibold shrink-0">
                        LB
                      </div>
                    )}
                    <div className="flex flex-col max-w-[80%]">
                      <div className={`rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-line shadow-sm border ${m.sender === "user"
                        ? "bg-[#005c6d] text-white border-[#005c6d]"
                        : "bg-white text-[#111827] border-gray-200"
                        }`}>
                        {m.text}
                      </div>

                      {/* Message Options / Nút trả lời nhanh */}
                      {m.options && m.options.length > 0 && !chatBusy && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.options.map((opt: string) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleSendMessage(opt)}
                              className="rounded-full border border-[#005c6d]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#005c6d] hover:bg-[#005c6d]/5 transition"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      <span className="text-[10px] text-gray-400 mt-1 self-start">{m.time}</span>
                    </div>
                  </div>
                ))}

                {chatBusy && (
                  <div className="flex justify-start items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#005c6d] text-white flex items-center justify-center text-sm font-semibold shrink-0 animate-pulse">
                      LB
                    </div>
                    <div className="rounded-2xl bg-white border border-gray-200 p-4 text-xs text-gray-400 flex items-center gap-2 shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-[#005c6d]" /> La Bàn đang suy nghĩ...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(inputValue);
                  }}
                  className="flex items-center gap-2 max-w-4xl mx-auto"
                >
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Hỏi La Bàn về nghề nghiệp, học bổng, kỹ năng..."
                    className="flex-1 h-12 rounded-full border border-gray-200 px-5 text-sm focus:outline-none focus:border-[#005c6d] transition placeholder:text-gray-300"
                    disabled={chatBusy}
                  />
                  <button
                    type="submit"
                    disabled={chatBusy || !inputValue.trim()}
                    className="w-12 h-12 rounded-full bg-[#005c6d] hover:bg-[#004b58] text-white flex items-center justify-center transition shrink-0 disabled:opacity-40"
                  >
                    <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
                <p className="text-[10px] text-center text-gray-400 mt-2">
                  La Bàn AI có thể mắc sai sót. Vui lòng xác minh thông tin quan trọng.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: LEDGER ("Học bạ & Chứng chỉ") */}
          {activeTab === "ledger" && (
            <div className="grid gap-6 lg:grid-cols-2 fade-up">
              <Card
                title="Khai báo chứng chỉ · học bạ · ngoại khóa"
                sub="Nộp thẳng vào Evidence Ledger trên backend — lộ trình học sẽ được tính lại ngay lập tức."
              >
                <AssessmentForm profileId={profileId} onSaved={loadAll} />
              </Card>

              <Card title="Evidence Ledger của bạn" sub="Mọi bằng chứng đã ghi nhận — nguồn gốc rõ ràng, truy vết được.">
                {data.evidence.length === 0 ? (
                  <p className="text-sm text-[#464555]">Chưa có bằng chứng nào trong hồ sơ.</p>
                ) : (
                  <ul className="thin-scroll max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                    {[...data.evidence].reverse().map((ev) => {
                      const src = SOURCE_LABELS[ev.source_type] ?? { label: ev.source_type, icon: <IconBranch className="w-4 h-4 text-gray-400 shrink-0" /> };
                      return (
                        <li key={ev.evidence_id} className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm bg-white hover:border-[#C7C4D8] transition-all">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-semibold text-[#131B2E] flex items-center gap-1.5">
                              {src.icon} {ev.assessment_detail ? `${ev.assessment_detail.name} — ${ev.assessment_detail.provider}` : src.label}
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-[#464555]">{fmtDate(ev.collected_at)}</span>
                          </div>
                          {ev.assessment_detail ? (
                            <p className="mt-0.5 text-[#464555]">
                              Điểm <b className="text-[#131B2E]">{ev.assessment_detail.score}/{ev.assessment_detail.scale_max}</b>
                              {typeof ev.assessment_detail.percentile_top === "number" && ` · top ${ev.assessment_detail.percentile_top}%`}
                            </p>
                          ) : (
                            ev.claims.length > 0 && (
                              <p className="mt-0.5 truncate text-[#464555]" title={ev.claims.map((cl: any) => cl.value).join(" · ")}>
                                {ev.claims[0].dimension}: {ev.claims.map((cl: any) => cl.value).join(" · ")}
                              </p>
                            )
                          )}
                          <span
                            className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${ev.confidence === "high" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              }`}
                          >
                            Độ tin cậy: {ev.confidence === "high" ? "cao" : ev.confidence === "medium" ? "trung bình" : ev.confidence}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {assessments.length === 0 && data.evidence.length > 0 && (
                  <p className="mt-3 rounded-xl bg-brand-light/50 px-3.5 py-2.5 text-xs text-brand font-medium flex items-start gap-2">
                    <IconBulb className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <span>Hồ sơ mới chỉ có dữ liệu tự khai — thêm chứng chỉ/học bạ (độ tin cậy cao) để lộ trình chính xác hơn.</span>
                  </p>
                )}
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Chặng 2 — hộp thoại trắc nghiệm chọn ngành muốn phân tích trước khi vào chi tiết. */}
      {industryChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIndustryChoice(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#111827]">Bạn muốn phân tích ngành nào?</h3>
            <p className="mt-1 text-xs text-[#9CA3AF]">Chọn ngành gợi ý nổi bật, một ngành khác, hoặc xem cả hai để so sánh.</p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => applyIndustryChoice([industryChoice.primary], industryChoice.primary)}
                className="w-full text-left rounded-xl border-2 border-[#005c6d] bg-[#e6f1fb] p-3.5 transition hover:bg-[#d9ecf7]"
              >
                <p className="text-xs font-bold text-[#005c6d]">Ngành {industryChoice.primary}</p>
                <p className="text-[11px] text-ink-soft mt-0.5">Ngành gợi ý nổi bật nhất với hồ sơ của bạn</p>
              </button>

              {[...topCandidates, ...horizonCandidates].filter((x: any) => x.industry !== industryChoice.primary).length > 0 && (
                <div className="rounded-xl border border-gray-200 p-3.5 space-y-2.5">
                  <label className="block text-[11px] font-bold text-gray-600">Hoặc chọn ngành khác:</label>
                  <select
                    value={industryChoice.altPick}
                    onChange={(e) => setIndustryChoice({ ...industryChoice, altPick: e.target.value })}
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 text-xs focus:border-[#005c6d] focus:outline-none"
                  >
                    {[...topCandidates, ...horizonCandidates]
                      .filter((x: any) => x.industry !== industryChoice.primary)
                      .map((x: any) => (
                        <option key={x.industry} value={x.industry}>{x.industry}</option>
                      ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => applyIndustryChoice([industryChoice.altPick], industryChoice.altPick)}
                      className="flex-1 rounded-lg border border-gray-300 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Chỉ xem ngành này
                    </button>
                    <button
                      type="button"
                      onClick={() => applyIndustryChoice([industryChoice.primary, industryChoice.altPick], industryChoice.primary)}
                      className="flex-1 rounded-lg bg-[#005c6d] py-2 text-xs font-semibold text-white hover:bg-[#004b58]"
                    >
                      Xem cả hai
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIndustryChoice(null)}
              className="mt-4 w-full text-center text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa hồ sơ — luôn truy cập được (không chỉ lần đăng nhập đầu tiên).
          Ghi self_report evidence thật vào Ledger, supersedes giá trị cũ, đồng bộ localStorage. */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !editSaving && setEditOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#111827]">Chỉnh sửa hồ sơ</h3>
            <p className="mt-1 text-xs text-[#9CA3AF]">Thông tin này lưu vào hồ sơ của bạn — có thể sửa lại bất cứ lúc nào.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Tên</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:border-[#005c6d] focus:outline-none"
                  placeholder="Tên của bạn"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Tuổi</label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:border-[#005c6d] focus:outline-none"
                    placeholder="Ví dụ: 18"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Giới tính</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:border-[#005c6d] focus:outline-none"
                  >
                    <option value="">Chọn</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Nam">Nam</option>
                    <option value="Khác">Khác</option>
                    <option value="Không muốn tiết lộ">Không muốn tiết lộ</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Khu vực</label>
                <input
                  type="text"
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:border-[#005c6d] focus:outline-none"
                  placeholder="Ví dụ: Hà Nội"
                />
              </div>
            </div>

            <p className="mt-3 text-[11px] text-[#9CA3AF]">
              Giới tính/khu vực chỉ dùng để hiển thị và lọc dữ liệu thị trường — không tham gia chấm điểm Holland Code hay xếp hạng ngành nghề.
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editSaving || !editName.trim()}
                className="rounded-xl bg-[#005c6d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#004b58] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentPortalPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8FAFC] px-6">
        <LogoMark className="h-14 w-14 animate-pulse" />
        <p className="font-semibold text-[#131B2E]">Đang tải Student Portal từ hệ thống…</p>
        <p className="text-xs text-[#464555]">Đọc Evidence Ledger · tính điểm thế mạnh · khớp dữ liệu tuyển dụng thật</p>
      </main>
    }>
      <StudentPortalPageContent />
    </Suspense>
  );
}
