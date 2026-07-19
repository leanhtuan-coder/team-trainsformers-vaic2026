// Map một phiên đăng nhập Supabase (Google hoặc email/mật khẩu) sang hồ sơ CareerRadar.
// Trả về profile_id và lưu con trỏ Portal vào localStorage. Dùng chung cho:
//   - /auth/callback (Google OAuth)
//   - /login (signInWithPassword)
//   - /register (signUp khi email confirmation tắt)

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { loadPortalRef, savePortalRef } from "@/lib/profile";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function backendProfileExists(profileId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/profile/${profileId}`);
    return res.ok;
  } catch {
    // Lỗi mạng: không kết luận là "không tồn tại" — tránh tạo hồ sơ trùng vô ích khi chỉ là mất mạng tạm thời.
    return true;
  }
}

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

  // Backend Render dùng filesystem tạm thời — hồ sơ có thể đã mất sau redeploy dù mapping Supabase
  // vẫn còn. Xác minh trước khi tin cậy, không thì mọi lần đăng nhập sẽ báo "profile_not_found".
  if (profileId && !(await backendProfileExists(profileId))) {
    profileId = undefined;
  }

  // 2. Chưa có (hoặc vừa phát hiện mapping cũ đã mất) → tái dùng hồ sơ ẩn danh trên máy nếu còn,
  //    hoặc tạo mới ở backend.
  if (!profileId) {
    const existing = loadPortalRef();
    if (existing?.profile_id && (await backendProfileExists(existing.profile_id))) {
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

/** Dịch mã lỗi thô (backend/network) sang thông báo tiếng Việt thân thiện — tránh hiện thẳng
 *  chuỗi như "profile_not_found" hay "api_error_500" ra màn hình người dùng. */
export function friendlyProfileError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/profile_not_found/.test(msg)) {
    return "Không tìm thấy hồ sơ của bạn trên hệ thống. Vui lòng thử đăng nhập lại.";
  }
  if (/create_profile_failed|api_error_5\d\d/.test(msg)) {
    return "Máy chủ đang khởi động lại, việc này có thể mất khoảng 30-60 giây. Vui lòng thử lại sau ít phút.";
  }
  if (/Failed to fetch|NetworkError|api_error_0/.test(msg)) {
    return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  }
  return msg || "Đã xảy ra lỗi. Vui lòng thử lại.";
}
