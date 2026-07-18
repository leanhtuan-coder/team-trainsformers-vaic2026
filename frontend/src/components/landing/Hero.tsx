"use client";

import { m } from "framer-motion";
import { HOT_LOCAL, META, TOP_SKILLS } from "@/lib/demoData";
import { fmtInt } from "@/lib/format";
import { EASE_OUT_EXPO, staggerContainer } from "@/lib/animation";
import { Parallax } from "@/components/ui/motion";

// H1 tách theo từ cho hiệu ứng "mask rise". LƯU Ý LCP: chữ nằm trong mask (overflow-hidden)
// nên chỉ paint khi trượt vào — giữ stagger 0.03 + duration 0.45 để tổng chuỗi ≤ ~0.9s.
// Dấu phẩy dính vào "thật," (teal) để flex gap không chèn khoảng trắng thừa trước dấu.
const HEADLINE: { text: string; brand?: boolean }[] = [
  { text: "Chọn" }, { text: "nghề" }, { text: "bằng" },
  { text: "dữ", brand: true }, { text: "liệu", brand: true }, { text: "thật,", brand: true },
  { text: "không" }, { text: "còn" }, { text: "cảm" }, { text: "tính" },
];

const wordMask = staggerContainer(0.03, 0.1);
const wordRise = {
  hidden: { y: "110%" },
  visible: { y: 0, transition: { duration: 0.45, ease: EASE_OUT_EXPO } },
};

// fadeUp phát khi LOAD (không chờ scroll), delay truyền qua `custom`.
const fadeUpLoad = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT_EXPO, delay },
  }),
};

export function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section id="tong-quan" aria-labelledby="hero-heading" className="relative overflow-hidden">
      {/* blob nền trôi chậm */}
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-8 h-72 w-72 rounded-full bg-brand-light opacity-70 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-28 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Thẻ glass nổi — parallax bọc ngoài + float CSS bên trong (chỉ màn rộng) */}
      <Parallax offset={40} className="absolute left-[5%] top-28 hidden xl:block">
        <m.div
          aria-hidden="true"
          className="glass animate-floaty rounded-2xl px-4 py-3 text-sm"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.9 }}
        >
          <p className="font-semibold text-ink">Phân tích Dữ liệu</p>
          <p className="font-bold text-accent-dark">{META.avgMatch}% phù hợp với bạn</p>
        </m.div>
      </Parallax>
      <Parallax offset={70} className="absolute right-[5%] top-24 hidden xl:block">
        <m.div
          aria-hidden="true"
          className="glass animate-floaty rounded-2xl px-4 py-3 text-sm"
          style={{ animationDelay: "1.4s" }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 1.05 }}
        >
          <p className="font-semibold text-ink">
            <span className="text-accent">●</span> Nhu cầu tăng {HOT_LOCAL[0].growth}
          </p>
          <p className="text-ink-soft">
            {TOP_SKILLS[0].name} {TOP_SKILLS[0].pct}% · SQL đang tăng
          </p>
        </m.div>
      </Parallax>

      <div className="relative mx-auto max-w-3xl px-6 pb-12 pt-14 text-center md:pt-20">
        <m.p
          className="inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-1.5 text-sm font-semibold text-brand"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.05 }}
        >
          ✦ Định hướng nghề bằng dữ liệu thật
        </m.p>

        <m.h1
          id="hero-heading"
          className="mt-5 flex flex-wrap justify-center gap-x-[0.28em] gap-y-1 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink md:text-[3.3rem]"
          variants={wordMask}
          initial="hidden"
          animate="visible"
        >
          {HEADLINE.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.15em] -mb-[0.15em]">
              <m.span variants={wordRise} className={`inline-block ${w.brand ? "text-brand" : ""}`}>
                {w.text}
              </m.span>
            </span>
          ))}
        </m.h1>

        <m.p
          className="mx-auto mt-5 max-w-xl text-base text-ink-soft md:text-lg"
          variants={fadeUpLoad}
          custom={0.5}
          initial="hidden"
          animate="visible"
        >
          La Bàn Nghề phân tích hồ sơ năng lực của bạn và đối chiếu với {fmtInt(META.totalJobs)} tin
          tuyển dụng thật để đưa ra lộ trình nghề cụ thể — có giải thích, có tuyến học.
        </m.p>

        <m.div
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          variants={fadeUpLoad}
          custom={0.62}
          initial="hidden"
          animate="visible"
        >
          <m.button
            type="button"
            onClick={onStart}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl bg-accent px-6 py-3.5 font-semibold text-white shadow-lg shadow-accent/25 transition-colors hover:bg-accent-dark"
          >
            Làm bài đánh giá →
          </m.button>
          <a
            href="#cach-hoat-dong"
            className="rounded-xl border border-gray-300 bg-white px-6 py-3.5 font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
          >
            Xem cách hoạt động
          </a>
        </m.div>

        <m.p
          className="mt-5 text-sm text-ink-soft"
          variants={fadeUpLoad}
          custom={0.72}
          initial="hidden"
          animate="visible"
        >
          ✓ Miễn phí cho học sinh · Dữ liệu từ {fmtInt(META.totalJobs)} tin tuyển dụng thật
        </m.p>
      </div>
    </section>
  );
}
