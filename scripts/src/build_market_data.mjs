import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const INPUT_PATH = path.resolve(import.meta.dirname, "../../data/processed/jobs_normalized.json");
const OUTPUT_PATH = path.resolve(import.meta.dirname, "../../data/processed/market_data.json");

// Ordered from specific roles to broad roles because the first match wins.
const ROLE_RULES = [
  ["Kế toán", /(kế toán|accountant|accounting)/i],
  ["Kiểm toán", /(kiểm toán|auditor|audit)/i],
  ["Phân tích nghiệp vụ", /(business analyst|phân tích nghiệp vụ)/i],
  ["Phân tích dữ liệu", /(data analyst|bi analyst|business intelligence|phân tích dữ liệu)/i],
  ["Kiểm thử phần mềm", /(software tester|tester|quality assurance|kiểm thử|\bqa\b)/i],
  ["Lập trình viên", /(lập trình|developer|software engineer|frontend|front-end|backend|back-end|fullstack|full-stack)/i],
  ["Quản lý sản phẩm", /(product owner|product manager|quản lý sản phẩm)/i],
  ["Quản lý dự án", /(project manager|project coordinator|quản lý dự án)/i],
  ["Chuyên viên kinh doanh", /(business development|chuyên viên kinh doanh|phát triển kinh doanh)/i],
  ["Nhân viên kinh doanh", /(nhân viên kinh doanh|sales executive|sales staff|salesman)/i],
  ["Tư vấn bán hàng", /(tư vấn bán hàng|sales consultant|tư vấn viên)/i],
  ["Chăm sóc khách hàng", /(chăm sóc khách hàng|customer service|customer success|cskh)/i],
  ["Nhân viên bán hàng", /(nhân viên bán hàng|retail sales|bán hàng)/i],
  ["Marketing", /(marketing|marketer|truyền thông|content|seo|performance|digital)/i],
  ["Thiết kế", /(thiết kế|designer|graphic|ui\/ux|ux\/ui)/i],
  ["Nhân sự", /(nhân sự|human resources|tuyển dụng|recruitment|c&b|\bhr\b)/i],
  ["Hành chính", /(hành chính|administrative|văn phòng|\badmin\b)/i],
  ["Kỹ sư xây dựng", /(kỹ sư xây dựng|site engineer|civil engineer)/i],
  ["Giám sát công trình", /(giám sát công trình|giám sát thi công|site supervisor|chỉ huy trưởng)/i],
  ["Kiến trúc sư", /(kiến trúc sư|architect)/i],
  ["Kỹ sư cơ khí", /(kỹ sư cơ khí|mechanical engineer)/i],
  ["Kỹ sư điện", /(kỹ sư điện|electrical engineer|điện tử|điện lạnh|m&e)/i],
  ["Kỹ sư tự động hóa", /(tự động hóa|automation)/i],
  ["Kỹ thuật viên", /(kỹ thuật viên|technician|bảo trì|maintenance)/i],
  ["Tài chính", /(tài chính|financial|finance|investment|đầu tư)/i],
  ["Ngân hàng", /(ngân hàng|banking|tín dụng|credit)/i],
  ["Dược sĩ", /(dược sĩ|pharmacist)/i],
  ["Điều dưỡng", /(điều dưỡng|nurse|nursing)/i],
  ["Bác sĩ", /(bác sĩ|doctor|physician)/i],
  ["Giáo viên", /(giáo viên|teacher|giảng viên|tutor)/i],
  ["Logistics", /(logistics|vận tải|điều phối|giao nhận|xuất nhập khẩu|kho vận|warehouse)/i],
  ["Mua hàng", /(mua hàng|purchasing|procurement|buyer)/i],
  ["Vận hành", /(vận hành|operations|operation executive)/i],
  ["Sản xuất", /(sản xuất|production|quản lý chất lượng|quality control)/i],
  ["Quản lý cửa hàng", /(quản lý cửa hàng|store manager|cửa hàng trưởng)/i],
  ["Thu ngân", /(thu ngân|cashier)/i],
  ["Bất động sản", /(bất động sản|real estate|môi giới)/i],
  ["Pháp chế", /(pháp chế|legal|luật sư|lawyer)/i],
  ["Trợ lý", /(trợ lý|assistant|thư ký|secretary)/i],
  ["Thực tập sinh", /(thực tập|intern|internship)/i],
  ["Quản lý/Trưởng nhóm", /(manager|trưởng phòng|trưởng nhóm|team leader|supervisor|quản lý)/i],
];

const TITLE_NOISE = [
  /\([^)]*\)/g,
  /\[[^\]]*\]/g,
  /\b(lương|thu nhập|upto|up to|đến|tới)\b.*$/i,
  /\b(tại|ở|khu vực|làm việc tại)\b.*$/i,
  /\b(hà nội|hồ chí minh|hcm|tp\.hcm|đà nẵng|bình dương|đồng nai|bắc ninh|hải phòng)\b.*$/i,
  /\b(fulltime|parttime|part-time|full-time|remote|hybrid|online)\b/gi,
  /\b(nam|nữ|gấp|urgent|mới)\b/gi,
  /\b(junior|senior|middle|fresher|leader|lead|trưởng nhóm|trưởng phòng|nhân viên|chuyên viên)\b/gi,
  /[-–|,/:].*$/g,
];

function cleanIndustry(value) {
  return value.replace(/\s+Yêu cầu khác.*$/i, "").trim();
}

function cleanTitle(value) {
  return TITLE_NOISE.reduce((title, pattern) => title.replace(pattern, " "), value)
    .replace(/\s+/g, " ")
    .trim();
}

function inferRole(title) {
  for (const [role, pattern] of ROLE_RULES) {
    if (pattern.test(title)) return role;
  }
  return cleanTitle(title) || "Chưa phân loại";
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function increment(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function ranked(map) {
  return [...map.entries()]
    .sort(([nameA, countA], [nameB, countB]) => countB - countA || nameA.localeCompare(nameB, "vi"))
    .map(([name, job_count]) => ({ name, job_count }));
}

function newRoleAggregate() {
  return {
    jobIds: new Set(),
    skillsRequired: new Map(),
    skillsPreferred: new Map(),
    regions: new Map(),
    experience: new Map(),
    salaryMins: [],
    salaryMaxes: [],
    salaryMidpoints: [],
    negotiableSalaryCount: 0,
  };
}

function buildSalary(aggregate) {
  return {
    unit: "million_VND_per_month",
    min: aggregate.salaryMins.length ? round(Math.min(...aggregate.salaryMins)) : null,
    max: aggregate.salaryMaxes.length ? round(Math.max(...aggregate.salaryMaxes)) : null,
    median: aggregate.salaryMidpoints.length ? round(median(aggregate.salaryMidpoints)) : null,
    numeric_salary_job_count: aggregate.salaryMidpoints.length,
    negotiable_salary_job_count: aggregate.negotiableSalaryCount,
  };
}

function buildRole(name, aggregate) {
  return {
    name,
    job_count: aggregate.jobIds.size,
    skills_required: ranked(aggregate.skillsRequired),
    skills_preferred: ranked(aggregate.skillsPreferred),
    regions: ranked(aggregate.regions),
    salary: buildSalary(aggregate),
    work_nature: {
      employment_type: null,
      source_status: "not_available_in_jobs_normalized",
      experience_distribution: ranked(aggregate.experience),
    },
  };
}

async function main() {
  const jobs = JSON.parse(await readFile(INPUT_PATH, "utf8"));
  const industries = new Map();
  let analyzedJobCount = 0;

  for (const job of jobs) {
    // Skills and industries were extracted only for records with full descriptions.
    if (!job.has_description) continue;

    const jobIndustries = [...new Set((job.industries ?? []).map(cleanIndustry).filter(Boolean))];
    if (jobIndustries.length === 0) continue;
    analyzedJobCount++;

    const role = inferRole(job.title ?? "");
    const numericSalary = job.salary?.type === "range" && job.salary?.unit === "triệu";

    for (const industry of jobIndustries) {
      const industryAggregate = industries.get(industry) ?? { jobIds: new Set(), roles: new Map() };
      industryAggregate.jobIds.add(job.job_id);

      const roleAggregate = industryAggregate.roles.get(role) ?? newRoleAggregate();
      roleAggregate.jobIds.add(job.job_id);
      for (const skill of new Set(job.skills_required ?? [])) increment(roleAggregate.skillsRequired, skill.trim());
      for (const skill of new Set(job.skills_preferred ?? [])) increment(roleAggregate.skillsPreferred, skill.trim());
      for (const region of new Set(job.provinces ?? [])) increment(roleAggregate.regions, region.trim());
      increment(roleAggregate.experience, job.experience?.trim());

      if (numericSalary) {
        roleAggregate.salaryMins.push(job.salary.min);
        roleAggregate.salaryMaxes.push(job.salary.max);
        roleAggregate.salaryMidpoints.push((job.salary.min + job.salary.max) / 2);
      } else if (job.salary?.type === "negotiable") {
        roleAggregate.negotiableSalaryCount++;
      }

      industryAggregate.roles.set(role, roleAggregate);
      industries.set(industry, industryAggregate);
    }
  }

  const industryItems = [...industries.entries()]
    .map(([name, aggregate]) => ({
      name,
      job_count: aggregate.jobIds.size,
      roles: [...aggregate.roles.entries()]
        .map(([roleName, roleAggregate]) => buildRole(roleName, roleAggregate))
        .sort((a, b) => b.job_count - a.job_count || a.name.localeCompare(b.name, "vi")),
    }))
    .sort((a, b) => b.job_count - a.job_count || a.name.localeCompare(b.name, "vi"));

  const output = {
    market_data: {
      source: "data/processed/jobs_normalized.json",
      generated_at: new Date().toISOString(),
      sample: {
        source_job_count: jobs.length,
        analyzed_job_count: analyzedJobCount,
        rule: "Only jobs with full descriptions and at least one extracted industry are analyzed.",
      },
      methodology: {
        ordering: "Industries, roles, required skills, preferred skills, and regions are sorted by job_count descending.",
        counting: "job_count is the number of unique job_id values containing the item.",
        role: "Role is inferred from the job title using deterministic keyword rules; otherwise a cleaned title is used.",
        salary: "min is the lowest disclosed lower bound, max is the highest disclosed upper bound, and median is the median of per-job salary-range midpoints. Negotiable salaries are not imputed.",
        work_nature: "Employment type is unavailable in the source; experience_distribution is included without inferring employment type.",
      },
      industries: industryItems,
    },
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Industries: ${industryItems.length}; analyzed jobs: ${analyzedJobCount}/${jobs.length}`);
}

main();
