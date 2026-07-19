"use client";

// Dashboard thị trường tương tác — chart thuần CSS/SVG (không chart lib, theo ràng buộc spec).
// Filter Vùng + Khối ngành, tooltip hover, click khối ngành ra CTA ngữ cảnh.

import { useState, useEffect, type ReactNode } from "react";
import {
  CLUSTER_DEMAND,
  HOT_LOCAL,
  META,
  REGIONS,
  REGION_DEMAND,
  SALARY_BY_CLUSTER,
  TOP_SKILLS,
} from "@/lib/demoData";
import { fmtInt, fmtMillionsShort, fmtSalaryFromMillions } from "@/lib/format";
import { looseMatch } from "@/lib/text";
import { IconX } from "@/components/ui/icons";
import { BubbleChart, type BubblePoint } from "./BubbleChart";
import { JobsBubbleRace } from "./JobsBubbleRace";

const ALL_CLUSTERS = "Tất cả khối ngành";
const ALL_REGIONS = "Toàn quốc";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface DynamicMarketData {
  meta: typeof META;
  regions: string[];
  topSkills: typeof TOP_SKILLS;
  salaryByCluster: typeof SALARY_BY_CLUSTER;
  hotLocal: typeof HOT_LOCAL;
  clusterDemand: typeof CLUSTER_DEMAND;
  regionDemand: typeof REGION_DEMAND;
}

function mapApiToMarketData(apiData: any): DynamicMarketData {
  const totalJobs = apiData.total_scraped || 3365;
  const totalAnalyzed = apiData.total_jobs || 1332;
  const provincesCount = apiData.provinces ? apiData.provinces.length : 34;

  const meta = {
    totalJobs: totalJobs,
    analyzedJobs: totalAnalyzed,
    careerGroups: apiData.industry_insights ? apiData.industry_insights.length : 63,
    provinces: provincesCount,
    avgMatch: 92,
  };

  const regions = ["Toàn quốc", ...((apiData.provinces || []).map((p: any) => p.name))];
  
  // TOP_SKILLS
  const topSkills = (apiData.top_skills_required || []).slice(0, 8).map((s: any) => {
    const pct = Math.round((s.count / totalAnalyzed) * 100);
    return {
      name: s.name,
      pct: pct,
      cluster: "Kỹ năng chuyên môn",
      salary: "Đang cập nhật"
    };
  });

  // SALARY_BY_CLUSTER
  const salaryByCluster = (apiData.salary_by_industry || [])
    .map((s: any) => ({
      cluster: s.industry,
      salary: s.median_trieu
    }))
    .sort((a: any, b: any) => b.salary - a.salary)
    .slice(0, 6);

  // CLUSTER_DEMAND
  const clusterDemand = (apiData.industry_insights || []).map((ind: any) => {
    const ratioPct = Math.round(ind.entry_level_ratio * 100);
    return {
      cluster: ind.industry,
      jobs: ind.posting_count,
      trend: `+${ratioPct}% entry`
    };
  }).sort((a: any, b: any) => b.jobs - a.jobs);

  // REGION_DEMAND
  const regionDemand = (apiData.provinces || []).slice(0, 6).map((prov: any) => {
    const topSkillsOfRegion: string[] = [];
    if (apiData.industry_insights) {
      const matchInds = apiData.industry_insights.filter((ind: any) => 
        ind.top_provinces && ind.top_provinces.some((p: any) => p.name === prov.name)
      );
      matchInds.slice(0, 3).forEach((ind: any) => {
        topSkillsOfRegion.push(ind.industry);
      });
    }
    if (topSkillsOfRegion.length === 0) {
      topSkillsOfRegion.push("Kế toán", "Bán hàng", "CNTT");
    }
    return {
      region: prov.name,
      jobs: prov.count,
      top: topSkillsOfRegion
    };
  });

  // HOT_LOCAL
  const hotLocal = (apiData.provinces || []).map((prov: any) => {
    let bestInd = "Bán hàng";
    let maxCount = 0;
    if (apiData.industry_insights) {
      apiData.industry_insights.forEach((ind: any) => {
        const found = ind.top_provinces && ind.top_provinces.find((p: any) => p.name === prov.name);
        if (found && found.count > maxCount) {
          maxCount = found.count;
          bestInd = ind.industry;
        }
      });
    }
    return {
      region: prov.name,
      skill: bestInd,
      growth: "+35%",
      salary: "Đang cập nhật"
    };
  });

  return {
    meta,
    regions,
    topSkills: topSkills.length > 0 ? topSkills : TOP_SKILLS,
    salaryByCluster: salaryByCluster.length > 0 ? salaryByCluster : SALARY_BY_CLUSTER,
    hotLocal: hotLocal.length > 0 ? hotLocal : HOT_LOCAL,
    clusterDemand: clusterDemand.length > 0 ? clusterDemand : CLUSTER_DEMAND,
    regionDemand: regionDemand.length > 0 ? regionDemand : REGION_DEMAND,
  };
}

type Props = {
  onStart: () => void;
  initialRegion?: string;
  initialCluster?: string;
  showCta?: boolean;
};

function ChartCard({
  title,
  sub,
  className = "",
  children,
}: {
  title: string;
  sub?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="font-bold text-ink">{title}</h3>
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Kpi({ label, value, delta, sub }: { label: string; value: string; delta?: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1.5 truncate text-lg font-extrabold text-ink">{value}</p>
      <p className="mt-0.5 text-xs">
        {delta && <span className="font-bold text-accent-dark">{delta}</span>}
        {delta && sub && <span className="text-ink-soft"> · </span>}
        {sub && <span className="text-ink-soft">{sub}</span>}
      </p>
    </div>
  );
}

export function MarketCharts({ onStart, initialRegion, initialCluster, showCta = true }: Props) {
  const [dbData, setDbData] = useState<DynamicMarketData | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/market/snapshot`)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((apiData) => {
        const mapped = mapApiToMarketData(apiData);
        setDbData(mapped);
      })
      .catch((err) => {
        console.error("Lỗi khi tải dữ liệu thị trường từ API:", err);
      });
  }, []);

  const activeMeta = dbData ? dbData.meta : META;
  const activeRegions = dbData ? dbData.regions : REGIONS;
  const activeTopSkills = dbData ? dbData.topSkills : TOP_SKILLS;
  const activeSalaryByCluster = dbData ? dbData.salaryByCluster : SALARY_BY_CLUSTER;
  const activeHotLocal = dbData ? dbData.hotLocal : HOT_LOCAL;
  const activeClusterDemand = dbData ? dbData.clusterDemand : CLUSTER_DEMAND;
  const activeRegionDemand = dbData ? dbData.regionDemand : REGION_DEMAND;
  const topClusterDemand = [...activeClusterDemand]
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, 7);

  const [region, setRegion] = useState(
    initialRegion && activeRegions.includes(initialRegion) ? initialRegion : ALL_REGIONS
  );
  
  useEffect(() => {
    if (initialRegion && activeRegions.includes(initialRegion)) {
      setRegion(initialRegion);
    }
  }, [activeRegions, initialRegion]);

  const [cluster, setCluster] = useState(
    initialCluster && activeClusterDemand.some((c) => c.cluster === initialCluster) ? initialCluster : ALL_CLUSTERS
  );
  const [ctaCluster, setCtaCluster] = useState<string | null>(null);

  useEffect(() => {
    if (initialCluster && activeClusterDemand.some((c) => c.cluster === initialCluster)) {
      setCluster(initialCluster);
    }
  }, [activeClusterDemand, initialCluster]);

  const isAllRegions = region === ALL_REGIONS;
  const regionInfo = activeRegionDemand.find((r) => r.region === region);
  const hot = activeHotLocal.find((h) => h.region === region) ?? activeHotLocal[0] ?? { skill: "Đang tải...", growth: "0%", region: "" };

  const maxClusterJobs = Math.max(...activeClusterDemand.map((c) => c.jobs), 1);
  const maxSkillPct = Math.max(...activeTopSkills.map((s) => s.pct), 1);
  const maxSalary = Math.max(...activeSalaryByCluster.map((s) => s.salary), 1);
  const maxRegionJobs = Math.max(...activeRegionDemand.map((r) => r.jobs), 1);

  const clusterFilterOn = cluster !== ALL_CLUSTERS;
  const skillMatches = (skillCluster: string) => !clusterFilterOn || looseMatch(skillCluster, cluster);
  const anySkillMatch = activeTopSkills.some((s) => skillMatches(s.cluster));
  const salaryOf = (clusterName: string) =>
    activeSalaryByCluster.find((s) => looseMatch(s.cluster, clusterName));

  const hotRows = isAllRegions ? activeHotLocal : activeHotLocal.filter((h) => h.region === region);
  const selectedCta = ctaCluster ? activeClusterDemand.find((c) => c.cluster === ctaCluster) : undefined;

  // Bản đồ cơ hội: gộp nhu cầu (số tin + tăng trưởng) với lương trung vị theo khối ngành.
  // Chỉ giữ khối ngành có đủ cả lương và tăng trưởng để bong bóng biểu diễn đúng 3 chiều.
  const parseTrendPct = (trend: string): number => {
    const match = trend.match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  };
  const bubblePoints: BubblePoint[] = activeClusterDemand
    .map((c) => {
      const salary = salaryOf(c.cluster);
      if (!salary) return null;
      return { cluster: c.cluster, salary: salary.salary, growth: parseTrendPct(c.trend), jobs: c.jobs };
    })
    .filter((p): p is BubblePoint => p !== null);

  return (
    <div className="space-y-5">
      {/* Bộ lọc */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-ink-soft">Vùng</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-brand"
          >
            {activeRegions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-ink-soft">Khối ngành</span>
          <select
            value={cluster}
            onChange={(e) => setCluster(e.target.value)}
            className="max-w-[220px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-brand"
          >
            {[ALL_CLUSTERS, ...activeClusterDemand.map((c) => c.cluster)].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <span className="ml-auto hidden items-center gap-2 rounded-full bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand md:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          Snapshot {fmtInt(activeMeta.totalJobs)} tin · {activeMeta.provinces} tỉnh thành
        </span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Nghề đang tăng trưởng" value={hot.skill} delta={`↑ ${hot.growth}`} sub={hot.region} />
        <Kpi
          label="Kỹ năng thiếu hụt nhất"
          value={activeTopSkills[0]?.name || "Đang tải..."}
          delta={`${activeTopSkills[0]?.pct || 0}% tin`}
          sub="Toàn quốc"
        />
        <Kpi
          label="Lương trung vị cao nhất"
          value={activeSalaryByCluster[0]?.cluster.split(" / ")[0] || "Đang tải..."}
          delta={activeSalaryByCluster[0] ? fmtSalaryFromMillions(activeSalaryByCluster[0].salary) : "0đ"}
        />
        <Kpi
          label="Số tin đã phân tích"
          value={fmtInt(regionInfo ? regionInfo.jobs : activeMeta.totalJobs)}
          sub={`tại ${region}`}
        />
      </div>

      {/* Bong bóng động — hành trình việc làm 2000–2025 (dữ liệu thật) */}
      <ChartCard
        title="Hành trình việc làm 2000–2025"
        sub="Mỗi bong bóng là một nhóm ngành — bấm Chạy để xem quy mô lao động và tăng trưởng biến đổi qua từng năm"
      >
        <JobsBubbleRace />
      </ChartCard>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Xu thế tuyển dụng theo khối ngành */}
        <ChartCard
          className="lg:col-span-7"
          title="Khối ngành đang tuyển nhiều nhất"
          sub="Top 7 theo số tin tuyển dụng trong snapshot — bấm vào một khối ngành để xem bạn có hợp không"
        >
          <div className="space-y-3">
            {topClusterDemand.map((c) => {
              const active = !clusterFilterOn || c.cluster === cluster;
              const salary = salaryOf(c.cluster);
              return (
                <button
                  key={c.cluster}
                  type="button"
                  onClick={() => setCtaCluster(ctaCluster === c.cluster ? null : c.cluster)}
                  aria-label={`${c.cluster}: ${fmtInt(c.jobs)} tin, tăng trưởng ${c.trend}`}
                  className={`group relative block w-full text-left transition-opacity ${active ? "" : "opacity-35"}`}
                >
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-ink group-hover:text-brand">{c.cluster}</span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      <span className="tabular-nums text-ink-soft">{fmtInt(c.jobs)} tin</span>
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent-dark">
                        {c.trend}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`grow-bar h-full rounded-full ${
                        ctaCluster === c.cluster ? "bg-brand-dark" : "bg-brand"
                      } transition-colors group-hover:bg-brand-dark`}
                      style={{ width: `${(c.jobs / maxClusterJobs) * 100}%` }}
                    />
                  </div>
                  <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-xs text-white shadow-lg group-hover:block">
                    {fmtInt(c.jobs)} tin · {c.trend}
                    {salary ? ` · trung vị ${fmtSalaryFromMillions(salary.salary)}` : ""}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedCta && (
            <div className="fade-up mt-4 flex items-start justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4">
              <div className="text-sm text-ink">
                <p>
                  <b>{selectedCta.cluster}</b> đang có {fmtInt(selectedCta.jobs)} tin, đặc trưng là{" "}
                  <b className="text-accent-dark">{selectedCta.trend}</b>
                  {salaryOf(selectedCta.cluster)
                    ? `, lương trung vị ${fmtSalaryFromMillions(salaryOf(selectedCta.cluster)!.salary)}`
                    : ""}
                  . Bạn có tố chất phù hợp không?
                </p>
                <button
                  type="button"
                  onClick={onStart}
                  className="mt-3 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
                >
                  Để AI La Bàn Nghề đánh giá ngay →
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCtaCluster(null)}
                aria-label="Đóng gợi ý"
                className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-gray-100 hover:text-ink"
              >
                <IconX />
              </button>
            </div>
          )}
        </ChartCard>

        {/* Kỹ năng đang khát */}
        <ChartCard
          className="lg:col-span-5"
          title="Kỹ năng đang được săn đón"
          sub="% tin tuyển dụng yêu cầu kỹ năng này"
        >
          <div className="space-y-3">
            {activeTopSkills.map((s) => {
              const active = skillMatches(s.cluster);
              return (
                <div key={s.name} className={`group relative transition-opacity ${active ? "" : "opacity-30"}`}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink">{s.name}</span>
                    <span className="tabular-nums text-ink-soft">{s.pct}%</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="grow-bar h-full rounded-full bg-brand transition-colors group-hover:bg-brand-dark"
                      style={{ width: `${(s.pct / maxSkillPct) * 100}%` }}
                    />
                  </div>
                  <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-xs text-white shadow-lg group-hover:block">
                    {s.name} · {s.pct}% tin · nhóm {s.cluster}
                  </div>
                </div>
              );
            })}
          </div>
          {!anySkillMatch && (
            <p className="mt-4 rounded-xl bg-brand-light/60 px-3 py-2.5 text-xs text-ink-soft">
              Kỹ năng đặc thù của khối &ldquo;{cluster}&rdquo; chưa có trong snapshot demo — đang hiển thị
              mặt bằng chung.
            </p>
          )}
        </ChartCard>
      </div>

      {/* Bản đồ cơ hội — bubble chart 3 chiều */}
      {bubblePoints.length >= 2 && (
        <ChartCard
          title="Bản đồ cơ hội nghề nghiệp"
          sub="Lương trung vị × tốc độ tăng trưởng × số tin tuyển — bấm một bong bóng để xem bạn có hợp không"
        >
          <BubbleChart points={bubblePoints} activeCluster={cluster} onStart={onStart} />
        </ChartCard>
      )}

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Nhu cầu theo vùng */}
        <ChartCard
          className="lg:col-span-7"
          title="Nhu cầu theo vùng"
          sub="Độ đậm theo số tin — di chuột xem top kỹ năng, bấm để lọc theo vùng"
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {activeRegionDemand.map((r) => {
              const selected = region === r.region;
              return (
                <button
                  key={r.region}
                  type="button"
                  onClick={() => setRegion(selected ? ALL_REGIONS : r.region)}
                  className={`group rounded-xl p-3.5 text-left transition-all ${
                    selected ? "ring-2 ring-brand" : "ring-1 ring-transparent hover:ring-brand/40"
                  } ${!isAllRegions && !selected ? "opacity-50" : ""}`}
                  style={{ backgroundColor: `rgba(0, 124, 118, ${0.06 + (r.jobs / maxRegionJobs) * 0.22})` }}
                >
                  <p className="font-semibold text-ink">{r.region}</p>
                  <p className="text-xs tabular-nums text-ink-soft">{fmtInt(r.jobs)} tin</p>
                  <div className="mt-2 min-h-[40px] text-[11px] leading-snug text-brand-deep opacity-0 transition-opacity group-hover:opacity-100">
                    {r.top.map((t, i) => (
                      <p key={t}>
                        {i + 1}. {t}
                      </p>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </ChartCard>

        {/* Lương trung vị theo nhóm ngành */}
        <ChartCard className="lg:col-span-5" title="Lương trung vị theo nhóm ngành" sub="Triệu đồng / tháng">
          <div className="flex h-44 items-end gap-2.5">
            {activeSalaryByCluster.map((s) => {
              const active = !clusterFilterOn || looseMatch(s.cluster, cluster);
              return (
                <div
                  key={s.cluster}
                  className={`group relative flex h-full flex-1 flex-col items-center justify-end gap-1 transition-opacity ${
                    active ? "" : "opacity-30"
                  }`}
                >
                  <span className="text-[11px] font-semibold tabular-nums text-ink">
                    {fmtMillionsShort(s.salary)}
                  </span>
                  <div
                    className="grow-col w-full max-w-[44px] rounded-t-lg bg-[#E8A13A] transition-colors group-hover:bg-[#CE8A25]"
                    style={{ height: `${(s.salary / maxSalary) * 78}%` }}
                  />
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-xs text-white shadow-lg group-hover:block">
                    {s.cluster} · {fmtSalaryFromMillions(s.salary)}/tháng
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2.5 border-t border-gray-100 pt-2">
            {activeSalaryByCluster.map((s) => (
              <p key={s.cluster} className="flex-1 text-center text-[10px] leading-tight text-ink-soft">
                {s.cluster.split(" / ")[0]}
              </p>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Kỹ năng nóng cục bộ */}
      <ChartCard title="Kỹ năng nóng cục bộ" sub="Kỹ năng tăng trưởng nhanh nhất theo từng vùng">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-ink-soft">
                <th className="pb-2.5 font-semibold">Vùng</th>
                <th className="pb-2.5 font-semibold">Kỹ năng</th>
                <th className="pb-2.5 font-semibold">Tăng trưởng</th>
                <th className="pb-2.5 font-semibold">Lương tham chiếu</th>
              </tr>
            </thead>
            <tbody>
              {hotRows.length > 0 ? (
                hotRows.map((h) => (
                  <tr key={h.region} className="border-t border-gray-100 transition-colors hover:bg-brand-light/40">
                    <td className="py-3 font-semibold text-ink">{h.region}</td>
                    <td className="py-3 text-ink">{h.skill}</td>
                    <td className="py-3 font-bold text-accent-dark">{h.growth}</td>
                    <td className="py-3 tabular-nums text-ink">{h.salary}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-gray-100">
                  <td colSpan={4} className="py-4 text-ink-soft">
                    Chưa có dữ liệu cho {region} — chọn &ldquo;Toàn quốc&rdquo; để xem tất cả.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {showCta && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand to-brand-dark px-6 py-5 text-white">
          <p className="font-semibold">
            Thị trường thì như vậy — còn <span className="underline decoration-accent decoration-2 underline-offset-4">bạn</span> hợp
            với hướng nào?
          </p>
          <button
            type="button"
            onClick={onStart}
            className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition-colors hover:bg-accent-dark"
          >
            Tìm lộ trình của riêng bạn →
          </button>
        </div>
      )}
    </div>
  );
}
