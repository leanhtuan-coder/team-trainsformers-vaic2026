"use client";

import { Compass } from "@/components/ui/Compass";

export function CtaBand({ onStart }: { onStart: () => void }) {
  return (
    <section aria-labelledby="cta-heading" className="px-6 pb-20">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-deep px-8 py-16 text-center text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/5"
        />
        <Compass className="mx-auto h-16 w-16" />
        <h2 id="cta-heading" className="mt-6 text-3xl font-extrabold md:text-4xl">
          Sẵn sàng tìm hướng đi của bạn?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/85">
          Được xây dựng tại VAIC 2026 — bạn chỉ cần 10 phút để có lộ trình đầu tiên.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="rounded-xl bg-accent px-6 py-3.5 font-semibold text-white shadow-lg shadow-black/10 transition-colors hover:bg-accent-dark"
          >
            Làm bài đánh giá miễn phí →
          </button>
          <a
            href="#dashboard"
            className="rounded-xl border border-white/50 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
          >
            Xem demo →
          </a>
        </div>
        <p className="mt-5 text-sm text-white/70">Miễn phí cho học sinh · Không cần thẻ tín dụng</p>
      </div>
    </section>
  );
}
