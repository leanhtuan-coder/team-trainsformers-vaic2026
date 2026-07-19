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
import { clearPortalRef, loadPortalRef } from "@/lib/profile";
import { getSupabase } from "@/lib/supabaseClient";
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
    salary: { median_trieu: number; sample_size: number } | null;
    top_skills: { name: string; count: number }[];
    top_provinces: { name: string; count: number }[];
  };
}

interface PathwayPortfolio {
  is_personalized: boolean;
  candidates: PathwayCandidate[];
  data_limitations: string[];
}

/* ------------------------ Thuật toán điểm nhóm ngành + cờ mâu thuẫn ------------------------ */

interface GroupScore {
  id: string;
  score: number;
  name: string;
  desc: string;
  gradient: string;
}

const calculateStrengths = (evidenceList: EvidenceItem[]) => {
  // Gom câu trả lời quickstart theo dimension — câu multi (Q6) nối chuỗi để includes() quét được hết.
  const quickstartAnswers: Record<string, string> = {};
  evidenceList.forEach((ev) => {
    if (ev.source_type === "self_report") {
      ev.claims?.forEach((claim) => {
        const prev = quickstartAnswers[claim.dimension];
        quickstartAnswers[claim.dimension] = prev ? `${prev} | ${claim.value}` : claim.value;
      });
    }
  });

  const scores: Record<string, { score: number; name: string; desc: string; gradient: string }> = {
    "1": { score: 0, name: "Công nghệ & Dữ liệu", desc: "Phân tích, viết code, quản trị hệ thống, xử lý con số", gradient: "from-teal-400 to-teal-600" },
    "2": { score: 0, name: "Kinh doanh & Tiếp thị", desc: "Thuyết phục, thương lượng, lập kế hoạch kinh doanh, bán hàng", gradient: "from-amber-400 to-amber-600" },
    "3": { score: 0, name: "Tài chính & Tổ chức", desc: "Kiểm toán, lưu trữ, tuân thủ quy trình, tối ưu ngân sách", gradient: "from-blue-400 to-blue-600" },
    "4": { score: 0, name: "Kỹ thuật & Công nghệ vật lý", desc: "Chế tạo, sửa chữa máy móc, thiết kế phần cứng, vận hành thiết bị", gradient: "from-indigo-400 to-indigo-600" },
    "5": { score: 0, name: "Y khoa & Khoa học sự sống", desc: "Nghiên cứu sinh học, hóa dược, chăm sóc bệnh nhân, điều trị", gradient: "from-emerald-400 to-emerald-600" },
    "6": { score: 0, name: "Giáo dục & Dịch vụ xã hội", desc: "Giảng dạy, tư vấn tâm lý, hòa giải, tổ chức hoạt động cộng đồng", gradient: "from-pink-400 to-pink-600" },
    "7": { score: 0, name: "Sản xuất & Nông nghiệp vận tải", desc: "Giao nhận, chuỗi cung ứng, trồng trọt, giám sát công trình", gradient: "from-orange-400 to-orange-600" },
    "9": { score: 0, name: "Mỹ thuật & Thiết kế sáng tạo", desc: "Vẽ minh họa, thiết kế đồ họa, sáng tác nhạc, trang trí không gian", gradient: "from-purple-400 to-purple-600" },
  };

  const checkAnswer = (dim: string, keyword: string) => {
    const val = quickstartAnswers[dim];
    return Boolean(val && val.toLowerCase().includes(keyword.toLowerCase()));
  };

  // Q1
  if (checkAnswer("đối tượng làm việc cuốn hút", "máy móc")) { scores["4"].score += 1; scores["7"].score += 1; }
  if (checkAnswer("đối tượng làm việc cuốn hút", "con số")) { scores["3"].score += 1; scores["1"].score += 1; }
  if (checkAnswer("đối tượng làm việc cuốn hút", "con người")) { scores["5"].score += 1; scores["6"].score += 1; }
  if (checkAnswer("đối tượng làm việc cuốn hút", "ý tưởng")) { scores["9"].score += 1; scores["2"].score += 1; }

  // Q2
  if (checkAnswer("vai trò trong dự án nhóm", "dẫn dắt")) { scores["2"].score += 1; }
  if (checkAnswer("vai trò trong dự án nhóm", "kế hoạch")) { scores["3"].score += 1; }
  if (checkAnswer("vai trò trong dự án nhóm", "kết nối")) { scores["6"].score += 1; scores["5"].score += 1; }
  if (checkAnswer("vai trò trong dự án nhóm", "khó nhất")) { scores["1"].score += 1; scores["4"].score += 1; }

  // Q3
  if (checkAnswer("nguồn gốc sự thỏa mãn", "sửa được")) { scores["4"].score += 1; scores["1"].score += 1; }
  if (checkAnswer("nguồn gốc sự thỏa mãn", "tìm ra quy luật")) { scores["3"].score += 1; scores["1"].score += 1; }
  if (checkAnswer("nguồn gốc sự thỏa mãn", "tiến bộ")) { scores["5"].score += 1; scores["6"].score += 1; }
  if (checkAnswer("nguồn gốc sự thỏa mãn", "chưa ai làm")) { scores["9"].score += 1; scores["2"].score += 1; }

  // Q4
  if (checkAnswer("môn học hoạt động dễ chịu", "toán")) { scores["1"].score += 1; scores["4"].score += 1; scores["3"].score += 1; }
  if (checkAnswer("môn học hoạt động dễ chịu", "văn")) { scores["6"].score += 1; scores["2"].score += 1; }
  if (checkAnswer("môn học hoạt động dễ chịu", "sinh")) { scores["5"].score += 1; }
  if (checkAnswer("môn học hoạt động dễ chịu", "mỹ thuật")) { scores["9"].score += 1; }

  // Q5
  if (checkAnswer("đối tượng muốn xây dựng", "vô hình")) { scores["1"].score += 1; }
  if (checkAnswer("đối tượng muốn xây dựng", "sờ được")) { scores["4"].score += 1; scores["7"].score += 1; }
  if (checkAnswer("đối tượng muốn xây dựng", "thuộc về con người")) { scores["6"].score += 1; }
  if (checkAnswer("đối tượng muốn xây dựng", "thuộc về cái đẹp")) { scores["9"].score += 1; }

  // Q6 (chọn tối đa 2)
  if (checkAnswer("năng lực nổi trội tự nhận", "logic")) { scores["1"].score += 1; scores["3"].score += 1; scores["4"].score += 1; }
  if (checkAnswer("năng lực nổi trội tự nhận", "viết")) { scores["2"].score += 1; scores["6"].score += 1; }
  if (checkAnswer("năng lực nổi trội tự nhận", "nhớ chi tiết")) { scores["3"].score += 1; scores["5"].score += 1; }
  if (checkAnswer("năng lực nổi trội tự nhận", "vẽ")) { scores["9"].score += 1; }
  if (checkAnswer("năng lực nổi trội tự nhận", "tay chân")) { scores["4"].score += 1; scores["7"].score += 1; }

  // Q7
  if (checkAnswer("phương thức xử lý dữ liệu", "kiểm tra")) { scores["3"].score += 1; }
  if (checkAnswer("phương thức xử lý dữ liệu", "tìm insight")) { scores["1"].score += 1; scores["2"].score += 1; }
  if (checkAnswer("phương thức xử lý dữ liệu", "trình bày")) { scores["2"].score += 1; scores["6"].score += 1; }

  // Q8
  if (checkAnswer("môi trường làm việc mong muốn", "hiện trường")) { scores["4"].score += 1; scores["7"].score += 1; }
  if (checkAnswer("môi trường làm việc mong muốn", "văn phòng")) { scores["3"].score += 1; }
  if (checkAnswer("môi trường làm việc mong muốn", "tiếp xúc")) { scores["6"].score += 1; scores["2"].score += 1; }
  if (checkAnswer("môi trường làm việc mong muốn", "tự do")) { scores["9"].score += 1; scores["1"].score += 1; }

  // Q9
  if (checkAnswer("độ mở định hướng nghề", "ổn định")) { scores["3"].score += 1; scores["6"].score += 1; scores["5"].score += 1; }
  if (checkAnswer("độ mở định hướng nghề", "nghề mới")) { scores["1"].score += 1; scores["2"].score += 1; }
  if (checkAnswer("độ mở định hướng nghề", "tự làm chủ")) { scores["9"].score += 1; scores["2"].score += 1; }

  // Câu 10 phản chứng: trừ điểm + so với điểm nền (Q1-9) để bật cờ mâu thuẫn.
  let hasConflict = false;
  let conflictText = "";
  const baseScores = JSON.parse(JSON.stringify(scores)) as typeof scores;

  if (checkAnswer("yếu tố né tránh trong công việc", "lặp đi lặp lại")) {
    scores["3"].score -= 1; scores["7"].score -= 1;
    scores["2"].score += 1; scores["4"].score += 1; scores["6"].score += 1;
    if (baseScores["3"].score >= 2) {
      hasConflict = true;
      conflictText = "Bạn quan tâm đến các quy tắc và tính tổ chức (Tài chính / Kế toán), nhưng lại e ngại công việc lặp đi lặp lại. Đây là điểm đáng khám phá khi chọn công việc cụ thể.";
    }
  } else if (checkAnswer("yếu tố né tránh trong công việc", "giao tiếp")) {
    scores["2"].score -= 1; scores["6"].score -= 1;
    scores["1"].score += 1; scores["3"].score += 1; scores["4"].score += 1;
    if (baseScores["2"].score >= 2 || baseScores["6"].score >= 2) {
      hasConflict = true;
      conflictText = "Bạn e ngại việc thuyết phục hoặc tiếp xúc người lạ liên tục, dù mong muốn làm việc trong nhóm hoặc có tiềm năng dẫn dắt.";
    }
  } else if (checkAnswer("yếu tố né tránh trong công việc", "mơ hồ")) {
    scores["9"].score -= 1; scores["2"].score -= 1;
    scores["3"].score += 1; scores["4"].score += 1;
    if (baseScores["9"].score >= 2) {
      hasConflict = true;
      conflictText = "Bạn hướng tới nghệ thuật và sự sáng tạo độc lập, nhưng lại e ngại môi trường làm việc mơ hồ, không có đáp án đúng.";
    }
  } else if (checkAnswer("yếu tố né tránh trong công việc", "áp lực")) {
    scores["2"].score -= 1; scores["5"].score -= 1;
    scores["3"].score += 1; scores["6"].score += 1;
  }

  const sorted: GroupScore[] = Object.entries(scores)
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => b.score - a.score);

  const hasAnswers = Object.keys(quickstartAnswers).length > 0;
  return { sorted, hasConflict, conflictText, hasAnswers };
};

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
    const skills = c.market_evidence.top_skills || [];
    for (const skill of skills) {
      for (const t of topSkillsList) {
        if (skill.name.toLowerCase().includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(skill.name.toLowerCase())) {
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

function StudentPortalPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const profileId = typeof params?.id === "string" ? params.id : "";
  const activeTab = searchParams.get("tab") || "roadmap";

  const [data, setData] = useState<ProfileResponse | null>(null);
  const [portfolio, setPortfolio] = useState<PathwayPortfolio | null>(null);
  const [pathwayError, setPathwayError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [studentName, setStudentName] = useState("Học sinh");
  const [studentRegion, setStudentRegion] = useState<string | null>(null);
  const [topSkills, setTopSkills] = useState<any[]>([]);

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

  const loadAll = useCallback(async () => {
    const resProfile = await fetch(`${API_BASE}/profile/${profileId}`);
    if (resProfile.status === 404) {
      setNotFound(true);
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
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    const ref = loadPortalRef();
    if (ref && ref.profile_id === profileId) {
      setStudentName(ref.name);
      setStudentRegion(ref.region);
    }
    loadAll()
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [profileId, loadAll]);

  const handleRetake = () => {
    clearPortalRef();
    router.push("/");
  };

  const handleLogout = async () => {
    try {
      await getSupabase()?.auth.signOut();
    } catch {
      /* bỏ qua — vẫn dọn phiên local phía dưới */
    }
    clearPortalRef();
    router.push("/");
  };

  const setTab = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  // Bot handler gửi tin nhắn
  const handleSendMessage = (text: string) => {
    if (!text.trim() || chatBusy) return;
    
    const userMsg = {
      sender: "user",
      text: text,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setChatBusy(true);

    setTimeout(() => {
      let replyText = "";
      let opts: string[] = [];
      const query = text.toLowerCase();

      if (query.includes("phù hợp") || query.includes("gợi ý") || query.includes("ngành nào") || query.includes("nghề nào")) {
        replyText = `Dựa trên các bằng chứng thu thập được, top 3 thế mạnh nhóm ngành (Holland Code) của bạn là: **${top3.map(g => g.name).join(", ")}**.\n\nCác gợi ý nghề nghiệp phù hợp nhất cho bạn theo phân tích là:\n${
          portfolio?.candidates.slice(0, 3).map(c => `- **${c.industry}** (Điểm khớp hồ sơ: ${c.relevance_score}%)`).join("\n") || "Đang phân tích lộ trình..."
        }\n\nBạn có muốn tìm hiểu lộ trình chi tiết hay mức lương của ngành nào không?`;
        opts = portfolio?.candidates.slice(0, 3).map(c => `Ngành ${c.industry}`) || [];
      } else if (query.includes("ngành") || query.includes("nghề") || query.includes("lộ trình")) {
        const found = portfolio?.candidates.find(c => query.includes(c.industry.toLowerCase()));
        if (found) {
          const entryPct = Math.round(found.market_evidence.entry_level_ratio * 100);
          replyText = `Ngành **${found.industry}** hiện có **${fmtInt(found.market_evidence.posting_count)}** tin tuyển dụng đang hoạt động.\n\n- Lương trung bình: **${found.market_evidence.salary ? fmtSalaryFromMillions(found.market_evidence.salary.median_trieu) + "/tháng" : "Thỏa thuận"}**\n- Yêu cầu người mới (entry-level): **${entryPct}% số tin tuyển dụng**\n- Kỹ năng hàng đầu: ${found.market_evidence.top_skills.slice(0, 4).map(s => s.name).join(", ")}\n\nLộ trình đề xuất: Bạn đã có kỹ năng **${found.market_evidence.top_skills[0]?.name ? (owned.has(found.market_evidence.top_skills[0].name) ? "đã sở hữu" : "cần bổ sung") : "cần học"}**. Môi trường tuyển dụng ${entryPct >= 25 ? "chấp nhận Cao đẳng/Học nghề khá tốt" : "ưu tiên Đại học chính quy hơn"}.`;
        } else {
          replyText = "Hiện tại mình đang lưu trữ dữ liệu của các ngành: " + (portfolio?.candidates.map(c => c.industry).join(", ") || "Công nghệ, Vận hành CNC...") + ". Bạn vui lòng hỏi cụ thể về một trong các ngành này nhé!";
        }
      } else if (query.includes("lương")) {
        replyText = `Dựa trên dữ liệu thị trường mới nhất của vùng **${studentRegion || "Toàn quốc"}**, mức lương trung bình của một số ngành hot là:\n${
          portfolio?.candidates.slice(0, 4).map(c => `- ${c.industry}: **${c.market_evidence.salary ? fmtSalaryFromMillions(c.market_evidence.salary.median_trieu) + "/tháng" : "Thỏa thuận"}**`).join("\n") || "Đang cập nhật..."
        }\n\nBạn muốn tìm hiểu kỹ hơn về ngành nào không?`;
        opts = portfolio?.candidates.slice(0, 3).map(c => `Lương ${c.industry}`) || [];
      } else if (query.includes("sql") || query.includes("học sql")) {
        replyText = `SQL (Structured Query Language) là kỹ năng truy vấn dữ liệu cực kỳ quan trọng cho các nhóm ngành **Công nghệ & Dữ liệu, Tài chính**.\n\nĐể học SQL hiệu quả:\n1. Tìm hiểu cú pháp SELECT, WHERE, JOIN cơ bản.\n2. Thực hành qua các trang web miễn phí như W3Schools SQL, LeetCode hoặc SQLZoo.\n3. Làm các project nhỏ về phân tích dữ liệu bán hàng, quản lý học sinh và lưu trữ vào Evidence Ledger để tăng uy tín hồ sơ của bạn nhé!`;
      } else {
        replyText = "Cảm ơn câu hỏi của bạn! Mình là La Bàn, mình có thể giúp bạn giải đáp các thông tin về lương trung bình, số tin tuyển dụng, và kỹ năng yêu cầu của các ngành nghề bạn quan tâm. Bạn có thể hỏi: 'Lương ngành Công nghệ thông tin thế nào?' hoặc 'Kỹ năng nào cần cho Marketing?' để mình tra cứu dữ liệu thật giúp bạn nhé!";
        opts = ["Nghề nào phù hợp tôi?", "Lương các ngành ra sao?", "Làm sao học SQL?"];
      }

      const botMsg = {
        sender: "bot",
        text: replyText,
        options: opts,
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, botMsg]);
      setChatBusy(false);
      
      // Scroll to bottom
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 50);
    }, 800);
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  /* ----- Trạng thái đặc biệt ----- */
  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8FAFC] px-6">
        <LogoMark className="h-14 w-14 animate-pulse" />
        <p className="font-semibold text-[#131B2E]">Đang tải Student Portal từ hệ thống…</p>
        <p className="text-xs text-[#464555]">Đọc Evidence Ledger · tính điểm thế mạnh · khớp dữ liệu tuyển dụng thật</p>
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
            : "Kiểm tra Express backend đang chạy ở cổng 4000 rồi tải lại trang."}
        </p>
        <Link href="/" className="inline-flex h-[42px] items-center justify-center rounded-lg bg-[#3525CD] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E00A9]">
          ← Về trang chủ làm khảo sát
        </Link>
      </main>
    );
  }

  /* ----- Dữ liệu dẫn xuất ----- */
  const { sorted, hasConflict, conflictText, hasAnswers } = calculateStrengths(data.evidence);
  const top3 = sorted.slice(0, 3);
  const maxScore = Math.max(sorted[0]?.score ?? 0, 1);
  const coverage = data.snapshot.evidence_coverage;
  const assessments = data.evidence.filter((e) => e.source_type === "assessment");

  const owned = getOwnedSkills(data.evidence, topSkills);
  const toLearn = getSkillsToLearn(portfolio, topSkills);
  const maxSkillPct = Math.max(...topSkills.map((s) => s.pct), 1);

  // Tìm câu trả lời Q9 "độ mở định hướng nghề"
  let horizonVal = "đại học";
  data.evidence.forEach((ev) => {
    if (ev.source_type === "self_report") {
      ev.claims?.forEach((claim) => {
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
          <button
            type="button"
            onClick={() => setTab("market")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition text-left ${
              activeTab === "market"
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
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition text-left ${
              activeTab === "roadmap"
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
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition text-left ${
              activeTab === "chat"
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
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition text-left ${
              activeTab === "ledger"
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
            <span className="text-[10px] text-white/60 truncate">Học sinh · Lớp 12</span>
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
            {activeTab === "market" && (
              <span className="text-xs text-[#9CA3AF] font-medium">Cập nhật lúc 08:00, 18/07/2025</span>
            )}
            {activeTab === "roadmap" && (
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-[#111827] hover:bg-gray-50 transition"
              >
                Làm lại khảo sát
              </button>
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
                      Học sinh lớp 12 · Trường THPT Chu Văn An, Hà Nội
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-teal-50 border border-teal-100 text-teal-700 px-2.5 py-0.5 text-[10px] font-bold">Tư duy logic</span>
                      <span className="rounded-full bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-0.5 text-[10px] font-bold">Kiên nhẫn</span>
                      <span className="rounded-full bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-0.5 text-[10px] font-bold">Học nhanh</span>
                      {studentRegion && (
                        <span className="rounded-full bg-purple-50 border border-purple-100 text-purple-700 px-2.5 py-0.5 text-[10px] font-bold">
                          Khu vực: {studentRegion}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("ledger")}
                  className="rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 text-xs font-bold text-[#111827]"
                >
                  <span className="flex items-center gap-1.5">
                    <IconPencil className="w-3.5 h-3.5 text-[#111827]" />
                    Chỉnh sửa
                  </span>
                </button>
              </div>

              {/* RIASEC / Holland Code */}
              <Card
                title="Sơ đồ thế mạnh nhóm ngành (Holland Code)"
                sub="Tính động từ 10 câu quickstart — câu 10 là câu phản chứng trừ điểm."
              >
                {!hasAnswers ? (
                  <p className="rounded-xl bg-brand-light/50 px-4 py-3 text-sm text-[#464555]">
                    Chưa có câu trả lời khảo sát trong hồ sơ này — hãy <Link href="/" className="font-semibold text-brand underline">làm khảo sát 10 câu</Link> để xem sơ đồ thế mạnh.
                  </p>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#3525CD]">Top 3 nhóm ngành thế mạnh</p>
                      <div className="space-y-4">
                        {top3.map((g, i) => (
                          <div key={g.id}>
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="font-bold text-ink">
                                <span className="mr-1.5 text-ink-soft">#{i + 1}</span>{g.name}
                              </span>
                              <span className="tabular-nums font-semibold text-ink-soft">{g.score} điểm</span>
                            </div>
                            <div className="mt-1.5 h-3.5 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`grow-bar h-full rounded-full bg-gradient-to-r ${g.gradient}`}
                                style={{ width: `${Math.max((g.score / maxScore) * 100, 4)}%` }}
                              />
                            </div>
                            <p className="mt-1 text-xs text-ink-soft">{g.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">Toàn bộ 8 nhóm ngành</p>
                      <div className="space-y-2.5">
                        {sorted.map((g) => (
                          <div key={g.id} className="flex items-center gap-3 text-sm">
                            <span className="w-44 shrink-0 truncate text-ink">{g.name}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${g.gradient} ${g.score <= 0 ? "opacity-25" : ""}`}
                                style={{ width: `${Math.max((Math.max(g.score, 0) / maxScore) * 100, 3)}%` }}
                              />
                            </div>
                            <span className="w-8 shrink-0 text-right tabular-nums text-ink-soft">{g.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* 3 CARD GỢI Ý NGHỀ NGHIỆP DÀN NGANG (MD:GRID-COLS-3) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-[#111827]">Nghề nghiệp phù hợp với bạn</h3>
                  <span className="text-xs text-[#9CA3AF] font-medium flex items-center gap-1">
                    <IconRoute className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    Xếp theo độ phù hợp
                  </span>
                </div>

                {pathwayError ? (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{pathwayError}</p>
                ) : !portfolio ? (
                  <p className="text-sm text-gray-500">Đang tải gợi ý lộ trình…</p>
                ) : (
                  <div className="grid gap-5 md:grid-cols-3">
                    {portfolio.candidates.slice(0, 3).map((c) => {
                      const entryPct = Math.round(c.market_evidence.entry_level_ratio * 100);
                      const vocationalFriendly = c.market_evidence.entry_level_ratio >= 0.25;
                      return (
                        <article key={c.industry} className="rounded-2xl border border-gray-200/80 bg-white p-5 flex flex-col justify-between shadow-sm relative">
                          
                          {/* Top Header Card */}
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                                Gợi ý tham khảo
                              </span>
                              <h4 className="mt-2 text-base font-extrabold text-[#111827] leading-tight">
                                {c.industry}
                              </h4>
                            </div>
                            <div className="relative flex items-center justify-center w-11 h-11 rounded-full border-[3px] border-[#16a34a] text-[#16a34a] font-bold text-xs shrink-0">
                              {c.relevance_score}%
                              <span className="absolute -bottom-5 text-[8px] text-[#9CA3AF] uppercase whitespace-nowrap">phù hợp</span>
                            </div>
                          </div>

                          {/* Matching Quote Box */}
                          {c.matched_profile_evidence.length > 0 && (
                            <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/50 p-3.5 text-xs text-[#005c6d]">
                              <p className="font-bold uppercase tracking-wider text-[10px] text-teal-800">
                                Lợi thế của bạn:
                              </p>
                              <p className="mt-1 leading-relaxed">
                                &ldquo;{highlightTokens(c.matched_profile_evidence[0].value, c.matched_profile_evidence[0].matched_tokens)}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* Skills List */}
                          <div className="mt-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Kỹ năng cần có</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {c.market_evidence.top_skills.slice(0, 5).map((s) => (
                                <span key={s.name} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          </div>

                           {/* Footer Info */}
                          <div className="mt-5 pt-4 border-t border-gray-100 space-y-1.5 text-xs font-semibold">
                            <p className="text-[#111827] flex items-center gap-1.5">
                              <IconCoins className="w-3.5 h-3.5 text-brand" />
                              <span>Lương:</span>
                              <span className="tabular-nums font-bold text-brand">{c.market_evidence.salary ? `${fmtSalaryFromMillions(c.market_evidence.salary.median_trieu)}/tháng` : "Thỏa thuận"}</span>
                            </p>
                            <p className="text-[#9CA3AF] flex items-center gap-1.5">
                              <IconGradCap className="w-3.5 h-3.5 text-[#9CA3AF]" />
                              <span>Lộ trình:</span>
                              <span className="text-[#111827]">
                                {vocationalFriendly ? "Cao đẳng / Trung cấp nghề" : "Đại học chính quy (4-5 năm)"}
                              </span>
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Skill gap & Timeline 4 bước */}
              {topSkills.length > 0 && (
                <div className="grid gap-5 lg:grid-cols-12 mt-6">
                  
                  {/* Skill Gap */}
                  <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm lg:col-span-7">
                    <h3 className="font-bold text-ink text-base">Kỹ năng thị trường cần — vị trí của bạn</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 font-semibold text-accent-dark">
                        <IconCheck /> Bạn đã có
                      </span>
                      <span className="rounded-full bg-[#FBF1DD] px-2.5 py-1 font-semibold text-[#8A5B06]">
                        ↗ Nên học thêm
                      </span>
                      <span className="rounded-full bg-brand-light px-2.5 py-1 font-semibold text-brand-deep">
                        Thị trường cần
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {topSkills.map((s) => {
                        const isOwned = owned.has(s.name);
                        const isToLearn = !isOwned && toLearn.has(s.name);
                        return (
                          <div key={s.name} className="group relative">
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="flex items-center gap-2 font-medium text-ink">
                                {s.name}
                                {isOwned && (
                                  <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent-dark">
                                    <IconCheck /> Đã có
                                  </span>
                                )}
                                {isToLearn && (
                                  <span className="rounded-full bg-[#FBF1DD] px-2 py-0.5 text-[11px] font-semibold text-[#8A5B06]">
                                    ↗ Nên học
                                  </span>
                                )}
                              </span>
                              <span className="tabular-nums text-ink-soft">{s.pct}%</span>
                            </div>
                            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="grow-bar h-full rounded-full bg-[#005c6d]"
                                style={{ width: `${(s.pct / maxSkillPct) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Timeline 4 bước */}
                  <div className="space-y-5 lg:col-span-5">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h3 className="font-bold text-ink text-base">Lộ trình 4 bước của bạn</h3>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        Mốc thời gian ước lượng theo lựa chọn &ldquo;{horizonVal.split(" — ")[0] || horizonVal}&rdquo;
                      </p>
                      <ol className="relative mt-5 space-y-5">
                        <span
                          aria-hidden="true"
                          className="absolute bottom-4 left-[15px] top-1 w-0.5 bg-brand-light"
                        />
                        {TIMELINE_STEPS.map((step, i) => (
                          <li key={step} className="relative flex items-start gap-3.5">
                            <span
                              className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                                i === 0 ? "bg-[#005c6d] text-white" : "border-2 border-brand-light bg-white text-[#005c6d]"
                              }`}
                            >
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-ink text-sm">{step}</p>
                              <p className="text-xs text-ink-soft">{milestones[i]}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Mở rộng cơ hội của bạn */}
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
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MARKET ("Tổng quan thị trường") */}
          {activeTab === "market" && (
            <div className="fade-up space-y-4">
              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
                <MarketCharts onStart={handleRetake} initialRegion={studentRegion || undefined} showCta={false} />
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
                      <div className={`rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-line shadow-sm border ${
                        m.sender === "user"
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
                              <p className="mt-0.5 truncate text-[#464555]" title={ev.claims.map((cl) => cl.value).join(" · ")}>
                                {ev.claims[0].dimension}: {ev.claims.map((cl) => cl.value).join(" · ")}
                              </p>
                            )
                          )}
                          <span
                            className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              ev.confidence === "high" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
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

