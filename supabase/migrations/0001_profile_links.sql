-- CareerRadar — bảng mapping Google user (Supabase Auth) -> profile_id ở backend Express.
-- Chạy trong Supabase Dashboard → SQL Editor. RLS đảm bảo mỗi user chỉ thấy/ghi dòng của chính mình.

create table if not exists public.profile_links (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  profile_id text not null,
  created_at timestamptz not null default now()
);

alter table public.profile_links enable row level security;

-- Đọc dòng của chính mình
drop policy if exists "profile_links_select_own" on public.profile_links;
create policy "profile_links_select_own" on public.profile_links
  for select using (auth.uid() = user_id);

-- Thêm dòng của chính mình
drop policy if exists "profile_links_insert_own" on public.profile_links;
create policy "profile_links_insert_own" on public.profile_links
  for insert with check (auth.uid() = user_id);

-- Cập nhật dòng của chính mình (cho upsert onConflict=user_id)
drop policy if exists "profile_links_update_own" on public.profile_links;
create policy "profile_links_update_own" on public.profile_links
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
