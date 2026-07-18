// Map một phiên đăng nhập Supabase (Google hoặc email/mật khẩu) sang hồ sơ CareerRadar.
// Trả về profile_id và lưu con trỏ Portal vào localStorage. Dùng chung cho:
//   - /auth/callback (Google OAuth)
//   - /login (signInWithPassword)
//   - /register (signUp khi email confirmation tắt)

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { loadPortalRef, savePortalRef } from "@/lib/profile";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export async function linkSessionToProfile(
  supabase: SupabaseClient,
  user: User,
  opts?: { name?: string; region?: string }
): Promise<string> {
  // 1. Mapping đã tồn tại?
  const { data: link } = await supabase
    .from("profile_links")
    .select("profile_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let profileId = link?.profile_id as string | undefined;

  // 2. Chưa có → tái dùng hồ sơ ẩn danh trên máy, hoặc tạo mới ở backend
  if (!profileId) {
    const existing = loadPortalRef();
    if (existing?.profile_id) {
      profileId = existing.profile_id;
    } else {
      const res = await fetch(`${API_BASE}/profile`, { method: "POST" });
      if (!res.ok) throw new Error("create_profile_failed");
      profileId = (await res.json()).profile_id as string;
    }
    const { error } = await supabase
      .from("profile_links")
      .upsert(
        { user_id: user.id, email: user.email, profile_id: profileId },
        { onConflict: "user_id" }
      );
    if (error) throw error;
  }

  // 3. Lưu con trỏ Portal (ưu tiên tên/vùng truyền vào, rồi tới metadata Google)
  const name =
    opts?.name ||
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "Học sinh";

  savePortalRef({
    profile_id: profileId!,
    name,
    region: opts?.region || loadPortalRef()?.region || "Toàn quốc",
    completedAt: new Date().toISOString(),
  });

  return profileId!;
}
