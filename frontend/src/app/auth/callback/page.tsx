"use client";

// Đích quay về sau khi đăng nhập Google (Supabase Auth).
// Supabase tự đổi ?code= thành session (detectSessionInUrl). Ở đây ta:
//   1) tra mapping user Google -> profile_id (bảng profile_links)
//   2) nếu chưa có: tái dùng hồ sơ ẩn danh trên máy nếu có, không thì tạo hồ sơ mới ở backend
//   3) lưu mapping + con trỏ Portal, rồi chuyển vào /profile/[id]

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabaseClient";
import { linkSessionToProfile } from "@/lib/linkProfile";
import { getBackendProfile, hasCompletedOnboarding } from "@/lib/profile";
import { LogoMark } from "@/components/ui/Compass";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Đang xác thực với Google…");
  const handledRef = useRef(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      router.replace("/login");
      return;
    }

    const handle = async (session: Session | null) => {
      if (handledRef.current || !session?.user) return;
      handledRef.current = true;

      try {
        setStatus("Đang mở hồ sơ của bạn…");
        const profileId = await linkSessionToProfile(supabase, session.user);
        const profile = await getBackendProfile(profileId);
        router.replace(hasCompletedOnboarding(profile) ? `/profile/${profileId}` : `/onboarding?profileId=${profileId}`);
      } catch (err) {
        console.error("[auth/callback] link profile failed:", err);
        setStatus("Có lỗi khi liên kết hồ sơ. Đang đưa bạn về trang đăng nhập…");
        setTimeout(() => router.replace("/login"), 1800);
      }
    };

    // Session có thể sẵn sàng ngay, hoặc đến qua sự kiện sau khi đổi code.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void handle(session);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void handle(data.session);
    });

    return () => sub.subscription.unsubscribe();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8FAFC] px-6 text-center">
      <LogoMark className="h-14 w-14 animate-pulse" />
      <p className="font-semibold text-[#131B2E]">{status}</p>
      <p className="text-xs text-[#464555]">CareerRadar · Đăng nhập an toàn qua Google</p>
    </main>
  );
}
