"use client";

import { m } from "framer-motion";
import { Compass } from "@/components/ui/Compass";
import { REVEAL_VIEWPORT, staggerContainer, fadeUp } from "@/lib/animation";
import { Parallax } from "@/components/ui/motion";

const band = staggerContainer(0.12, 0.1);

export function CtaBand({ onStart }: { onStart: () => void }) {
  return (
    <section aria-labelledby="cta-heading" className="px-6 pb-20">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-deep px-8 py-16 text-center text-white">
        {/* Vòng tròn trang trí — parallax ngược chiều nhau */}
        <Parallax offset={50} className="pointer-events-none absolute -right-20 -top-20 h-64 w-64">
          <div aria-hidden="true" className="h-full w-full rounded-full bg-white/5" />
        </Parallax>
        <Parallax offset={-50} className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64">
          <div aria-hidden="true" className="h-full w-full rounded-full bg-white/5" />
        </Parallax>

        <m.div
          variants={band}
          initial="hidden"
          whileInView="visible"
          viewport={REVEAL_VIEWPORT}
          className="relative"
        >
          <m.div variants={fadeUp} className="mx-auto w-fit">
            {/* La bàn xoay chậm — element riêng để không đè lên hiệu ứng fadeUp kế thừa */}
            <m.div
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            >
              <Compass className="mx-auto h-16 w-16" />
            </m.div>
          </m.div>
          <m.h2 variants={fadeUp} id="cta-heading" className="mt-6 text-3xl font-extrabold md:text-4xl">
            Sẵn sàng tìm hướng đi của bạn?
          </m.h2>
          <m.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-white/85">
            Được xây dựng tại VAIC 2026 — bạn chỉ cần 10 phút để có lộ trình đầu tiên.
          </m.p>
          <m.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <m.button
              type="button"
              onClick={onStart}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-xl bg-accent px-6 py-3.5 font-semibold text-white shadow-lg shadow-black/10 transition-colors hover:bg-accent-dark"
            >
              Làm bài đánh giá miễn phí →
            </m.button>
            <a
              href="#dashboard"
              className="rounded-xl border border-white/50 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
            >
              Xem demo →
            </a>
          </m.div>
          <m.p variants={fadeUp} className="mt-5 text-sm text-white/70">
            Miễn phí cho học sinh · Không cần thẻ tín dụng
          </m.p>
        </m.div>
      </div>
    </section>
  );
}
