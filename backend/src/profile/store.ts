import { getSupabaseAdmin, isSupabaseConfigured } from "../supabaseClient.js";
import type { Profile } from "./schema.js";

// Lưu trữ Evidence Ledger trong Supabase Postgres (bảng "profiles", xem
// supabase/migrations/0002_profiles.sql) — thay cho file JSON cũ (data/profiles/), vốn MẤT SẠCH
// mỗi khi Render redeploy vì filesystem tạm thời. Schema Profile giữ nguyên, chỉ module này đổi.
// Không có fallback file-local: một nguồn sự thật duy nhất, tránh lệch dữ liệu giữa 2 nơi lưu.

function assertValidProfileId(profileId: string): void {
  // profile_id là UUID do server sinh — chặn giá trị lạ trước khi đưa vào query.
  if (!/^[0-9a-f-]{36}$/.test(profileId)) throw new Error("invalid profile_id");
}

export async function saveProfile(profile: Profile): Promise<void> {
  assertValidProfileId(profile.profile_id);
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error(
      "supabase_not_configured: cần SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY trong backend/.env — xem docs/SUPABASE_AUTH_SETUP.md"
    );
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { profile_id: profile.profile_id, created_at: profile.created_at, evidence: profile.evidence },
      { onConflict: "profile_id" }
    );
  if (error) {
    console.error("[store] saveProfile lỗi Supabase:", error);
    throw new Error(`save_profile_failed: ${error.message}`);
  }
}

export async function loadProfile(profileId: string): Promise<Profile | null> {
  try {
    assertValidProfileId(profileId);
  } catch {
    return null;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error(
      "supabase_not_configured: cần SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY trong backend/.env — xem docs/SUPABASE_AUTH_SETUP.md"
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("profile_id, created_at, evidence")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.error("[store] loadProfile lỗi Supabase:", error);
    return null;
  }
  if (!data) return null;

  return {
    profile_id: data.profile_id,
    created_at: data.created_at,
    evidence: data.evidence ?? [],
  };
}
