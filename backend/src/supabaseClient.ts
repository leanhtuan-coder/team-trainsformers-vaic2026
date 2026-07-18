// Supabase client PHÍA SERVER — dùng service_role key (bypass RLS hoàn toàn), KHÔNG bao giờ
// gửi key này ra frontend. Chỉ backend mới được cầm service_role key.
// Cấu hình trong backend/.env (KHÔNG commit): SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(url && serviceKey);

let client: SupabaseClient | null = null;

/** Trả về singleton Supabase client (service role), hoặc null nếu chưa cấu hình env. */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
