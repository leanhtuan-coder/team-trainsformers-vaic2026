# Thiết kế: Hệ thống animation cho Landing Page

> Ngày: 2026-07-18 · Repo: `frontend` (CareerRadar — La Bàn Nghề) · Branch: `dev`
> Trạng thái: Đã duyệt qua brainstorm (Thắng) · Bối cảnh: 48h VAIC 2026, demo trước ban giám khảo

## 1. Bối cảnh & mục tiêu

Landing page (`src/app/page.tsx`) hiện chỉ có animation CSS nhẹ (`fade-up`, `animate-floaty`, `grow-bar`). Mục tiêu: nâng cấp lên mức **trình diễn** — scroll-reveal có nhịp cho mọi section, parallax, stagger, số đếm tăng dần — để trang "sống động" khi demo, nhưng vẫn giữ hiệu năng và khả năng đọc lướt nhanh.

## 2. Quyết định đã chốt

| Quyết định | Lựa chọn |
|---|---|
| Mức độ animation | Trình diễn (parallax, stagger, scroll-driven) |
| Thư viện | `framer-motion@^11` — **nới ràng buộc** "không thêm dependency" của WEBSITE_SPEC.md, đã được duyệt 18/07 |
| Phạm vi | Toàn bộ landing page. Portal (`/profile/[id]`), auth, ChatPanel **không đụng** |
| Hướng triển khai | Phương án A — hệ thống primitives dùng chung |

## 3. Kiến trúc

### 3.1 Nền tảng — `src/lib/animation.ts` (file mới)

- Easing token: `EASE_OUT_EXPO = [0.16, 1, 0.3, 1]` (khớp cubic-bezier CSS hiện có), spring config dùng chung cho badge/sao pop.
- Duration token: `fast 0.35s · normal 0.6s · slow 0.9s`.
- Variants dùng chung: `fadeUp` (y 24→0 + opacity), `fadeIn`, `scaleIn` (0.92→1), `slideLeft`, `slideRight`, `staggerContainer(stagger, delayChildren)` + `staggerItem`.
- Viewport mặc định cho reveal: `{ once: true, margin: "0px 0px -80px 0px" }` — hiệu ứng nổ khi phần tử vào hẳn khung nhìn ~80px; giá trị margin tinh chỉnh bằng mắt ở bước verify.

### 3.2 Primitives — `src/components/ui/motion.tsx` (file mới, `"use client"`)

| Component | API chính | Vai trò |
|---|---|---|
| `MotionProvider` | `children` | Bọc landing: `LazyMotion features={domAnimation} strict` + `MotionConfig reducedMotion="user"` |
| `Reveal` | `variant?, delay?, as?, className?` | Scroll-reveal 1 phần tử, chạy 1 lần. `as` đa hình (`div`/`section`/`article`…) để giữ HTML ngữ nghĩa |
| `StaggerGroup` / `StaggerItem` | `stagger?, delay?, as?` | Nhóm con hiện lần lượt (card grids) — dùng variant propagation của Framer, không cần context tay |
| `Parallax` | `offset?` (px), `className?` | Dịch chuyển `y` theo scroll (`useScroll` + `useTransform`) — chỉ translate dọc |
| `CountUp` | `to, format?, suffix?, duration?` | Số đếm 0→target khi vào view (1 lần), format mặc định `fmtInt` (vi-VN), hỗ trợ hậu tố `%` |
| `ScrollProgress` | — | Thanh 2–3px gradient brand→accent, `scaleX` theo `scrollYProgress`, origin trái, gắn mép dưới Navbar |

### 3.3 Bundle

Chỉ import `m` + `LazyMotion` (`domAnimation`), **strict mode** để chặn lọt import `motion` đầy đủ → tăng ~21kb gzip, giữ budget landing <150kb.

## 4. Biên đạo từng section

| Section | Hiệu ứng |
|---|---|
| **Navbar** | Trượt xuống nhẹ + fade khi load (~0.5s); chứa `ScrollProgress` ở mép dưới |
| **Hero** | Entrance có nhịp khi load (không chờ scroll): badge → **H1 hiện từng chữ** (word mask rise, giữ nguyên copy + span teal "dữ liệu thật") → mô tả → hàng CTA → dòng tin cậy. **Tổng chuỗi ≤ 0.9s** (LCP). Thẻ glass: pop vào sau text rồi giữ loop float CSS, thêm `Parallax` trôi lệch tốc độ khi cuộn. Blob nền trôi chậm |
| **Dashboard preview** | Tiêu đề `Reveal`, khung chart `Reveal` scale-in. **Không sửa nội bộ `MarketCharts`** (dùng chung Portal) |
| **TrustStat** | Dải số tối scale-in; 4 ô stagger; số dùng `CountUp` (12.480 · 63 · 34 · 92%) |
| **Problem** | `SectionHead` reveal; 3 card `StaggerGroup` fade-up; `whileHover y: -6` |
| **HowItWorks** | 3 bước stagger trái→phải, icon pop (scale 0.8→1); **đường kẻ nối tự vẽ** — đổi border-dashed div sang phần tử `scaleX 0→1` origin trái khi vào view |
| **Features** | Ô lớn `slideLeft`, cột phải `slideRight` + stagger; badge 89% **spring pop**, chip kỹ năng pop lần lượt |
| **Testimonial** | Card scale-in; **5 sao pop từng cái** (spring, stagger ~0.08s) |
| **Audience** | 3 card stagger; card "Phổ biến" (highlighted) delay nhấn mạnh; hover lift |
| **FAQ** | Item stagger fade-up; giữ chevron xoay CSS |
| **CtaBand** | 2 vòng tròn trang trí `Parallax` ngược chiều; nội dung stagger; nút CTA `whileHover scale 1.03 / whileTap 0.97` |
| **Footer** | Fade-in đơn giản |

Nút CTA chính trên landing (Hero, CtaBand, Audience) chuyển thành `m.button`/`m.a` với hover/tap micro-interaction; nút phụ giữ transition CSS.

## 5. Guardrails hiệu năng & accessibility

1. Chỉ animate **transform + opacity** — không layout props, không filter.
2. Mọi reveal `once: true` — không re-trigger khi cuộn ngược.
3. `MotionConfig reducedMotion="user"` + media query CSS sẵn có → người bật reduced-motion thấy đủ nội dung, không mất thông tin.
4. Section có parallax phải nằm trong container `overflow-hidden` (Hero, CtaBand đã có) — không tràn ngang.
5. SSR/hydration: Framer render `opacity: 0` vào HTML đầu; trang vốn là client component nên chấp nhận được cho demo. Hero entrance ngắn để giảm cảm giác chờ.
6. File nào dùng trực tiếp Framer thì thêm `"use client"` tường minh (TrustStat, HowItWorks, Faq, Features, Testimonial, Footer hiện chưa có directive).

## 6. File thay đổi

- **Mới**: `src/lib/animation.ts` · `src/components/ui/motion.tsx`
- **Sửa**: `package.json` (+`framer-motion@^11`) · `src/app/page.tsx` (bọc `MotionProvider`, reveal cho section dashboard preview) · 11 file `src/components/landing/*` (Navbar, Hero, TrustStat, Problem, HowItWorks, Features, Testimonial, Audience, Faq, CtaBand, Footer)
- **Không đụng**: `MarketCharts` nội bộ · `ChatPanel` · `/profile/[id]` · `/login` `/register` `/auth/callback` · `globals.css` giữ nguyên keyframes cũ (Portal còn dùng)

## 7. Kiểm thử & verify

1. `npm run typecheck` + `npm run build` sạch (gate bắt buộc của WEBSITE_SPEC).
2. Duyệt browser thật ≥1280px: cuộn hết trang — mỗi section trigger đúng 1 lần, không jank, không tràn ngang.
3. DevTools emulate `prefers-reduced-motion: reduce` — nội dung hiển thị đầy đủ.
4. Soát nhanh Portal (`/profile/[id]`) + ChatPanel vẫn hoạt động như cũ (không regression từ CSS/`page.tsx`).

## 8. Non-goals

- Không scrollytelling/pin section.
- Không animate chiều cao FAQ accordion (đòi đập cấu trúc `details/summary` — rủi ro không đáng trong hackathon).
- Không tinh chỉnh choreography riêng cho mobile (desktop-first theo spec, chỉ cần không vỡ).
- Không sửa nội bộ MarketCharts / Portal / auth.

## 9. Ghi chú

- Nhớ ghi phiên này vào `AI_COLLABORATION_LOG.md` ở **repo root** (`team-trainsformers-vaic2026/AI_COLLABORATION_LOG.md`) — yêu cầu bắt buộc của BTC.
