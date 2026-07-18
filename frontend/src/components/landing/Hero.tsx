"use client";

import { HOT_LOCAL, META, TOP_SKILLS } from "@/lib/demoData";
import { fmtInt } from "@/lib/format";

export function Hero({ onStart, totalJobs }: { onStart: () => void; totalJobs?: number }) {
  return (
    <section id="tong-quan" aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-8 h-72 w-72 rounded-full bg-brand-light opacity-70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-28 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
      />

      {/* Thẻ glass nổi hai bên — chỉ hiện màn rộng, thuần trang trí */}
      <div
        aria-hidden="true"
        className="glass absolute left-[5%] top-28 hidden animate-floaty rounded-2xl px-4 py-3 text-sm xl:block"
      >
        <p className="font-semibold text-ink">Phân tích Dữ liệu</p>
        <p className="font-bold text-accent-dark">{META.avgMatch}% phù hợp với bạn</p>
      </div>
      <div
        aria-hidden="true"
        className="glass absolute right-[5%] top-24 hidden animate-floaty rounded-2xl px-4 py-3 text-sm xl:block"
        style={{ animationDelay: "1.4s" }}
      >
        <p className="font-semibold text-ink">
          <span className="text-accent">●</span> Nhu cầu tăng {HOT_LOCAL[0].growth}
        </p>
        <p className="text-ink-soft">
          {TOP_SKILLS[0].name} {TOP_SKILLS[0].pct}% · SQL đang tăng
        </p>
      </div>

      <div className="relative mx-auto max-w-3xl px-6 pb-12 pt-14 text-center md:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-1.5 text-sm font-semibold text-brand">
          ✦ Định hướng nghề bằng dữ liệu thật
        </p>
        <h1
          id="hero-heading"
          className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink md:text-[3.3rem]"
        >
          Chọn nghề bằng <span className="text-brand">dữ liệu thật</span>, không còn cảm tính
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-ink-soft md:text-lg">
          La Bàn Nghề phân tích hồ sơ năng lực của bạn và đối chiếu với {fmtInt(totalJobs ?? META.totalJobs)} tin
          tuyển dụng thật để đưa ra lộ trình nghề cụ thể — có giải thích, có tuyến học.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="rounded-xl bg-accent px-6 py-3.5 font-semibold text-white shadow-lg shadow-accent/25 transition-colors hover:bg-accent-dark"
          >
            Làm bài đánh giá →
          </button>
          <a
            href="#cach-hoat-dong"
            className="rounded-xl border border-gray-300 bg-white px-6 py-3.5 font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
          >
            Xem cách hoạt động
          </a>
        </div>
        <p className="mt-5 text-sm text-ink-soft">
          ✓ Miễn phí cho học sinh · Dữ liệu từ {fmtInt(totalJobs ?? META.totalJobs)} tin tuyển dụng thật
        </p>
      </div>
    </section>
  );
}
