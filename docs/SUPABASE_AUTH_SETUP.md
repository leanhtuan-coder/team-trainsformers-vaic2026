# Google Login + Lưu trữ hồ sơ — Supabase — CareerRadar

Auth: Supabase lo **đăng nhập Google/email** + bảng mapping `profile_links` (user → `profile_id`).
Không cần JWT/bcrypt tự viết.

Lưu trữ hồ sơ (Evidence Ledger): **đã chuyển sang Supabase Postgres** (bảng `profiles`, xem
`supabase/migrations/0002_profiles.sql`) — trước đây là file JSON (`data/profiles/`), nhưng
Render dùng filesystem tạm thời nên hồ sơ **mất sạch mỗi lần redeploy**. Bảng `profiles` chỉ
backend (service_role key) đọc/ghi được — RLS chặn hoàn toàn anon/frontend truy cập trực tiếp.

## Luồng

1. User bấm "Tài khoản Google" (`GoogleLoginButton`) → `supabase.auth.signInWithOAuth({ provider: "google" })`.
2. Redirect sang Google → Google trả về Supabase → Supabase redirect về `/auth/callback`.
3. `/auth/callback` (client) tra `profile_links`:
   - Có mapping → mở lại đúng hồ sơ cũ.
   - Chưa có → tái dùng hồ sơ ẩn danh trên máy nếu có, không thì `POST /api/profile` tạo mới; rồi lưu mapping.
4. Lưu con trỏ Portal (tên lấy từ Google) → chuyển vào `/profile/[id]`.

## Cài đặt (một lần)

### 1. Tạo Google OAuth Client
- Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** → *Web application*.
- **Authorized redirect URI**: dán URL callback của Supabase:
  `https://<project-ref>.supabase.co/auth/v1/callback`
- Lưu lại **Client ID** và **Client Secret**.

### 2. Bật Google trong Supabase
- Supabase Dashboard → **Authentication → Providers → Google** → bật, dán Client ID + Secret → Save.
- **Authentication → URL Configuration**: thêm `http://localhost:3000/auth/callback` (và domain production khi deploy) vào *Redirect URLs*.

### 3. Tạo bảng mapping + bảng lưu hồ sơ
- Dashboard → **SQL Editor** → chạy lần lượt:
  1. `supabase/migrations/0001_profile_links.sql`
  2. `supabase/migrations/0002_profiles.sql` (bảng lưu Evidence Ledger — **bắt buộc**, backend không
     chạy được nếu thiếu bảng này + env ở bước 4b)

### 4. Điền env

**4a. Frontend** — copy `frontend/.env.example` → `frontend/.env.local`, điền:
- `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Dashboard → Project Settings → API).
- Restart `next dev` để nạp env.

**4b. Backend** — thêm vào `backend/.env` (KHÔNG commit):
- `SUPABASE_URL` (cùng URL project ở trên).
- `SUPABASE_SERVICE_ROLE_KEY` — Dashboard → Project Settings → API → mục **service_role** (secret,
  KHÁC với anon key). Key này bypass mọi RLS — **tuyệt đối không** đưa vào biến `NEXT_PUBLIC_*` hay
  bất kỳ file frontend nào.
- Restart `npm run dev` ở backend để nạp env.

### 5. Bật đăng nhập email/mật khẩu (đã có sẵn trong code)
- Supabase Dashboard → **Authentication → Providers → Email** → bật.
- **Confirm email**: nếu BẬT, người đăng ký phải xác nhận qua email trước khi đăng nhập (trang đăng ký
  sẽ hiện thông báo "Đã gửi email xác nhận…"). Nếu TẮT, đăng ký xong vào Portal luôn. Hackathon nên TẮT
  cho nhanh; production nên BẬT.

## Kiểm thử
- **Backend chưa cấu hình Supabase**: mọi route `/profile/*` trả `500 {error:"internal_error",
  message:"supabase_not_configured..."}` — rõ ràng, không crash server. Đây là hành vi ĐÚNG khi
  thiếu bước 4b, không phải bug.
- **Google**: `/login` → "Tài khoản Google" → chọn tài khoản → quay về `/profile/[id]`. Đăng nhập lại
  cùng tài khoản → ra **đúng hồ sơ cũ** (không tạo hồ sơ trắng).
- **Email/mật khẩu**: `/register` tạo tài khoản → vào Portal (hoặc nhận email xác nhận nếu bật Confirm);
  `/login` bằng đúng email/mật khẩu → vào lại đúng hồ sơ.
- **Đăng xuất**: trong Portal, nút đăng xuất ở khối user góc dưới sidebar → `signOut()` + xoá con trỏ
  Portal → về trang chủ.
- **Hồ sơ sống sót qua redeploy Render**: tạo hồ sơ → redeploy backend trên Render → đăng nhập lại
  → phải ra đúng hồ sơ cũ (trước đây sẽ 404 "profile_not_found" vì file JSON bị xoá).

## Đã triển khai
- Google login qua Supabase (`signInWithOAuth`).
- Email/mật khẩu thật (`signInWithPassword` ở `/login`, `signUp` ở `/register`) — thay hoàn toàn bản giả cũ.
- Nút đăng xuất ở Portal (`signOut()` + `clearPortalRef()`).
- Map identity → `profile_id` qua bảng `profile_links` (dùng chung cho cả 3 luồng, xem `lib/linkProfile.ts`).
- **Tự phục hồi khi mapping cũ trỏ tới hồ sơ đã mất** (`linkSessionToProfile` kiểm tra tồn tại trước khi
  tin dùng, tự tạo hồ sơ mới nếu không còn — xem `frontend/src/lib/linkProfile.ts`).
- **Evidence Ledger lưu ở Supabase Postgres** (bảng `profiles`, service_role only) — không còn phụ
  thuộc filesystem tạm thời của Render (xem `backend/src/profile/store.ts`).

## Còn lại (tuỳ chọn)
- Trang `/login` chưa có "Quên mật khẩu" (`supabase.auth.resetPasswordForEmail`).
- Chưa migrate dữ liệu hồ sơ cũ (nếu có) từ `data/profiles/` sang bảng `profiles` — không cần thiết vì
  dữ liệu trên Render production đã mất sẵn (đó chính là bug đang sửa); chỉ ảnh hưởng hồ sơ test local.
