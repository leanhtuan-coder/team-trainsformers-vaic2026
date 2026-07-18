-- CareerRadar — chuyển Evidence Ledger (Profile) từ file JSON (data/profiles/, mất khi Render
-- redeploy vì filesystem tạm thời) sang Supabase Postgres, để hồ sơ học sinh sống sót qua mọi
-- lần redeploy backend. Schema giữ nguyên "Profile" (profile_id, created_at, evidence[]) —
-- toàn bộ Evidence Ledger lưu dạng JSONB, chỉ backend/src/profile/store.ts thay đổi cách đọc/ghi.
--
-- Bảng này CHỈ được backend (server, dùng service_role key) đọc/ghi — KHÔNG bao giờ lộ ra
-- frontend/anon key (RLS chặn hoàn toàn truy cập công khai; service_role bypass RLS theo thiết kế
-- của Supabase, đúng mô hình "trusted backend"). Frontend chỉ nói chuyện với bảng profile_links
-- (xem 0001_profile_links.sql) và với REST API của backend — không bao giờ đụng bảng này trực tiếp.

create table if not exists public.profiles (
  profile_id text primary key,
  created_at timestamptz not null default now(),
  evidence    jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Không tạo policy nào cho anon/authenticated → mặc định DENY ALL với các key công khai.
-- service_role (dùng ở backend) bỏ qua RLS hoàn toàn, không cần policy riêng.

-- Tự cập nhật updated_at mỗi lần ghi, hữu ích để debug/theo dõi.
create or replace function public.set_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();
