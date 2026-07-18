import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

// Pipeline OFFLINE (Bước 1-2, xem CONTEXT_PROMPT.md Mục 5.4 + docs/BA_DESIGN.md §6.1):
// đọc data/raw/jobs.json (JSONL — mỗi dòng 1 record, đã xác nhận qua kiểm tra thật, KHÔNG phải
// mảng JSON như giả định ban đầu), chuẩn hóa field, trích tín hiệu kỹ năng/ngành từ các section có
// label rõ ràng trong `description` (chỉ ~40% record có field này — xem coverage report cuối file).

const RAW_PATH = path.resolve(import.meta.dirname, "../../data/raw/jobs.json");
const OUT_DIR = path.resolve(import.meta.dirname, "../../data/processed");

interface RawJob {
  job_id: string;
  title: string;
  company: string;
  company_url?: string;
  salary?: string;
  location?: string;
  experience?: string;
  posted?: string;
  url?: string;
  page?: number;
  scraped_at?: string;
  description?: string;
  deadline?: string;
}

interface SalaryParsed {
  type: "range" | "negotiable" | "unknown";
  min?: number;
  max?: number;
  unit?: string;
  raw: string;
}

interface NormalizedJob {
  job_id: string;
  title: string;
  company: string;
  provinces: string[];
  extra_location_count: number;
  experience: string | null;
  salary: SalaryParsed;
  industries: string[];
  skills_required: string[];
  skills_preferred: string[];
  has_description: boolean;
  deadline: string | null;
  url: string | null;
  scraped_at: string | null;
}

// Nhãn section nhận diện được trong `description` (đã xác nhận qua khảo sát thật trên toàn bộ file,
// xem tần suất xuất hiện — 8/13 nhãn xuất hiện >=1300 lần trên 1332 record có description).
const SECTION_HEADERS = [
  "Mô tả công việc",
  "Yêu cầu ứng viên",
  "Kiến thức ngành",
  "Kỹ năng cần có",
  "Kỹ năng nên có",
  "Thu nhập",
  "Quyền lợi ứng viên",
  "Quyền lợi bổ sung",
  "Phúc lợi",
  "Địa điểm và thời gian",
  "Địa điểm làm việc",
  "Thời gian làm việc",
  "Cách thức ứng tuyển",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SECTION_SPLIT_RE = new RegExp(
  `(${SECTION_HEADERS.map(escapeRegExp).join("|")})\\n\\n`,
  "g"
);

function splitSections(description: string): Record<string, string> {
  const matches = [...description.matchAll(SECTION_SPLIT_RE)];
  const sections: Record<string, string> = {};
  for (let i = 0; i < matches.length; i++) {
    const header = matches[i][1];
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : description.length;
    sections[header] = description.slice(start, end).trim();
  }
  return sections;
}

function splitCommaList(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(",")
    .map((s) => cleanText(s))
    .filter(Boolean);
}

// Làm sạch ký tự thừa từ crawl (bullet, ký tự lặp, khoảng trắng thừa) — xem Mục 5.4 điểm 4.
function cleanText(text: string): string {
  return text
    .replace(/[••]/g, "")
    .replace(/\*\\?-/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLocation(raw: string | undefined): { provinces: string[]; extraCount: number } {
  if (!raw) return { provinces: [], extraCount: 0 };
  let s = raw.replace(/\s*\(mới\)/g, "");
  let extraCount = 0;
  const extraMatch = s.match(/&\s*(\d+)\s*nơi khác/);
  if (extraMatch) {
    extraCount = parseInt(extraMatch[1], 10);
    s = s.replace(/&\s*\d+\s*nơi khác/, "");
  }
  const provinces = s
    .split("&")
    .map((p) => p.trim())
    .filter(Boolean);
  return { provinces, extraCount };
}

function parseSalary(raw: string | undefined): SalaryParsed {
  const s = (raw ?? "").trim();
  if (!s) return { type: "unknown", raw: s };
  if (/thoả thuận|thoa thuan/i.test(s)) return { type: "negotiable", raw: s };
  const nums = [...s.matchAll(/[\d.,]+/g)].map((m) => parseFloat(m[0].replace(/,/g, ".")));
  if (nums.length === 0) return { type: "unknown", raw: s };
  const unit = /triệu/i.test(s) ? "triệu" : /usd|\$/i.test(s) ? "USD" : "unknown";
  return { type: "range", min: Math.min(...nums), max: Math.max(...nums), unit, raw: s };
}

function normalizeJob(raw: RawJob): NormalizedJob {
  const { provinces, extraCount } = normalizeLocation(raw.location);
  const sections = raw.description ? splitSections(raw.description) : {};
  return {
    job_id: raw.job_id,
    title: raw.title,
    company: raw.company,
    provinces,
    extra_location_count: extraCount,
    experience: raw.experience?.trim() || null,
    salary: parseSalary(raw.salary),
    industries: splitCommaList(sections["Kiến thức ngành"]),
    skills_required: splitCommaList(sections["Kỹ năng cần có"]),
    skills_preferred: splitCommaList(sections["Kỹ năng nên có"]),
    has_description: Boolean(raw.description),
    deadline: raw.deadline?.trim() || null,
    url: raw.url ?? null,
    scraped_at: raw.scraped_at ?? null,
  };
}

function incrementCount(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

async function main() {
  const rl = readline.createInterface({ input: createReadStream(RAW_PATH, "utf-8") });

  const normalizedJobs: NormalizedJob[] = [];
  const skillCounts = new Map<string, number>();
  const secondarySkillCounts = new Map<string, number>();
  const industryCounts = new Map<string, number>();
  const provinceCounts = new Map<string, number>();
  const salaryByIndustry = new Map<string, number[]>();

  // Phân tích tín hiệu xu hướng (cắt ngang — xem trend_note trong output):
  interface IndustryAgg {
    count: number;
    entryLevel: number;
    salaries: number[];
    skills: Map<string, number>;
    provinces: Map<string, number>;
  }
  const industryAgg = new Map<string, IndustryAgg>();
  const skillAgg = new Map<string, { count: number; industries: Map<string, number>; salaries: number[] }>();
  const experienceCounts = new Map<string, number>();
  // "Thân thiện người mới" = tin không yêu cầu kinh nghiệm hoặc dưới 1 năm — tín hiệu quan trọng
  // cho học sinh mới ra trường.
  const ENTRY_LEVEL = new Set(["Không yêu cầu", "Dưới 1 năm"]);

  let total = 0;
  let withDescription = 0;
  let withIndustry = 0;
  let withSkills = 0;
  let salaryHasNumber = 0;
  let salaryNegotiable = 0;
  let salaryUnknown = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    total++;
    const raw: RawJob = JSON.parse(line);
    const job = normalizeJob(raw);
    normalizedJobs.push(job);

    // Mẫu phân tích = CHỈ các tin có description đầy đủ (1.332/3.365 — crawl chi tiết được
    // từng đó). Mọi thống kê (kỹ năng, ngành, vùng, lương) tính trên CÙNG mẫu này để các con số
    // trên dashboard nhất quán với nhau; nhóm listing-level chỉ đếm vào total_scraped.
    if (!job.has_description) continue;

    withDescription++;
    if (job.industries.length > 0) withIndustry++;
    if (job.skills_required.length > 0) withSkills++;

    if (job.salary.type === "range") salaryHasNumber++;
    else if (job.salary.type === "negotiable") salaryNegotiable++;
    else salaryUnknown++;

    job.skills_required.forEach((s) => incrementCount(skillCounts, s));
    job.skills_preferred.forEach((s) => incrementCount(secondarySkillCounts, s));
    job.industries.forEach((ind) => incrementCount(industryCounts, ind));
    job.provinces.forEach((p) => incrementCount(provinceCounts, p));

    const salaryMid =
      job.salary.type === "range" && job.salary.unit === "triệu"
        ? (job.salary.min! + job.salary.max!) / 2
        : null;

    if (salaryMid !== null) {
      job.industries.forEach((ind) => {
        const arr = salaryByIndustry.get(ind) ?? [];
        arr.push(salaryMid);
        salaryByIndustry.set(ind, arr);
      });
    }

    // Tích lũy cho phân tích tín hiệu xu hướng
    if (job.experience) incrementCount(experienceCounts, job.experience);
    const isEntryLevel = job.experience !== null && ENTRY_LEVEL.has(job.experience);

    for (const ind of job.industries) {
      const agg = industryAgg.get(ind) ?? {
        count: 0,
        entryLevel: 0,
        salaries: [],
        skills: new Map(),
        provinces: new Map(),
      };
      agg.count++;
      if (isEntryLevel) agg.entryLevel++;
      if (salaryMid !== null) agg.salaries.push(salaryMid);
      job.skills_required.forEach((s) => incrementCount(agg.skills, s));
      job.provinces.forEach((p) => incrementCount(agg.provinces, p));
      industryAgg.set(ind, agg);
    }

    for (const skill of job.skills_required) {
      const agg = skillAgg.get(skill) ?? { count: 0, industries: new Map(), salaries: [] };
      agg.count++;
      if (salaryMid !== null) agg.salaries.push(salaryMid);
      job.industries.forEach((ind) => incrementCount(agg.industries, ind));
      skillAgg.set(skill, agg);
    }
  }

  const topN = (map: Map<string, number>, n: number) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({ name, count }));

  const median = (nums: number[]) => {
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const salaryByIndustrySummary = [...salaryByIndustry.entries()]
    .map(([industry, values]) => ({
      industry,
      sample_size: values.length,
      median_trieu: Math.round(median(values) * 10) / 10,
      min_trieu: Math.round(Math.min(...values) * 10) / 10,
      max_trieu: Math.round(Math.max(...values) * 10) / 10,
    }))
    .sort((a, b) => b.sample_size - a.sample_size);

  // Ngưỡng mẫu tối thiểu cho thống kê lương — dưới ngưỡng trả null ("chưa đủ dữ liệu"),
  // không hiển thị số kém tin cậy (BA_DESIGN.md F-01: "Không dùng số khi mẫu dưới ngưỡng").
  const MIN_SALARY_SAMPLE = 10;
  const salaryStat = (values: number[]) =>
    values.length >= MIN_SALARY_SAMPLE
      ? { median_trieu: Math.round(median(values) * 10) / 10, sample_size: values.length }
      : null;

  const industryInsights = [...industryAgg.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([industry, agg]) => ({
      industry,
      posting_count: agg.count,
      // % tin trong mẫu phân tích có nhắc tới ngành này (1 tin có thể thuộc nhiều ngành).
      demand_share: round(agg.count / withDescription),
      // % tin của ngành không yêu cầu kinh nghiệm hoặc <1 năm — "cửa vào" cho người mới.
      entry_level_ratio: round(agg.entryLevel / agg.count),
      salary: salaryStat(agg.salaries),
      top_skills: topN(agg.skills, 8),
      top_provinces: topN(agg.provinces, 5),
    }));

  const skillInsights = [...skillAgg.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([skill, agg]) => ({
      skill,
      posting_count: agg.count,
      demand_share: round(agg.count / withDescription),
      top_industries: topN(agg.industries, 5),
      salary: salaryStat(agg.salaries),
    }));

  const experienceDistribution = [...experienceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([level, count]) => ({ level, count, ratio: round(count / withDescription) }));

  // total_jobs = mẫu phân tích (tin có description đầy đủ). total_scraped = toàn bộ record
  // thu thập được ở mức danh sách — giữ lại để minh bạch, không dùng cho thống kê.
  const marketSignalSnapshot = {
    generated_at: new Date().toISOString(),
    total_jobs: withDescription,
    total_scraped: total,
    coverage: {
      description_present: { count: withDescription, ratio: round(withDescription / total) },
      industry_extracted: { count: withIndustry, ratio: round(withIndustry / withDescription) },
      skills_extracted: { count: withSkills, ratio: round(withSkills / withDescription) },
      salary_disclosed: { count: salaryHasNumber, ratio: round(salaryHasNumber / withDescription) },
      salary_negotiable: { count: salaryNegotiable, ratio: round(salaryNegotiable / withDescription) },
      salary_unknown: { count: salaryUnknown, ratio: round(salaryUnknown / withDescription) },
      note: `Mẫu phân tích gồm ${withDescription} tin tuyển dụng crawl được mô tả đầy đủ (trên ${total} tin thu thập ở mức danh sách). Mọi thống kê kỹ năng/ngành/vùng/lương đều tính trên cùng mẫu này. Thống kê lương CHỈ dùng nhóm có số cụ thể, không suy diễn cho nhóm 'thoả thuận'.`,
    },
    top_skills_required: topN(skillCounts, 30),
    top_skills_preferred: topN(secondarySkillCounts, 30),
    industries: topN(industryCounts, 30),
    provinces: topN(provinceCounts, 30),
    salary_by_industry: salaryByIndustrySummary,
    // Tín hiệu xu hướng CẮT NGANG (không phải chuỗi thời gian) — xem trend_note.
    trend_note:
      "Dữ liệu là snapshot 1 thời điểm (crawl 17/07/2026), tin đăng không có ngày đăng — các chỉ số dưới đây là TÍN HIỆU NHU CẦU HIỆN TẠI (demand share, cơ cấu), KHÔNG phải xu hướng tăng/giảm theo thời gian. Muốn có biến động theo thời gian cần chạy lại ingestion định kỳ và so sánh các snapshot. Lương chỉ thống kê khi mẫu >= 10 tin; dưới ngưỡng trả null (chưa đủ dữ liệu).",
    industry_insights: industryInsights,
    skill_insights: skillInsights,
    experience_distribution: experienceDistribution,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    path.join(OUT_DIR, "jobs_normalized.json"),
    JSON.stringify(normalizedJobs, null, 2)
  );
  await writeFile(
    path.join(OUT_DIR, "market_signal_snapshot.json"),
    JSON.stringify(marketSignalSnapshot, null, 2)
  );

  console.log(`Đã đọc ${total} record; mẫu phân tích = ${withDescription} tin có mô tả đầy đủ.`);
  console.log(`- Trích được ngành: ${withIndustry} (${pct(withIndustry, withDescription)} của mẫu)`);
  console.log(`- Trích được kỹ năng: ${withSkills} (${pct(withSkills, withDescription)} của mẫu)`);
  console.log(`- Lương có số cụ thể: ${salaryHasNumber} (${pct(salaryHasNumber, withDescription)} của mẫu)`);
  console.log(`- Lương "thoả thuận": ${salaryNegotiable} (${pct(salaryNegotiable, withDescription)} của mẫu)`);
  console.log(`Đã ghi: data/processed/jobs_normalized.json, data/processed/market_signal_snapshot.json`);
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function pct(n: number, total: number): string {
  return `${((n / total) * 100).toFixed(1)}%`;
}

main();
