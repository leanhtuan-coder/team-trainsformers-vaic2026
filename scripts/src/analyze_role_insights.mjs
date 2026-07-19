import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const INPUT_PATH = path.resolve(import.meta.dirname, "../../data/processed/jobs_normalized.json");
const OUT_PATH = path.resolve(import.meta.dirname, "../../data/processed/industry_role_insights.json");

const TOP_INDUSTRIES = 20;
const TOP_ROLES_PER_INDUSTRY = 12;
const HOT_ROLES_PER_INDUSTRY = 8;
const MIN_HOT_ROLE_POSTINGS = 3;
const MIN_SALARY_SAMPLE = 3;

const ROLE_RULES = [
  ["Kế toán", /\b(kế toán|accountant|accounting)\b/i],
  ["Kiểm toán", /\b(kiểm toán|audit|auditor)\b/i],
  ["Nhân viên kinh doanh", /\b(nhân viên kinh doanh|sales executive|sales staff|salesman|sales)\b/i],
  ["Chuyên viên kinh doanh", /\b(chuyên viên kinh doanh|business development|bd executive|phát triển kinh doanh)\b/i],
  ["Tư vấn bán hàng", /\b(tư vấn bán hàng|sales consultant|tư vấn viên)\b/i],
  ["Chăm sóc khách hàng", /\b(chăm sóc khách hàng|customer service|cskh|customer success)\b/i],
  ["Marketing", /\b(marketing|marketer|truyền thông|content|seo|performance|digital)\b/i],
  ["Thiết kế", /\b(thiết kế|designer|design|graphic|ui\/ux|ux\/ui)\b/i],
  ["Nhân sự", /\b(nhân sự|hr|human resources|tuyển dụng|recruitment|c&b)\b/i],
  ["Hành chính", /\b(hành chính|admin|administrative|văn phòng)\b/i],
  ["Kỹ sư xây dựng", /\b(kỹ sư xây dựng|site engineer|civil engineer|xây dựng)\b/i],
  ["Giám sát công trình", /\b(giám sát công trình|giám sát thi công|site supervisor|chỉ huy trưởng)\b/i],
  ["Kiến trúc sư", /\b(kiến trúc sư|architect)\b/i],
  ["Kỹ sư cơ khí", /\b(kỹ sư cơ khí|mechanical engineer|cơ khí)\b/i],
  ["Kỹ sư điện", /\b(kỹ sư điện|electrical engineer|điện tử|điện lạnh|m&e)\b/i],
  ["Kỹ sư tự động hóa", /\b(tự động hóa|automation)\b/i],
  ["Lập trình viên", /\b(lập trình|developer|software engineer|frontend|front-end|backend|back-end|fullstack|full-stack|java|php|python|react|nodejs|node\.js)\b/i],
  ["Kiểm thử phần mềm", /\b(tester|qa|qc|quality assurance|kiểm thử)\b/i],
  ["Phân tích nghiệp vụ", /\b(business analyst|ba|phân tích nghiệp vụ)\b/i],
  ["Phân tích dữ liệu", /\b(data analyst|business intelligence|bi analyst|phân tích dữ liệu)\b/i],
  ["Quản lý sản phẩm", /\b(product owner|product manager|quản lý sản phẩm)\b/i],
  ["Tài chính", /\b(tài chính|financial|finance|investment|đầu tư)\b/i],
  ["Ngân hàng", /\b(ngân hàng|bank|banking|tín dụng|credit)\b/i],
  ["Dược sĩ", /\b(dược sĩ|pharmacist|dược)\b/i],
  ["Điều dưỡng", /\b(điều dưỡng|nurse|nursing)\b/i],
  ["Bác sĩ", /\b(bác sĩ|doctor|physician)\b/i],
  ["Giáo viên", /\b(giáo viên|teacher|giảng viên|tutor|đào tạo)\b/i],
  ["Logistics", /\b(logistics|logistic|vận tải|điều phối|giao nhận|xuất nhập khẩu|kho vận|warehouse)\b/i],
  ["Mua hàng", /\b(mua hàng|purchasing|procurement|buyer)\b/i],
  ["Vận hành", /\b(vận hành|operations|operation executive)\b/i],
  ["Sản xuất", /\b(sản xuất|production|quản lý chất lượng|quality control|qc)\b/i],
  ["Kỹ thuật viên", /\b(kỹ thuật viên|technician|bảo trì|maintenance)\b/i],
  ["Quản lý cửa hàng", /\b(quản lý cửa hàng|store manager|cửa hàng trưởng)\b/i],
  ["Thu ngân", /\b(thu ngân|cashier)\b/i],
  ["Nhân viên bán hàng", /\b(nhân viên bán hàng|bán hàng|retail sales)\b/i],
  ["Bất động sản", /\b(bất động sản|real estate|môi giới)\b/i],
  ["Pháp chế", /\b(pháp chế|legal|luật sư|lawyer)\b/i],
  ["Trợ lý", /\b(trợ lý|assistant|thư ký|secretary)\b/i],
  ["Quản lý dự án", /\b(project manager|quản lý dự án|project coordinator)\b/i],
  ["Quản lý/Trưởng nhóm", /\b(manager|trưởng phòng|trưởng nhóm|team leader|lead|supervisor|quản lý)\b/i],
  ["Thực tập sinh", /\b(thực tập|intern|internship)\b/i],
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

const ENTRY_LEVEL = new Set(["Không yêu cầu", "Dưới 1 năm"]);

function cleanIndustry(industry) {
  return industry.replace(/\s+Yêu cầu khác.*$/i, "").trim();
}

function cleanTitle(title) {
  return TITLE_NOISE.reduce((value, re) => value.replace(re, " "), title)
    .replace(/\s+/g, " ")
    .trim();
}

function inferRole(title) {
  for (const [role, re] of ROLE_RULES) {
    if (re.test(title)) return role;
    const unicodeRelaxed = new RegExp(re.source.replaceAll("\\b", ""), re.flags);
    if (unicodeRelaxed.test(title)) return role;
  }

  const fallback = cleanTitle(title);
  return fallback || "Chưa phân loại";
}

function salaryMid(job) {
  if (job.salary?.type !== "range" || job.salary.unit !== "triệu") return null;
  return (job.salary.min + job.salary.max) / 2;
}

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round(n, digits = 3) {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}

function topN(map, n) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"))
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

function pushLimitedUnique(arr, value, limit) {
  if (!value || arr.includes(value)) return;
  if (arr.length < limit) arr.push(value);
}

function rolePayload(role, agg, industryPostingCount) {
  const salary =
    agg.salaries.length >= MIN_SALARY_SAMPLE
      ? {
          median_trieu: round(median(agg.salaries), 1),
          min_trieu: round(Math.min(...agg.salaries), 1),
          max_trieu: round(Math.max(...agg.salaries), 1),
          sample_size: agg.salaries.length,
        }
      : null;

  return {
    role,
    posting_count: agg.count,
    share_in_industry: round(agg.count / industryPostingCount),
    entry_level_count: agg.entryLevel,
    entry_level_ratio: round(agg.entryLevel / agg.count),
    salary,
    top_provinces: topN(agg.provinces, 5),
    top_skills: topN(agg.skills, 8),
    example_titles: agg.exampleTitles,
  };
}

function hotScore(roleItem, maxRoleCount, maxSalaryMedian) {
  const demand = roleItem.posting_count / maxRoleCount;
  const salary = roleItem.salary && maxSalaryMedian > 0 ? roleItem.salary.median_trieu / maxSalaryMedian : 0;
  const entry = roleItem.entry_level_ratio;
  const provinceSpread = Math.min(roleItem.top_provinces.length / 5, 1);
  return round(demand * 0.55 + salary * 0.25 + entry * 0.1 + provinceSpread * 0.1, 3);
}

async function main() {
  const jobs = JSON.parse(await readFile(INPUT_PATH, "utf-8"));
  const industryAgg = new Map();
  let withDescription = 0;
  let withIndustry = 0;

  for (const job of jobs) {
    if (!job.has_description) continue;
    withDescription++;

    const industries = [...new Set((job.industries ?? []).map(cleanIndustry).filter(Boolean))];
    if (industries.length === 0) continue;
    withIndustry++;

    const role = inferRole(job.title ?? "");
    const mid = salaryMid(job);
    const isEntryLevel = job.experience != null && ENTRY_LEVEL.has(job.experience);

    for (const industry of industries) {
      const indAgg = industryAgg.get(industry) ?? { count: 0, roles: new Map() };
      indAgg.count++;

      const roleAgg =
        indAgg.roles.get(role) ?? {
          count: 0,
          entryLevel: 0,
          salaries: [],
          provinces: new Map(),
          skills: new Map(),
          exampleTitles: [],
        };
      roleAgg.count++;
      if (isEntryLevel) roleAgg.entryLevel++;
      if (mid !== null) roleAgg.salaries.push(mid);
      for (const province of job.provinces ?? []) roleAgg.provinces.set(province, (roleAgg.provinces.get(province) ?? 0) + 1);
      for (const skill of job.skills_required ?? []) roleAgg.skills.set(skill, (roleAgg.skills.get(skill) ?? 0) + 1);
      pushLimitedUnique(roleAgg.exampleTitles, job.title, 3);

      indAgg.roles.set(role, roleAgg);
      industryAgg.set(industry, indAgg);
    }
  }

  const industryItems = [...industryAgg.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0], "vi"))
    .slice(0, TOP_INDUSTRIES)
    .map(([industry, agg]) => {
      const allRoles = [...agg.roles.entries()]
        .map(([role, roleAgg]) => rolePayload(role, roleAgg, agg.count))
        .sort((a, b) => b.posting_count - a.posting_count || a.role.localeCompare(b.role, "vi"));

      const candidates = allRoles.filter(
        (item) => item.role !== "Chưa phân loại" && item.posting_count >= MIN_HOT_ROLE_POSTINGS
      );
      const maxRoleCount = Math.max(...candidates.map((item) => item.posting_count), 1);
      const maxSalaryMedian = Math.max(...candidates.map((item) => item.salary?.median_trieu ?? 0), 0);
      const hot_roles = candidates
        .map((item) => ({
          ...item,
          hot_score: hotScore(item, maxRoleCount, maxSalaryMedian),
          hot_reason: [
            `${item.posting_count} tin`,
            item.salary ? `median ${item.salary.median_trieu} triệu` : "lương chưa đủ mẫu",
            `${round(item.entry_level_ratio * 100, 1)}% entry-level`,
            `${item.top_provinces.length} tỉnh/thành nổi bật`,
          ],
        }))
        .sort((a, b) => b.hot_score - a.hot_score || b.posting_count - a.posting_count)
        .slice(0, HOT_ROLES_PER_INDUSTRY);

      return {
        industry,
        posting_count: agg.count,
        demand_share_of_analyzed_jobs: round(agg.count / withDescription),
        top_roles_by_job_count: allRoles.slice(0, TOP_ROLES_PER_INDUSTRY),
        hot_roles,
      };
    });

  const output = {
    generated_at: new Date().toISOString(),
    source: "data/processed/jobs_normalized.json",
    output_note:
      "Role được suy ra từ title bằng rule-based heuristic; hot_score là chỉ số xếp hạng nội bộ kết hợp demand, median salary khi đủ mẫu, entry-level ratio và độ phủ tỉnh/thành.",
    sample: {
      analyzed_jobs_with_full_description: withDescription,
      jobs_with_industry: withIndustry,
      top_industries_returned: industryItems.length,
    },
    scoring: {
      hot_score_weights: {
        posting_count_within_industry: 0.55,
        salary_median_when_sample_at_least_3: 0.25,
        entry_level_ratio: 0.1,
        province_spread: 0.1,
      },
      min_hot_role_postings: MIN_HOT_ROLE_POSTINGS,
      min_salary_sample_for_role: MIN_SALARY_SAMPLE,
    },
    industries: industryItems,
  };

  await writeFile(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Analyzed ${withDescription} jobs with descriptions; ${withIndustry} jobs have industries.`);
}

main();
