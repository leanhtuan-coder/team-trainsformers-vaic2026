import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DerivedProfileSnapshot } from "../profile/schema.js";
import {
  INDUSTRY_RIASEC_MAP,
  collectProfileSources,
  extractRiasecScores,
  normalizeToCeiling,
  scoreCorpusAgainstProfile,
  tokenize,
} from "./engine.js";

// Chặng 3 — nhánh chức danh cụ thể trong 1 ngành, xây lại từ dữ liệu tin tuyển dụng THẬT
// (jobs_normalized.json), KHÔNG dùng danh sách chức danh/Fit%/lương bịa (đã gỡ RAG_SKILL_MAP
// bịa ở phiên trước). Tiêu đề chức danh được nhóm bằng từ khoá xác định (deterministic) đối
// chiếu trực tiếp lên chuỗi title thật — không phải LLM sinh ra, nên không có rủi ro bịa nhãn.
// Fit%, lương, số tin, tỉ lệ nhận người mới đều tính trực tiếp từ các tin thuộc nhóm đó.

const JOBS_PATH = path.resolve(import.meta.dirname, "../../../data/processed/jobs_normalized.json");

interface RawJob {
  job_id: string;
  title: string;
  industries?: string[];
  skills_required?: string[];
  skills_preferred?: string[];
  experience?: string;
  salary?: { type: string; min?: number; max?: number; unit?: string };
}

let cachedJobs: RawJob[] | null = null;

async function loadJobs(): Promise<RawJob[]> {
  if (cachedJobs) return cachedJobs;
  const raw = await readFile(JOBS_PATH, "utf-8");
  cachedJobs = JSON.parse(raw);
  return cachedJobs!;
}

/** Nhóm chức danh theo từ khoá — thứ tự quan trọng: mẫu càng cụ thể đặt càng trước để không bị
 *  mẫu tổng quát (vd "developer") nuốt mất trước khi tới mẫu đặc thù hơn (vd "frontend"). */
const ROLE_KEYWORDS: { label: string; pattern: RegExp }[] = [
  { label: "Frontend Developer", pattern: /front[-\s]?end/i },
  { label: "Backend Developer", pattern: /back[-\s]?end/i },
  { label: "Full Stack Developer", pattern: /full[-\s]?stack/i },
  { label: "Mobile Developer (iOS/Android)", pattern: /\bios\b|\bandroid\b|mobile\s?(app|developer)/i },
  { label: "DevOps Engineer", pattern: /devops/i },
  { label: "QA / Kiểm thử phần mềm", pattern: /\bqa\b|tester|kiểm thử/i },
  { label: "Data Engineer", pattern: /data\s?engineer/i },
  { label: "Data Scientist", pattern: /data\s?scien|khoa học dữ liệu/i },
  { label: "Data Analyst", pattern: /data\s?analyst|phân tích dữ liệu/i },
  { label: "Business Analyst", pattern: /business analyst|\bba\b/i },
  { label: "Product Manager", pattern: /product manager|quản lý sản phẩm/i },
  { label: "IT Support / Helpdesk", pattern: /it support|helpdesk|hỗ trợ kỹ thuật/i },
  { label: "Software Engineer", pattern: /lập trình viên|developer|software engineer|kỹ sư phần mềm/i },
  { label: "Trưởng phòng / Giám đốc kinh doanh", pattern: /trưởng phòng kinh doanh|giám đốc kinh doanh|sales manager/i },
  { label: "Nhân viên kinh doanh", pattern: /nhân viên kinh doanh|sales executive|\bsale\b|kinh doanh/i },
  { label: "SEO / Digital Marketing", pattern: /\bseo\b|digital marketing/i },
  { label: "Content Creator", pattern: /content|sáng tạo nội dung/i },
  { label: "Marketing Executive", pattern: /marketing/i },
  { label: "Kế toán", pattern: /kế toán/i },
  { label: "Kiểm toán", pattern: /kiểm toán/i },
  { label: "Phân tích tài chính", pattern: /phân tích tài chính|financial analyst/i },
  { label: "Nhân sự / Tuyển dụng", pattern: /nhân sự|hr executive|tuyển dụng/i },
  { label: "UI/UX Designer", pattern: /ui\s?\/?\s?ux|thiết kế ui/i },
  { label: "Thiết kế đồ họa", pattern: /thiết kế đồ họa|graphic design/i },
  { label: "Kiến trúc sư", pattern: /kiến trúc sư/i },
  { label: "Kỹ sư xây dựng", pattern: /kỹ sư xây dựng|civil engineer/i },
  { label: "Kỹ sư cơ khí", pattern: /kỹ sư cơ khí|mechanical engineer/i },
  { label: "Kỹ sư điện", pattern: /kỹ sư điện|electrical engineer/i },
  { label: "Vận hành máy / Công nhân sản xuất", pattern: /công nhân|vận hành máy|operator/i },
  { label: "Kho vận / Giao nhận", pattern: /kho vận|logistics|thủ kho|giao nhận/i },
  { label: "Lái xe", pattern: /lái xe|tài xế/i },
  { label: "Chăm sóc khách hàng", pattern: /chăm sóc khách hàng|customer service/i },
  { label: "Giáo viên / Giảng viên", pattern: /giáo viên|giảng viên|đào tạo/i },
  { label: "Điều dưỡng", pattern: /điều dưỡng|y tá/i },
  { label: "Dược sĩ / Trình dược viên", pattern: /dược sĩ|trình dược viên/i },
  { label: "Bác sĩ", pattern: /bác sĩ/i },
  { label: "Nhân viên nhà hàng / khách sạn", pattern: /lễ tân|phục vụ|đầu bếp|nhà hàng|khách sạn/i },
  { label: "Môi giới bất động sản", pattern: /môi giới bất động sản|bất động sản/i },
  { label: "Pháp chế / Luật sư", pattern: /pháp chế|luật sư/i },
  { label: "Xuất nhập khẩu", pattern: /xuất nhập khẩu|chứng từ/i },
  { label: "Hành chính / Văn phòng", pattern: /hành chính|nhân viên văn phòng|thư ký/i },
  { label: "Spa / Làm đẹp", pattern: /\bspa\b|làm đẹp|thẩm mỹ/i },
  { label: "Bảo hiểm", pattern: /bảo hiểm/i },
  { label: "Thực tập sinh", pattern: /thực tập sinh|\bintern\b/i },
];

const ENTRY_LEVEL_PATTERN = /không yêu cầu|chưa có kinh nghiệm|dưới 1 năm|thực tập|mới ra trường|0\s*-\s*1/i;
const MIN_BRANCH_POSTINGS = 2;
const MAX_BRANCHES = 6;

export interface SkillWithTier {
  name: string;
  count: number;
  required_count: number;
  preferred_count: number;
  /** Phân loại từ tần suất THẬT trong tin tuyển dụng: bắt buộc/cần/nên có — không gán tay. */
  tier: "buoc_phai_co" | "can_co" | "nen_co";
}

export interface JobTitleBranch {
  title: string;
  posting_count: number;
  fit_score: number;
  hiring_volume: "cao" | "vừa" | "thấp";
  recommended: boolean;
  entry_level_ratio: number;
  salary: { median_trieu: number; min_trieu: number; max_trieu: number; sample_size: number } | null;
  top_skills: SkillWithTier[];
}

export interface JobTitleBranchResult {
  industry: string;
  generated_at: string;
  total_industry_postings: number;
  branches: JobTitleBranch[];
  data_limitations: string[];
}

function computeSalary(jobs: RawJob[]): JobTitleBranch["salary"] {
  const mins: number[] = [];
  const maxs: number[] = [];
  const mids: number[] = [];
  for (const j of jobs) {
    if (j.salary?.type === "range" && typeof j.salary.min === "number" && typeof j.salary.max === "number") {
      mins.push(j.salary.min);
      maxs.push(j.salary.max);
      mids.push((j.salary.min + j.salary.max) / 2);
    }
  }
  if (mids.length === 0) return null;
  mids.sort((a, b) => a - b);
  const median = mids[Math.floor(mids.length / 2)];
  return {
    median_trieu: Math.round(median),
    min_trieu: Math.min(...mins),
    max_trieu: Math.max(...maxs),
    sample_size: mids.length,
  };
}

/** Phân loại kỹ năng theo tần suất THẬT trong skills_required/skills_preferred của các tin thuộc
 *  nhánh chức danh này — không gán tay: xuất hiện là "required" trong đa số tin → buộc phải có;
 *  thỉnh thoảng là "required" → cần có; chỉ từng thấy ở "preferred" → nên có. */
function computeTopSkills(jobs: RawJob[]): SkillWithTier[] {
  const required = new Map<string, number>();
  const preferred = new Map<string, number>();
  for (const j of jobs) {
    for (const s of j.skills_required || []) {
      const key = s.trim();
      if (!key) continue;
      required.set(key, (required.get(key) || 0) + 1);
    }
    for (const s of j.skills_preferred || []) {
      const key = s.trim();
      if (!key) continue;
      preferred.set(key, (preferred.get(key) || 0) + 1);
    }
  }
  const names = new Set([...required.keys(), ...preferred.keys()]);
  const postingCount = jobs.length || 1;
  const skills: SkillWithTier[] = [...names].map((name) => {
    const required_count = required.get(name) || 0;
    const preferred_count = preferred.get(name) || 0;
    const requiredRatio = required_count / postingCount;
    const tier: SkillWithTier["tier"] =
      requiredRatio >= 0.4 ? "buoc_phai_co" : required_count > 0 ? "can_co" : "nen_co";
    return { name, count: required_count + preferred_count, required_count, preferred_count, tier };
  });
  return skills.sort((a, b) => b.count - a.count).slice(0, 10);
}

/** Chặng 3: nhánh chức danh cụ thể trong 1 ngành, tính hoàn toàn từ tin tuyển dụng thật thuộc
 *  đúng ngành đó. Trả về null nếu ngành không tồn tại trong dữ liệu. */
export async function getJobTitleBranches(
  industry: string,
  snapshot: DerivedProfileSnapshot
): Promise<JobTitleBranchResult | null> {
  const allJobs = await loadJobs();
  const industryJobs = allJobs.filter((j) => (j.industries || []).includes(industry));
  if (industryJobs.length === 0) return null;

  const profileSources = collectProfileSources(snapshot);
  const riasec = extractRiasecScores(snapshot);
  const mappedLetters = INDUSTRY_RIASEC_MAP[industry] || [];

  const buckets = new Map<string, RawJob[]>();
  for (const job of industryJobs) {
    const rule = ROLE_KEYWORDS.find((r) => r.pattern.test(job.title));
    if (!rule) continue;
    if (!buckets.has(rule.label)) buckets.set(rule.label, []);
    buckets.get(rule.label)!.push(job);
  }

  const rawBranches = [...buckets.entries()]
    .filter(([, jobs]) => jobs.length >= MIN_BRANCH_POSTINGS)
    .map(([title, jobs]) => {
      const topSkills = computeTopSkills(jobs);
      const corpusTokens = new Set([...tokenize(title), ...topSkills.flatMap((s) => tokenize(s.name))]);
      const { score } = scoreCorpusAgainstProfile(profileSources, corpusTokens, mappedLetters, riasec);
      const entryCount = jobs.filter((j) => j.experience && ENTRY_LEVEL_PATTERN.test(j.experience)).length;
      return {
        title,
        posting_count: jobs.length,
        raw_score: score,
        entry_level_ratio: Math.round((entryCount / jobs.length) * 100) / 100,
        salary: computeSalary(jobs),
        top_skills: topSkills,
      };
    });

  if (rawBranches.length === 0) return null;

  const maxCount = Math.max(...rawBranches.map((b) => b.posting_count), 1);
  const branches: JobTitleBranch[] = rawBranches
    .map((b) => {
      const hiring_volume: JobTitleBranch["hiring_volume"] =
        b.posting_count >= maxCount * 0.6 ? "cao" : b.posting_count >= maxCount * 0.25 ? "vừa" : "thấp";
      return {
        title: b.title,
        posting_count: b.posting_count,
        fit_score: normalizeToCeiling(b.raw_score),
        hiring_volume,
        recommended: false,
        entry_level_ratio: b.entry_level_ratio,
        salary: b.salary,
        top_skills: b.top_skills,
      };
    })
    .sort((a, b) => b.fit_score - a.fit_score || b.posting_count - a.posting_count)
    .slice(0, MAX_BRANCHES);

  // "Nên bắt đầu từ đây": tin cậy thật (đủ mẫu) + rộng cửa người mới + fit không quá thấp —
  // đánh dấu tối đa 2 nhánh đầu thoả điều kiện, không phải luôn luôn nhánh đứng đầu.
  let highlighted = 0;
  for (const b of branches) {
    if (highlighted >= 2) break;
    if (b.entry_level_ratio >= 0.25 && b.fit_score >= 30) {
      b.recommended = true;
      highlighted++;
    }
  }

  return {
    industry,
    generated_at: new Date().toISOString(),
    total_industry_postings: industryJobs.length,
    branches,
    data_limitations: [
      "Chức danh được nhóm theo từ khoá xuất hiện trong tiêu đề tin thật (đối chiếu chuỗi xác định) — một số tin có tiêu đề không rơi vào nhóm nào sẽ không xuất hiện ở đây.",
      "Fit% dùng cùng công thức chuẩn hoá với danh sách ngành ở Chặng 2 (mốc tuyệt đối, không phải so với chính nhóm cao nhất) — bằng chứng yếu vẫn ra % thấp trung thực.",
    ],
  };
}
