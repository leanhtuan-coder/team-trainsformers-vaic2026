"use client";

// LUỒNG 1 — Landing Page công khai: giới thiệu sản phẩm + dashboard thị trường chung
// (dữ liệu thật từ snapshot). KHÔNG còn chat khảo sát tại chỗ — mọi CTA dẫn sang /login.

import { useRouter } from "next/navigation";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TrustStat } from "@/components/landing/TrustStat";
import { Problem } from "@/components/landing/Problem";
import { Features } from "@/components/landing/Features";
import { Testimonial } from "@/components/landing/Testimonial";
import { Audience } from "@/components/landing/Audience";
import { Faq } from "@/components/landing/Faq";
import { CtaBand } from "@/components/landing/CtaBand";
import { Footer } from "@/components/landing/Footer";
import { MarketCharts } from "@/components/dashboard/MarketCharts";
import { MotionProvider, Reveal } from "@/components/ui/motion";
import { scaleIn } from "@/lib/animation";

export default function HomePage() {
  const router = useRouter();

  // Mọi CTA ("Làm bài đánh giá", "Bắt đầu", "Tìm lộ trình của riêng bạn"...) dẫn sang đăng nhập.
  const handleStart = () => router.push("/login");

  return (
    <MotionProvider>
      <Navbar onStart={handleStart} />
      <main>
        <Hero onStart={handleStart} />

        {/* Dashboard thị trường CHUNG (công khai) — dữ liệu thật từ snapshot */}
        <section
          id="dashboard"
          aria-labelledby="dashboard-heading"
          className="scroll-mt-20 px-4 pb-20 md:px-6"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal className="mb-7 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand">
                Dữ liệu thị trường · Tương tác trực tiếp
              </p>
              <h2 id="dashboard-heading" className="mt-3 text-3xl font-extrabold text-ink md:text-4xl">
                Khám phá thị trường việc làm hôm nay
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-ink-soft">
                Lọc theo vùng và khối ngành — tổng hợp từ tin tuyển dụng thật trên toàn quốc.
              </p>
            </Reveal>
            <Reveal
              variant={scaleIn}
              className="relative rounded-3xl border border-gray-200 bg-white p-4 shadow-2xl shadow-brand-deep/10 md:p-6"
            >
              <MarketCharts onStart={handleStart} showFilter={false} />
            </Reveal>
          </div>
        </section>

        <TrustStat />
        <Problem />
        <Features />
        <Testimonial />
        <Audience onStart={handleStart} />
        <Faq />
        <CtaBand onStart={handleStart} />
      </main>
      <Footer />
    </MotionProvider>
  );
}
