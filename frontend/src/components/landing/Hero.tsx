"use client";

import { m } from "framer-motion";
import Image from "next/image";
import { META } from "@/lib/demoData";
import { fmtInt } from "@/lib/format";
import { EASE_OUT_EXPO, staggerContainer } from "@/lib/animation";

// H1 là tên thương hiệu "CareerRadar" với hiệu ứng "mask rise". LCP: chữ nằm trong mask
// (overflow-hidden) nên chỉ paint khi trượt vào.
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

      {/* Logo phóng to, chìm làm watermark phía sau nội dung hero */}
      <Image
        src="/logo.png"
        alt=""
        aria-hidden="true"
        width={950}
        height={950}
        priority
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 -translate-y-[12%] select-none opacity-[0.07] md:h-[780px] md:w-[780px]"
      />

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
          className="mt-5 flex justify-center text-6xl font-extrabold leading-[1.05] tracking-tight text-ink md:text-[5.5rem]"
          variants={wordMask}
          initial="hidden"
          animate="visible"
        >
          <span className="inline-block overflow-hidden pb-[0.15em] -mb-[0.15em]">
            <m.span variants={wordRise} className="inline-block">
              Career<span className="text-brand">Radar</span>
            </m.span>
          </span>
        </m.h1>

        <m.p
          className="mx-auto mt-6 max-w-xl text-xl font-semibold text-ink md:text-2xl"
          variants={fadeUpLoad}
          custom={0.5}
          initial="hidden"
          animate="visible"
        >
          Chọn nghề bằng <span className="text-brand">dữ liệu thật</span>, không còn cảm tính.
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
        </m.div>

        <m.p
          className="mt-5 text-sm text-ink-soft"
          variants={fadeUpLoad}
          custom={0.72}
          initial="hidden"
          animate="visible"
        >
          ✓ Dữ liệu từ {fmtInt(META.totalJobs)} tin tuyển dụng thật
        </m.p>
      </div>
    </section>
  );
}
