import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const INPUT_PATH = path.resolve(import.meta.dirname, "../../data/processed/market_signal_snapshot.json");
const OUT_JSON = path.resolve(import.meta.dirname, "../../data/processed/market_signal_ai_digest.json");
const OUT_MD = path.resolve(import.meta.dirname, "../../data/processed/market_signal_ai_digest.md");

function pct(n) {
  return `${Math.round(n * 1000) / 10}%`;
}

function salaryText(salary) {
  if (!salary) return "chưa đủ mẫu";
  return `${salary.median_trieu}tr median (${salary.sample_size} mẫu)`;
}

function topNames(items, n) {
  return items.slice(0, n).map((item) => item.name);
}

function compactIndustry(item) {
  return {
    industry: item.industry,
    jobs: item.posting_count,
    demand_share_pct: Math.round(item.demand_share * 1000) / 10,
    entry_level_pct: Math.round(item.entry_level_ratio * 1000) / 10,
    salary_median_trieu: item.salary?.median_trieu ?? null,
    salary_sample: item.salary?.sample_size ?? 0,
    top_skills: topNames(item.top_skills, 5),
    top_provinces: topNames(item.top_provinces, 3),
  };
}

function compactSkill(item) {
  return {
    skill: item.skill,
    jobs: item.posting_count,
    demand_share_pct: Math.round(item.demand_share * 1000) / 10,
    salary_median_trieu: item.salary?.median_trieu ?? null,
    salary_sample: item.salary?.sample_size ?? 0,
    top_industries: topNames(item.top_industries, 4),
  };
}

async function main() {
  const snapshot = JSON.parse(await readFile(INPUT_PATH, "utf-8"));

  const entryFriendlyIndustries = snapshot.industry_insights
    .filter((item) => item.posting_count >= 20)
    .sort((a, b) => b.entry_level_ratio - a.entry_level_ratio)
    .slice(0, 8)
    .map((item) => ({
      industry: item.industry,
      entry_level_pct: Math.round(item.entry_level_ratio * 1000) / 10,
      jobs: item.posting_count,
      salary_median_trieu: item.salary?.median_trieu ?? null,
    }));

  const reliableSalary = snapshot.salary_by_industry
    .filter((item) => item.sample_size >= 20)
    .sort((a, b) => b.median_trieu - a.median_trieu)
    .slice(0, 10)
    .map((item) => ({
      industry: item.industry,
      median_trieu: item.median_trieu,
      range_trieu: [item.min_trieu, item.max_trieu],
      sample_size: item.sample_size,
    }));

  const digest = {
    purpose:
      "Compact digest for AI analysis. Keeps high-signal fields only; source snapshot remains the ground truth.",
    generated_at: snapshot.generated_at,
    sample: {
      analyzed_jobs_with_full_description: snapshot.total_jobs,
      total_scraped_listing_records: snapshot.total_scraped,
      caveat:
        "Snapshot một thời điểm; các tỷ lệ là cơ cấu nhu cầu hiện tại, không phải xu hướng tăng/giảm theo thời gian.",
    },
    coverage: snapshot.coverage,
    market_headlines: [
      `Mẫu phân tích có ${snapshot.total_jobs} tin đủ mô tả trên ${snapshot.total_scraped} tin crawl.`,
      `Ngành có nhu cầu lớn nhất: ${snapshot.industries
        .slice(0, 5)
        .map((item) => `${item.name} (${item.count})`)
        .join(", ")}.`,
      `Kỹ năng bắt buộc nổi bật: ${snapshot.top_skills_required
        .slice(0, 8)
        .map((item) => `${item.name} (${item.count})`)
        .join(", ")}.`,
      `Địa bàn chính: ${snapshot.provinces
        .slice(0, 5)
        .map((item) => `${item.name} (${item.count})`)
        .join(", ")}.`,
    ],
    top_required_skills: snapshot.top_skills_required.slice(0, 15),
    top_preferred_skills: snapshot.top_skills_preferred.slice(0, 10),
    top_industries: snapshot.industry_insights.slice(0, 12).map(compactIndustry),
    top_provinces: snapshot.provinces.slice(0, 10),
    salary_highlights_by_median: reliableSalary,
    entry_friendly_industries: entryFriendlyIndustries,
    skill_insights: snapshot.skill_insights.slice(0, 12).map(compactSkill),
    experience_distribution: snapshot.experience_distribution,
    analysis_prompt:
      "Dựa trên digest này, hãy phân tích cơ hội nghề nghiệp cho học sinh/sinh viên: ngành dễ vào, kỹ năng nên học trước, vùng có nhiều nhu cầu, và lưu ý độ tin cậy của dữ liệu.",
  };

  const md = [
    "# Market Signal AI Digest",
    "",
    `- Generated: ${snapshot.generated_at}`,
    `- Sample: ${snapshot.total_jobs} tin đủ mô tả / ${snapshot.total_scraped} tin crawl`,
    "- Caveat: dữ liệu là snapshot một thời điểm, không phải chuỗi thời gian.",
    "",
    "## Tín hiệu chính",
    ...digest.market_headlines.map((line) => `- ${line}`),
    "",
    "## Top ngành",
    ...snapshot.industry_insights.slice(0, 10).map(
      (item) =>
        `- ${item.industry}: ${item.posting_count} tin, share ${pct(item.demand_share)}, entry ${pct(
          item.entry_level_ratio
        )}, lương ${salaryText(item.salary)}, skills: ${topNames(item.top_skills, 4).join(", ")}`
    ),
    "",
    "## Top kỹ năng bắt buộc",
    ...snapshot.top_skills_required
      .slice(0, 12)
      .map((item) => `- ${item.name}: ${item.count} tin`),
    "",
    "## Ngành thân thiện người mới",
    ...entryFriendlyIndustries.map(
      (item) =>
        `- ${item.industry}: entry ${item.entry_level_pct}%, ${item.jobs} tin, median ${
          item.salary_median_trieu ?? "N/A"
        }tr`
    ),
    "",
    "## Lương median cao, mẫu >= 20",
    ...reliableSalary.map(
      (item) =>
        `- ${item.industry}: median ${item.median_trieu}tr, range ${item.range_trieu[0]}-${item.range_trieu[1]}tr, ${item.sample_size} mẫu`
    ),
    "",
    "## Địa bàn chính",
    ...snapshot.provinces.slice(0, 10).map((item) => `- ${item.name}: ${item.count} tin`),
    "",
  ].join("\n");

  await writeFile(OUT_JSON, JSON.stringify(digest, null, 2));
  await writeFile(OUT_MD, md);

  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MD}`);
}

main();
