import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Profile } from "./schema.js";

// Lưu trữ dạng file JSON cho demo 48h — đủ dùng, không cần dựng DB sớm.
// data/profiles/ nằm trong .gitignore (dữ liệu cá nhân học sinh, không commit).
// Khi chuyển Supabase (kế hoạch gốc), chỉ cần thay module này, schema giữ nguyên.

const PROFILES_DIR = path.resolve(import.meta.dirname, "../../../data/profiles");

function profilePath(profileId: string): string {
  // profile_id là UUID do server sinh — chặn path traversal từ id lạ.
  if (!/^[0-9a-f-]{36}$/.test(profileId)) throw new Error("invalid profile_id");
  return path.join(PROFILES_DIR, `${profileId}.json`);
}

export async function saveProfile(profile: Profile): Promise<void> {
  await mkdir(PROFILES_DIR, { recursive: true });
  await writeFile(profilePath(profile.profile_id), JSON.stringify(profile, null, 2));
}

export async function loadProfile(profileId: string): Promise<Profile | null> {
  try {
    const raw = await readFile(profilePath(profileId), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
