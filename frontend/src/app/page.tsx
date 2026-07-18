"use client";

// LUỒNG 1 — Landing Page công khai: giới thiệu sản phẩm + dashboard thị trường chung
// (fetch backend thật, mặc định Toàn quốc) + chatbox khảo sát 10 câu quickstart.
// Khảo sát xong KHÔNG mở dashboard tại chỗ — redirect sang Student Portal /profile/[id].

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TrustStat } from "@/components/landing/TrustStat";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Testimonial } from "@/components/landing/Testimonial";
import { Audience } from "@/components/landing/Audience";
import { Faq } from "@/components/landing/Faq";
import { CtaBand } from "@/components/landing/CtaBand";
import { Footer } from "@/components/landing/Footer";
import { MarketCharts } from "@/components/dashboard/MarketCharts";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { MotionProvider, Reveal } from "@/components/ui/motion";
import { scaleIn } from "@/lib/animation";
import { clearPortalRef, loadPortalRef, type PortalRef } from "@/lib/profile";

export default function HomePage() {
  const router = useRouter();
  const [portal, setPortal] = useState<PortalRef | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [retakeCount, setRetakeCount] = useState(0);

  useEffect(() => {
    setPortal(loadPortalRef());
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("start") === "1") {
      setChatOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const openChat = () => setChatOpen(true);

  // Chat hoàn tất: backend đã có hồ sơ + câu trả lời → chuyển hướng sang Portal cá nhân.
  const handleComplete = (profileId: string) => {
    setChatOpen(false);
    router.push(`/profile/${profileId}`);
  };

  const handleRetake = () => {
    clearPortalRef();
    setPortal(null);
    setRetakeCount((c) => c + 1);
  };

  const handleViewPortal = () => {
    if (portal) router.push(`/profile/${portal.profile_id}`);
  };

  return (
    <MotionProvider>
      <Navbar onStart={openChat} />
      <main>
        <Hero onStart={openChat} />

        {/* Dashboard thị trường CHUNG (công khai) — dữ liệu thật từ GET /api/market/snapshot */}
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
              <MarketCharts onStart={openChat} />
            </Reveal>
          </div>
        </section>

        <TrustStat />
        <Problem />
        <HowItWorks />
        <Features />
        <Testimonial />
        <Audience onStart={openChat} />
        <Faq />
        <CtaBand onStart={openChat} />
      </main>
      <Footer />
      <ChatPanel
        key={`${retakeCount}-${portal ? portal.profile_id : "new"}`}
        open={chatOpen}
        portal={portal}
        onClose={() => setChatOpen(false)}
        onComplete={handleComplete}
        onRetake={handleRetake}
        onViewPortal={handleViewPortal}
      />
    </MotionProvider>
  );
}
