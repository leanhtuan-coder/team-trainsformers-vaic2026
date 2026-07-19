import { getSupabaseAdmin } from "../supabaseClient.js";
import type { Profile } from "./schema.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Lưu trữ Evidence Ledger trong Supabase Postgres (bảng "profiles", xem
// supabase/migrations/0002_profiles.sql) — thay cho file JSON cũ (data/profiles/), vốn MẤT SẠCH
// mỗi khi Render redeploy vì filesystem tạm thời. Schema Profile giữ nguyên, chỉ module này đổi.
// Production dùng Supabase. Local dev không có service-role key thì lưu vào data/profiles/
// để luồng đăng nhập/onboarding vẫn chạy độc lập với dịch vụ bên ngoài.

const LOCAL_PROFILE_DIR = fileURLToPath(new URL("../../../data/profiles/", import.meta.url));

function localProfilePath(profileId: string): string {
  return `${LOCAL_PROFILE_DIR}${profileId}.json`;
}

async function saveLocalProfile(profile: Profile): Promise<void> {
  const path = localProfilePath(profile.profile_id);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(profile, null, 2), "utf8");
}

async function loadLocalProfile(profileId: string): Promise<Profile | null> {
  try {
    return JSON.parse(await readFile(localProfilePath(profileId), "utf8")) as Profile;
  } catch (error: any) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function assertValidProfileId(profileId: string): void {
  // profile_id là UUID do server sinh — chặn giá trị lạ trước khi đưa vào query.
  if (!/^[0-9a-f-]{36}$/.test(profileId)) throw new Error("invalid profile_id");
}

export async function saveProfile(profile: Profile): Promise<void> {
  assertValidProfileId(profile.profile_id);
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    await saveLocalProfile(profile);
    return;
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
    return loadLocalProfile(profileId);
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
