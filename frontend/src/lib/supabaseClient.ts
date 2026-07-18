// Supabase browser client — chỉ dùng cho Auth (Google login) + bảng mapping profile_links.
// Dữ liệu hồ sơ thật vẫn nằm ở backend Express (data/profiles/). Xem docs/SUPABASE_AUTH_SETUP.md.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True khi đã điền NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY trong .env.local */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Trả về singleton Supabase client, hoặc null nếu chưa cấu hình env. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // tự đổi ?code= thành session ở /auth/callback
        flowType: "pkce",
      },
    });
  }
  return client;
}
