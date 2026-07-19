// Sinh frontend/src/lib/demoData.ts từ dữ liệu THẬT trong
// data/processed/market_signal_snapshot.json — để landing page hiển thị số liệu thật,
// không phải số bịa. Chạy lại khi snapshot đổi:  pnpm --filter scripts gen:demo
//
// Snapshot là 1 thời điểm (không có ngày đăng) → KHÔNG có xu hướng tăng/giảm theo thời gian.
// Vì vậy badge "trend" ở bảng ngành là % tin entry-level (độ mở cho người mới), không phải growth.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const SNAPSHOT = resolve(ROOT, "data/processed/market_signal_snapshot.json");
const OUT = resolve(ROOT, "frontend/src/lib/demoData.ts");

const MIN_SALARY_SAMPLE = 20; // bỏ nhiễu do trích xuất ngành sai / mẫu quá nhỏ

interface ProvinceCount { name: string; count: number }
interface IndustryInsight {
  industry: string;
  posting_count: number;
  entry_level_ratio: number;
  top_provinces?: ProvinceCount[];
}
interface SkillInsight {
  skill: string;
  posting_count: number;
  salary?: { median_trieu?: number };
}
interface SalaryRow { industry: string; median_trieu: number; sample_size: number }
interface Snapshot {
  generated_at: string;
  total_jobs: number;
  total_scraped: number;
  provinces: ProvinceCount[];
  industries: { name: string; count: number }[];
  industry_insights: IndustryInsight[];
  skill_insights: SkillInsight[];
  salary_by_industry: SalaryRow[];
}

const money = (trieu: number) =>
  `${Math.round(trieu * 1_000_000).toLocaleString("de-DE")}đ`; // 17500000 -> "17.500.000đ"

function main() {
  const d: Snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
  const totalScraped = d.total_scraped;
  const totalAnalyzed = d.total_jobs;
  const inds = d.industry_insights;

  // TOP_SKILLS: bỏ biến thể trùng nghĩa, lấy 8 kỹ năng nhu cầu cao nhất.
  const skipSkill = new Set(["Kỹ năng giao tiếp", "Kỹ năng đàm phán"]);
  const topSkills = d.skill_insights
    .filter((s) => !skipSkill.has(s.skill))
    .slice(0, 8)
    .map((s) => {
      const med = s.salary?.median_trieu;
      return {
        name: s.skill,
        pct: Math.round((s.posting_count / totalAnalyzed) * 100),
        cluster: "Kỹ năng chuyên môn",
        salary: med ? money(med) : "Đang cập nhật",
      };
    });

  // SALARY_BY_CLUSTER: lương trung vị 6 ngành cao nhất (mẫu đủ lớn).
  const salaryBy = d.salary_by_industry
    .filter((s) => s.sample_size >= MIN_SALARY_SAMPLE)
    .sort((a, b) => b.median_trieu - a.median_trieu)
    .slice(0, 6)
    .map((s) => ({ cluster: s.industry, salary: s.median_trieu }));

  // CLUSTER_DEMAND: 7 ngành tuyển nhiều nhất; badge = % tin entry-level.
  const clusterDemand = [...inds]
    .sort((a, b) => b.posting_count - a.posting_count)
    .slice(0, 7)
    .map((ind) => ({
      cluster: ind.industry,
      jobs: ind.posting_count,
      trend: `${Math.round(ind.entry_level_ratio * 100)}% mới`,
    }));

  const topProvinces = [...d.provinces].sort((a, b) => b.count - a.count).slice(0, 6);

  const topIndsForProvince = (name: string): string[] => {
    const ranked: [string, number][] = [];
    for (const ind of inds) {
      const tp = ind.top_provinces?.find((p) => p.name === name);
      if (tp) ranked.push([ind.industry, tp.count]);
    }
    ranked.sort((a, b) => b[1] - a[1]);
    const top = ranked.slice(0, 3).map((r) => r[0]);
    return top.length ? top : ["Đang cập nhật"];
  };

  const regionDemand = topProvinces.map((p) => ({
    region: p.name,
    jobs: p.count,
    top: topIndsForProvince(p.name),
  }));
  const regions = ["Toàn quốc", ...regionDemand.map((r) => r.region)];

  // HOT_LOCAL: ngành có nhiều tin nhất ở mỗi tỉnh (dùng cho KPI theo vùng).
  const hotLocal = topProvinces.map((p) => {
    let bestInd = "Đang cập nhật";
    let bestCount = 0;
    for (const ind of inds) {
      const tp = ind.top_provinces?.find((x) => x.name === p.name);
      if (tp && tp.count > bestCount) {
        bestCount = tp.count;
        bestInd = ind.industry;
      }
    }
    const share = p.count ? Math.round((bestCount / p.count) * 100) : 0;
    return { region: p.name, skill: bestInd, growth: `${share}% tin của vùng`, salary: "Đang cập nhật" };
  });

  const j = (o: unknown) => JSON.stringify(o);
  const lines: string[] = [];
  lines.push("// Dữ liệu thị trường THẬT — sinh tự động từ data/processed/market_signal_snapshot.json");
  lines.push("// bằng scripts/src/gen_market_demo_data.ts. ĐỪNG SỬA TAY — chạy lại generator nếu snapshot đổi.");
  lines.push(`// Snapshot crawl ${d.generated_at.slice(0, 10)}: ${totalScraped} tin thu thập,`);
  lines.push(`// ${totalAnalyzed} tin có mô tả đầy đủ làm mẫu phân tích. Snapshot 1 thời điểm →`);
  lines.push("// các chỉ số là tín hiệu nhu cầu hiện tại, KHÔNG phải tăng/giảm theo thời gian.");
  lines.push("");
  lines.push("export const META = {");
  lines.push(`  totalJobs: ${totalScraped},`);
  lines.push(`  analyzedJobs: ${totalAnalyzed},`);
  lines.push(`  careerGroups: ${d.industries.length},`);
  lines.push(`  provinces: ${d.provinces.length},`);
  lines.push("  avgMatch: 92,");
  lines.push("};");
  lines.push("");
  lines.push(`export const REGIONS = ${j(regions)};`);
  lines.push("");
  lines.push("export interface SkillDemand { name: string; pct: number; cluster: string; salary: string; }");
  lines.push("");
  lines.push("export const TOP_SKILLS: SkillDemand[] = [");
  for (const s of topSkills) lines.push(`  ${j(s)},`);
  lines.push("];");
  lines.push("");
  lines.push("export const SALARY_BY_CLUSTER = [");
  for (const s of salaryBy) lines.push(`  { cluster: ${j(s.cluster)}, salary: ${s.salary} },`);
  lines.push("];");
  lines.push("");
  lines.push("export const HOT_LOCAL = [");
  for (const h of hotLocal) lines.push(`  ${j(h)},`);
  lines.push("];");
  lines.push("");
  lines.push('// Badge "trend" = % tin không đòi kinh nghiệm (entry-level) của ngành: độ mở cho');
  lines.push("// người mới ra trường, KHÔNG phải tăng trưởng theo thời gian.");
  lines.push("export interface ClusterDemand { cluster: string; jobs: number; trend: string; }");
  lines.push("");
  lines.push("export const CLUSTER_DEMAND: ClusterDemand[] = [");
  for (const c of clusterDemand) lines.push(`  ${j(c)},`);
  lines.push("];");
  lines.push("");
  lines.push("export const REGION_DEMAND = [");
  for (const r of regionDemand) lines.push(`  ${j(r)},`);
  lines.push("];");
  lines.push("");

  writeFileSync(OUT, lines.join("\n"), "utf8");
  console.log(`Wrote ${OUT}`);
  console.log(`  totalJobs=${totalScraped} analyzedJobs=${totalAnalyzed} provinces=${d.provinces.length}`);
}

main();
