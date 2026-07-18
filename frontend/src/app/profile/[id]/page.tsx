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
    salary: { median_trieu: number; min_trieu: number; max_trieu: number; sample_size: number } | null;
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

interface JobBranch {
  name: string;
  isRecommended?: boolean;
  requiredSkills: string[];
  preferredSkills: string[];
  optionalSkills: string[];
  salaryRange: string;
  fitPercentage: number;
}

const RAG_SKILL_MAP: Record<string, JobBranch[]> = {
  "IT - Phần mềm": [
    {
      name: "Frontend Developer (Lập trình giao diện)",
      isRecommended: true,
      requiredSkills: ["HTML/CSS", "Javascript", "Giao tiếp"],
      preferredSkills: ["React/Next.js", "UI/UX Design cơ bản", "Git/Github"],
      optionalSkills: ["Typescript", "Tailwind CSS", "Tối ưu hiệu năng"],
      salaryRange: "15 - 35 triệu/tháng",
      fitPercentage: 85
    },
    {
      name: "Backend Developer (Lập trình hệ thống)",
      requiredSkills: ["Node.js/Express", "SQL/Database", "Làm việc nhóm"],
      preferredSkills: ["RESTful API design", "Git/Github", "Cấu trúc dữ liệu & Thuật toán"],
      optionalSkills: ["Docker", "Redis", "Bảo mật hệ thống"],
      salaryRange: "18 - 40 triệu/tháng",
      fitPercentage: 70
    }
  ],
  "Kế toán": [
    {
      name: "Kế toán viên thuế",
      isRecommended: true,
      requiredSkills: ["Luật Thuế Việt Nam", "Hóa đơn chứng từ", "Cẩn thận"],
      preferredSkills: ["Excel kế toán", "Phần Mềm Kế Toán MISA", "Kê khai thuế"],
      optionalSkills: ["Phân tích báo cáo tài chính", "Kỹ năng báo cáo"],
      salaryRange: "10 - 22 triệu/tháng",
      fitPercentage: 90
    },
    {
      name: "Kế toán tổng hợp",
      requiredSkills: ["Nguyên lý kế toán", "Sổ sách định khoản", "Trung thực"],
      preferredSkills: ["Excel nâng cao", "Lập Báo cáo tài chính", "Giao tiếp"],
      optionalSkills: ["Quản trị dòng tiền", "Tiếng Anh chuyên ngành"],
      salaryRange: "14 - 30 triệu/tháng",
      fitPercentage: 75
    }
  ],
  "Marketing / Quảng cáo": [
    {
      name: "Content Creator (Sáng tạo nội dung)",
      isRecommended: true,
      requiredSkills: ["Viết lách", "Sáng tạo", "Giao tiếp"],
      preferredSkills: ["Storytelling", "Edit video ngắn (Capcut/Tiktok)", "SEO cơ bản"],
      optionalSkills: ["Quản lý fanpage", "Photoshop/Illustrator"],
      salaryRange: "10 - 25 triệu/tháng",
      fitPercentage: 90
    },
    {
      name: "Digital Marketing Executive (Vận hành quảng cáo)",
      requiredSkills: ["Giao tiếp", "Excel phân tích số liệu", "Thuyết phục"],
      preferredSkills: ["Chạy quảng cáo (Facebook/Google Ads)", "Đàm phán", "Kỹ năng lập kế hoạch"],
      optionalSkills: ["Google Analytics", "Quản trị ngân sách"],
      salaryRange: "12 - 30 triệu/tháng",
      fitPercentage: 70
    }
  ]
};

const BRANCH_TIMELINE: Record<string, string[]> = {
  "Frontend Developer (Lập trình giao diện)": [
    "Học vững HTML, CSS, JavaScript cơ bản (3-6 tháng)",
    "Xây dựng portfolio cá nhân với 3-5 trang web tự thiết kế (2 tháng)",
    "Học React/Next.js và cách sử dụng Git/Github để làm việc nhóm (3 tháng)",
    "Thực tập tại doanh nghiệp phần mềm hoặc làm dự án Freelance đầu tiên"
  ],
  "Backend Developer (Lập trình hệ thống)": [
    "Học ngôn ngữ lập trình (Javascript/Python) & cơ sở dữ liệu SQL (4 tháng)",
    "Xây dựng RESTful API cho các ứng dụng nhỏ như Quản lý thư viện, Blog (2 tháng)",
    "Học Git, Docker và triển khai dự án lên đám mây (AWS/Heroku) (3 tháng)",
    "Ứng tuyển vị trí Junior Backend Developer tại các công ty Outsourcing"
  ],
  "Kế toán viên thuế": [
    "Học nguyên lý kế toán & Luật Thuế hiện hành (4 tháng)",
    "Thực hành kê khai thuế GTGT, TNCN trên phần mềm HTKK (2 tháng)",
    "Sử dụng thành thạo phần mềm MISA và lập hóa đơn điện tử (2 tháng)",
    "Thực tập tại các văn phòng dịch vụ kế toán thuế để cọ xát hóa đơn thật"
  ],
  "Kế toán tổng hợp": [
    "Tốt nghiệp ngành Kế toán/Tài chính và học cách lập sổ sách định khoản (4 năm hoặc khóa học 6 tháng)",
    "Thành thạo Excel kế toán nâng cao (Pivot Table, Vlookup, Index/Match) (2 tháng)",
    "Rèn luyện kỹ năng giao tiếp và lập báo cáo tài chính nội bộ (3 tháng)",
    "Ứng tuyển vị trí Kế toán nội bộ hoặc Kế toán tổng hợp tại doanh nghiệp vừa và nhỏ"
  ],
  "Content Creator (Sáng tạo nội dung)": [
    "Rèn luyện kỹ năng viết lách hàng ngày & học tư duy Storytelling (3 tháng)",
    "Tạo kênh nội dung cá nhân (Tiktok/Blog/Fanpage) và đạt mốc 1.000 followers đầu tiên (3 tháng)",
    "Học thiết kế Canva/Photoshop và dựng video cơ bản trên Capcut (2 tháng)",
    "Nhận các hợp đồng viết bài hoặc ứng tuyển Content Marketing Intern"
  ],
  "Digital Marketing Executive (Vận hành quảng cáo)": [
    "Học các kiến thức căn bản về Marketing & Hành vi khách hàng (3 tháng)",
    "Thực hành chạy quảng cáo Facebook Ads/Google Ads với ngân sách nhỏ (2 tháng)",
    "Học cách đọc chỉ số dữ liệu Google Analytics & tối ưu phễu chuyển đổi (2 tháng)",
    "Ứng tuyển vị trí Digital Marketing Executive hoặc chạy Freelance tối ưu ngân sách"
  ]
};




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
  const [riasec, setRiasec] = useState<RiasecResult | null>(null);
  const [rejected, setRejected] = useState<string[]>([]); // ngành đã bấm "Không phải tôi"
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string | null>(null);

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

  // Câu phá hoà (E1.3): user chọn 1 nhóm → ghi evidence, cập nhật RIASEC ngay.
  const handleTiebreak = async (letter: string) => {
    const res = await fetch(`${API_BASE}/profile/${profileId}/riasec/tiebreak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ letter }),
    });
    if (res.ok) setRiasec((await res.json()) as RiasecResult);
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
            : "Backend đang khởi động hoặc chưa kết nối. Vui lòng thử lại sau 30 giây."}
        </p>
        <Link href="/" className="inline-flex h-[42px] items-center justify-center rounded-lg bg-[#3525CD] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E00A9]">
          ← Về trang chủ làm khảo sát
        </Link>
      </main>
    );
  }

  /* ----- Dữ liệu dẫn xuất ----- */
  const { sorted } = calculateStrengths(data.evidence);
  const top3 = sorted.slice(0, 3);

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
                  onClick={() => setTab("ledger")}
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
                    {selectedJobTitle
                      ? `Lộ trình học tập & Kỹ năng: ${selectedJobTitle}`
                      : selectedIndustry
                        ? `Các nhánh nghề (Job Titles) thuộc ngành ${selectedIndustry}`
                        : "Nghề nghiệp phù hợp với bạn"
                    }
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
                ) : selectedIndustry === null ? (
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
                          return (
                            <article key={c.industry} className="rounded-2xl border border-gray-200/80 bg-white p-5 flex flex-col shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-brand/40">
                              {/* Header */}
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <span className="inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Gợi ý tham khảo</span>
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
                                    {gapSkill ? (
                                      <>Nếu em học thêm <b>{gapSkill.name}</b> → hồ sơ khớp ngành này rõ hơn.</>
                                    ) : (
                                      <>Em đã có nhiều kỹ năng cốt lõi — làm 1 dự án nhỏ để minh chứng là đủ mạnh.</>
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Chọn Ngành & Rẽ Nhánh (Chặng 2) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIndustry(c.industry);
                                  setSelectedJobTitle(null);
                                }}
                                className="mt-4 w-full rounded-xl bg-[#005c6d] hover:bg-[#004b58] py-2.5 text-xs font-bold text-white transition active:scale-[0.98]"
                              >
                                Khám phá các nhánh nghề (Job Titles) →
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
                ) : selectedJobTitle === null ? (
                  /* ─── CHẶNG 3: RẼ NHÁNH NGHỀ (JOB TITLES) ─── */
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setSelectedIndustry(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005c6d] hover:underline mb-2"
                    >
                      ← Quay lại danh sách ngành phù hợp
                    </button>

                    <div className="grid gap-5 md:grid-cols-2">
                      {(RAG_SKILL_MAP[selectedIndustry] || [
                        {
                          name: `Chuyên viên ${selectedIndustry} (Phổ thông)`,
                          isRecommended: true,
                          requiredSkills: ["Giao tiếp", "Làm việc nhóm", "Cẩn thận"],
                          preferredSkills: ["Giải quyết vấn đề", "Lập kế hoạch"],
                          optionalSkills: ["Tiếng Anh giao tiếp"],
                          salaryRange: "12 - 25 triệu/tháng",
                          fitPercentage: 80
                        }
                      ]).map((branch) => (
                        <div key={branch.name} className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col shadow-sm hover:shadow-md transition">
                          <div className="flex justify-between items-start">
                            <div>
                              {branch.isRecommended && (
                                <span className="inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wide mb-1">
                                  Nên bắt đầu từ đây
                                </span>
                              )}
                              <h4 className="font-extrabold text-[#111827] text-base leading-snug">{branch.name}</h4>
                            </div>
                            <span className="text-xs font-bold text-[#005c6d] bg-[#e6f1fb] px-2.5 py-1 rounded-lg">
                              {branch.fitPercentage}% khớp
                            </span>
                          </div>

                          <div className="mt-4 space-y-2 text-xs flex-1">
                            <p className="text-gray-600">
                              Lương tham chiếu: <b className="text-[#111827]">{branch.salaryRange}</b>
                            </p>
                            <p className="font-semibold text-gray-500 mt-2">Kỹ năng cốt lõi cần có:</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {branch.requiredSkills.map(sk => (
                                <span key={sk} className={`px-2 py-0.5 rounded text-[10px] font-medium ${owned.has(sk) ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-gray-50 text-gray-600 border border-gray-100"
                                  }`}>
                                  {sk} {owned.has(sk) ? "✓" : ""}
                                </span>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedJobTitle(branch.name)}
                            className="mt-5 w-full rounded-xl bg-[#005c6d] hover:bg-[#004b58] py-2 text-xs font-bold text-white transition"
                          >
                            Xem lộ trình học tập & Kỹ năng →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ─── CHẶNG 4: LỘ TRÌNH CHI TIẾT NHÁNH NGHỀ ─── */
                  <div className="space-y-6">
                    <button
                      type="button"
                      onClick={() => setSelectedJobTitle(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005c6d] hover:underline"
                    >
                      ← Quay lại danh sách nhánh nghề
                    </button>

                    <div className="grid gap-5 lg:grid-cols-12">
                      {/* Skill Gap phân loại buộc có / cần có / nên có */}
                      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm lg:col-span-7 space-y-4">
                        <h3 className="font-bold text-ink text-base">Bản đồ kỹ năng: {selectedJobTitle}</h3>

                        {(() => {
                          const branchData = (RAG_SKILL_MAP[selectedIndustry] || []).find(b => b.name === selectedJobTitle) || {
                            requiredSkills: ["Giao tiếp", "Làm việc nhóm", "Cẩn thận"],
                            preferredSkills: ["Giải quyết vấn đề", "Lập kế hoạch"],
                            optionalSkills: ["Tiếng Anh giao tiếp"]
                          };

                          return (
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2">1 · Buộc phải có (Required)</h4>
                                <div className="grid gap-2">
                                  {branchData.requiredSkills.map(sk => {
                                    const hasSk = owned.has(sk);
                                    return (
                                      <div key={sk} className="flex justify-between items-center text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50/50">
                                        <span className="font-medium text-gray-700">{sk}</span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${hasSk ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                          }`}>
                                          {hasSk ? "Đã có" : "↗ Cần học"}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">2 · Cần có (Preferred)</h4>
                                <div className="grid gap-2">
                                  {branchData.preferredSkills.map(sk => {
                                    const hasSk = owned.has(sk);
                                    return (
                                      <div key={sk} className="flex justify-between items-center text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50/50">
                                        <span className="font-medium text-gray-700">{sk}</span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${hasSk ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                          }`}>
                                          {hasSk ? "Đã có" : "↗ Cần học"}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">3 · Nên có thêm (Optional)</h4>
                                <div className="grid gap-2">
                                  {branchData.optionalSkills.map(sk => {
                                    const hasSk = owned.has(sk);
                                    return (
                                      <div key={sk} className="flex justify-between items-center text-xs p-2.5 rounded-lg border border-gray-100 bg-gray-50/50">
                                        <span className="font-medium text-gray-700">{sk}</span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${hasSk ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                          }`}>
                                          {hasSk ? "Đã có" : "↗ Cần học"}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Timeline 4 bước chi tiết */}
                      <div className="space-y-5 lg:col-span-5">
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                          <h3 className="font-bold text-ink text-base">Lộ trình 4 bước của bạn</h3>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            Mốc thời gian chi tiết được cá nhân hóa cho nhánh nghề
                          </p>
                          <ol className="relative mt-5 space-y-5">
                            <span
                              aria-hidden="true"
                              className="absolute bottom-4 left-[15px] top-1 w-0.5 bg-brand-light"
                            />
                            {(BRANCH_TIMELINE[selectedJobTitle] || milestones).map((step, i) => (
                              <li key={step} className="relative flex items-start gap-3.5">
                                <span
                                  className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold bg-[#005c6d] text-white"
                                >
                                  {i + 1}
                                </span>
                                <div>
                                  <p className="font-semibold text-ink text-sm leading-relaxed">{step}</p>
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Mở rộng cơ hội */}
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
                  </div>
                )}
              </div>
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

