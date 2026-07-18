# Google Login qua Supabase Auth — CareerRadar

Hướng A: giữ hồ sơ ở backend file store (`data/profiles/`), Supabase chỉ lo **đăng nhập Google** + bảng
mapping `profile_links` (Google user → `profile_id`). Không cần JWT/bcrypt tự viết.

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

### 3. Tạo bảng mapping
- Dashboard → **SQL Editor** → chạy `supabase/migrations/0001_profile_links.sql`.

### 4. Điền env frontend
- Copy `frontend/.env.example` → `frontend/.env.local`, điền:
  - `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Dashboard → Project Settings → API).
- Restart `next dev` để nạp env.

### 5. Bật đăng nhập email/mật khẩu (đã có sẵn trong code)
- Supabase Dashboard → **Authentication → Providers → Email** → bật.
- **Confirm email**: nếu BẬT, người đăng ký phải xác nhận qua email trước khi đăng nhập (trang đăng ký
  sẽ hiện thông báo "Đã gửi email xác nhận…"). Nếu TẮT, đăng ký xong vào Portal luôn. Hackathon nên TẮT
  cho nhanh; production nên BẬT.

## Kiểm thử
- **Google**: `/login` → "Tài khoản Google" → chọn tài khoản → quay về `/profile/[id]`. Đăng nhập lại
  cùng tài khoản → ra **đúng hồ sơ cũ** (không tạo hồ sơ trắng).
- **Email/mật khẩu**: `/register` tạo tài khoản → vào Portal (hoặc nhận email xác nhận nếu bật Confirm);
  `/login` bằng đúng email/mật khẩu → vào lại đúng hồ sơ.
- **Đăng xuất**: trong Portal, nút đăng xuất ở khối user góc dưới sidebar → `signOut()` + xoá con trỏ
  Portal → về trang chủ.

## Đã triển khai (hướng A)
- Google login qua Supabase (`signInWithOAuth`).
- Email/mật khẩu thật (`signInWithPassword` ở `/login`, `signUp` ở `/register`) — thay hoàn toàn bản giả cũ.
- Nút đăng xuất ở Portal (`signOut()` + `clearPortalRef()`).
- Map identity → `profile_id` qua bảng `profile_links` (dùng chung cho cả 3 luồng, xem `lib/linkProfile.ts`).

## Còn lại (tuỳ chọn)
- Trang `/login` chưa có "Quên mật khẩu" (`supabase.auth.resetPasswordForEmail`).
- Có thể chuyển hẳn hồ sơ sang Supabase Postgres (hướng B) nếu muốn RLS bảo vệ toàn bộ dữ liệu học sinh.
