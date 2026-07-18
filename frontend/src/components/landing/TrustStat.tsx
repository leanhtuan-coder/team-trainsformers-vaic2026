import { META } from "@/lib/demoData";
import { fmtInt } from "@/lib/format";

export function TrustStat({ stats }: { stats?: { totalJobs: number; careerGroups: number; provinces: number } | null }) {
  const displayStats = [
    { value: fmtInt(stats?.totalJobs ?? META.totalJobs), label: "Tin tuyển dụng" },
    { value: String(stats?.careerGroups ?? META.careerGroups), label: "Nhóm nghề" },
    { value: String(stats?.provinces ?? META.provinces), label: "Tỉnh thành" },
    { value: `${META.avgMatch}%`, label: "Độ phù hợp trung bình" },
  ];

  return (
    <section aria-label="Số liệu tổng quan" className="px-6 pb-20">
      <p className="mx-auto max-w-4xl pb-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft/70 md:text-sm">
        Được xây dựng tại VAIC 2026 · Dữ liệu tổng hợp từ tin tuyển dụng công khai
      </p>
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-y-8 rounded-2xl bg-gradient-to-r from-brand-dark to-brand-deep px-6 py-10 text-center text-white shadow-xl shadow-brand-deep/20 md:grid-cols-4">
        {displayStats.map((s) => (
          <div key={s.label}>
            <p className="text-3xl font-extrabold md:text-4xl">{s.value}</p>
            <p className="mt-1.5 text-sm text-white/70">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
