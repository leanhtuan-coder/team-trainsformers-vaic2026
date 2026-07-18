"use client";

import { META } from "@/lib/demoData";
import { Reveal, CountUp } from "@/components/ui/motion";
import { scaleIn, fadeUp } from "@/lib/animation";

// Mang số THÔ để CountUp đếm (fmtInt sẽ format vi-VN: 12480 -> 12.480).
const STATS = [
  { to: META.totalJobs, suffix: "", label: "Tin tuyển dụng" },
  { to: META.careerGroups, suffix: "", label: "Nhóm nghề" },
  { to: META.provinces, suffix: "", label: "Tỉnh thành" },
  { to: META.avgMatch, suffix: "%", label: "Độ phù hợp trung bình" },
];

export function TrustStat() {
  return (
    <section aria-label="Số liệu tổng quan" className="px-6 pb-20">
      <Reveal
        as="span"
        className="mx-auto block max-w-4xl pb-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft/70 md:text-sm"
      >
        Được xây dựng tại VAIC 2026 · Dữ liệu tổng hợp từ tin tuyển dụng công khai
      </Reveal>
      <Reveal
        variant={scaleIn}
        className="mx-auto grid max-w-5xl grid-cols-2 gap-y-8 rounded-2xl bg-gradient-to-r from-brand-dark to-brand-deep px-6 py-10 text-center text-white shadow-xl shadow-brand-deep/20 md:grid-cols-4"
      >
        {STATS.map((s, i) => (
          <Reveal key={s.label} variant={fadeUp} delay={0.15 + i * 0.1}>
            <p className="text-3xl font-extrabold md:text-4xl">
              <CountUp to={s.to} suffix={s.suffix} />
            </p>
            <p className="mt-1.5 text-sm text-white/70">{s.label}</p>
          </Reveal>
        ))}
      </Reveal>
    </section>
  );
}
