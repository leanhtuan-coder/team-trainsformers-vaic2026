# Career Compass — WEBSITE SPEC (bản giao cho Claude build)

> **Cách dùng:** mở Claude Code tại thư mục `web/`, yêu cầu: "Đọc WEBSITE_SPEC.md và build đúng theo spec". File này là nguồn sự thật duy nhất về website. Có thể copy thành `CLAUDE.md` để Claude Code tự đọc.

---

## 1. Sản phẩm & bối cảnh

**Career Compass — La Bàn Nghề**: trợ lý AI hướng nghiệp cho học sinh THPT/sinh viên Việt Nam. User làm bài đánh giá qua hội thoại (không phải quiz khô cứng) → nhận định hướng nghề cá nhân hoá **có giải thích, có bằng chứng dữ liệu thị trường, có cả tuyến học nghề**.

Sản phẩm dự thi **VAIC 2026** (hackathon AI-native 48h, 17–19/07, FPT Tower HN) — track Giáo dục & Đào tạo, đội TrainSformers. Rubric chấm cần nhớ khi build: AI-native 20%, thực thi kỹ thuật 15%, deployment 15%, khả thi 15%, startup 15%, phù hợp vấn đề 20%.

**3 giá trị lõi phải toát ra ở mọi màn hình:**
1. **Bám dữ liệu thật** — mọi gợi ý có bằng chứng (chip nguồn).
2. **Giải thích được** — luôn có "vì sao hợp bạn", không hộp đen.
3. **Mở rộng cơ hội** — nhiều hướng, có tuyến nghề, tôn trọng tự quyết ("gợi ý tham khảo").

## 2. Tech stack & trạng thái repo

- **Next.js 14 (App Router) + TypeScript + Tailwind CSS.** Không thêm UI lib nặng; chart vẽ bằng CSS/SVG thuần (không cần chart lib).
- Node 18.17+. Font: **Be Vietnam Pro** (Google Fonts, đã nạp trong layout).
- **Đã có sẵn trong `web/` (KHÔNG tạo lại, chỉ dùng/mở rộng):**
  - `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts` (đã khai báo màu brand/accent/ink), `.gitignore`
  - `src/app/globals.css` (có class `.glass`, `.thin-scroll`), `src/app/layout.tsx` (font + metadata)
  - `src/lib/demoData.ts` — **bộ số demo nhất quán toàn site** (META, TOP_SKILLS, SALARY_BY_CLUSTER, HOT_LOCAL, REGION_DEMAND, REGIONS)
  - `src/lib/profile.ts` — schema UserProfile + CareerRec + load/save/clear localStorage (key `cc_profile_v1`)
  - `src/lib/interview.ts` — STEPS (5 bước phỏng vấn có quick-reply, multi-select) + `recommend()` rule-based trả về 2–3 CareerRec
- **Cần build:** `src/app/page.tsx` (landing), `src/app/app/page.tsx` (app 3 tab) + components.
- Lệnh kiểm tra bắt buộc trước khi xong: `npm install && npm run typecheck && npm run build` — phải pass sạch.

## 3. Design system

- Màu (nhận diện VEX — đã có trong tailwind.config):
  - `brand` #007C76 (teal chủ đạo — sidebar, tab active, heading nhấn, nút phụ), `brand-dark` #005C6D (hover), `brand-deep` #0A3F44 (nền tối/footer), `brand-light` #E0F0EE (nền highlight), `brand-mist` #F3F8F7 (nền trang).
  - `accent` #3DAE5A (xanh lá — CTA chính, % phù hợp, tín hiệu tăng), `accent-dark` #2E9149.
  - `ink` #10312E (chữ chính), `ink-soft` #5B6B69 (chữ phụ).
  - Data-viz thêm: hổ phách #E8A13A, xám xanh #64748B (chỉ dùng cho chart).
- Phong cách: clean, nhiều khoảng trắng, bo góc 12–16px, border mảnh #E5E7EB, shadow nhẹ. Glassmorphism ở hero (class `.glass` có sẵn). Toàn bộ chữ **tiếng Việt**. Tương phản đủ chiếu máy chiếu.
- Trạng thái đủ: hover, active, loading (skeleton), empty.

## 4. Routes

| Route | Nội dung |
|---|---|
| `/` | Landing page (mục 5) |
| `/app` | Web app: sidebar trái cố định + 3 tab (mục 6). Client component, state tab bằng useState; profile bằng localStorage |

Mọi CTA "Bắt đầu miễn phí / Làm bài đánh giá / Thử ngay" trên landing → link `/app` (tab Trợ lý AI nếu chưa có profile).

## 5. Landing page (`/`) — theo thiết kế Figma đã duyệt

Thứ tự section (đã gồm các fix sau review — TUÂN THỦ NGHIÊM):

1. **Navbar sticky** nền trắng mờ (backdrop-blur): logo tròn teal + "Career Compass"; menu: Tổng quan, Tính năng, Dữ liệu thị trường, Về chúng tôi (anchor scroll); nút teal "Bắt đầu miễn phí →".
2. **Hero 2 cột.** Trái: chip nhỏ "✦ Định hướng nghề bằng dữ liệu thật"; H1 lớn: **"Chọn nghề bằng dữ liệu thật, không còn cảm tính"** ("dữ liệu thật" tô teal); mô tả: "La Bàn Nghề phân tích hồ sơ năng lực của bạn và đối chiếu với 12.480 tin tuyển dụng thật để đưa ra lộ trình nghề cụ thể — có giải thích, có tuyến học."; 2 nút: "Làm bài đánh giá →" (accent) + "Xem cách hoạt động" (outline); dòng tin cậy "✓ Miễn phí cho học sinh · Dữ liệu từ 12.480 tin tuyển dụng thật". Phải: **la bàn minh hoạ** (SVG/CSS: vòng tròn gradient teal, kim chỉ, chữ N-E-S-W) + 4 thẻ `.glass` nổi (animation floaty): "Phân tích Dữ liệu — 92% phù hợp với bạn", "Lương khởi điểm 18.000.000đ", "Tiếng Anh 50% · SQL đang tăng", "● Nhu cầu tăng +41%".
3. **Dải tin cậy:** dòng chữ nhỏ uppercase **"ĐƯỢC XÂY DỰNG TẠI VAIC 2026 · DỮ LIỆU TỔNG HỢP TỪ TIN TUYỂN DỤNG CÔNG KHAI"**. **KHÔNG dùng logo thương hiệu nào** (không Topcv/Vietnamworks/ITviec/Bộ LĐTBXH — rủi ro pháp lý/uy tín).
4. **Stat bar tối** (nền gradient brand-dark→brand-deep, bo góc, nổi): 12.480 Tin tuyển dụng · 63 Nhóm nghề · 34 Tỉnh thành · 92% Độ phù hợp trung bình.
5. **Vấn đề** (nền brand-light nhạt). Kicker "VẤN ĐỀ"; H2 "Chọn nghề theo cảm tính — cái giá quá đắt"; 3 card icon: "Học xong thất nghiệp" / "Thừa thầy thiếu thợ" / "Không ai kết nối" (copy như Figma).
6. **Cách hoạt động.** Kicker "CÁCH HOẠT ĐỘNG"; H2 "3 bước đến lộ trình của bạn"; stepper ngang 3 bước có số 01/02/03 + icon: Trò chuyện với AI → Đối chiếu thị trường (12.480 tin) → Nhận lộ trình (có giải thích + tuyến học đại học/cao đẳng/nghề).
7. **Tính năng (bento grid).** Kicker "TÍNH NĂNG"; H2 "Khác biệt ở điều gì?". Ô lớn trái: "Bám dữ liệu thật" + mini job-card minh hoạ ("Kỹ sư Phần mềm · 22.000.000đ – 45.000.000đ/tháng · chips Java React SQL Docker · 89%") — **không để ô tròn xám trống**. 2 ô phải: "Giải thích được", "Mở rộng cơ hội".
8. **Xem trước sản phẩm.** Trái: mockup khung trình duyệt (URL `labannghe.vn/dashboard`) chứa mini-dashboard vẽ CSS (4 KPI nhỏ + bar chart Tiếng Anh 50/Giao tiếp 40/Excel 30 + panel "Kỹ năng nóng: Hà Nội +41%, TP.HCM +38%, BD +34%"), nghiêng nhẹ. Phải: kicker "XEM TRƯỚC SẢN PHẨM"; H2 "Dashboard đầy đủ dữ liệu, dễ hiểu với mọi học sinh"; 3 bullet (Xu thế nghề theo vùng thật / Lý do cụ thể không hộp đen / Lộ trình học từng bước); nút "Thử ngay miễn phí →".
9. **Dữ liệu thị trường.** Kicker "DỮ LIỆU THỊ TRƯỜNG"; H2 "Thị trường đang cần gì?". Trái: card bar chart ngang "Kỹ năng được cầu cao nhất" (Tiếng Anh 50%, Giao tiếp 40%, Excel 30%, Phân tích DL 26%, SQL 20% — từ `TOP_SKILLS`). Phải: card "📍 Kỹ năng nóng cục bộ" (từ `HOT_LOCAL`: Hà Nội cần Phân tích dữ liệu +41% 22.000.000đ; TP.HCM cần Digital Marketing +38% 16.000.000đ; Bình Dương cần Vận hành CNC +34% 14.000.000đ) + nút outline "Khám phá dashboard →" (link `/app`).
10. **Testimonial.** Kicker "HỌC SINH NÓI GÌ"; card lớn: 5 sao + quote ("Nhà em không khá giả, La Bàn Nghề chỉ cho em đường ngắn mà vẫn thu nhập ổn định — kèm lý do rõ ràng để em thuyết phục bố mẹ...") + avatar chữ M + "Nguyễn Thanh Minh — Học sinh lớp 12". **Bắt buộc thêm nhãn nhỏ mờ "Kịch bản minh hoạ"** (chưa có user thật — không fake review).
11. **Đối tượng.** Kicker **"ĐỐI TƯỢNG SỬ DỤNG"** (KHÔNG dùng "DÀNH CHO AI" — gây hiểu nhầm); H2 "Phù hợp với mọi đối tượng"; 3 card: Học sinh & Sinh viên (badge "Miễn phí", 3 check, nút accent "Bắt đầu miễn phí") / Nhà trường & Trung tâm (badge "Phổ biến", card nổi bật viền teal, nút teal "Liên hệ tư vấn") / Doanh nghiệp (nút outline "Liên hệ hợp tác"). Copy như Figma.
12. **FAQ.** Kicker "CÂU HỎI THƯỜNG GẶP"; H2 "Bạn có thể thắc mắc"; 4 accordion (details/summary): "Dữ liệu lấy từ đâu?" → "Tổng hợp và làm sạch từ 12.480+ tin tuyển dụng công khai, demo chạy trên snapshot; pipeline có thể cập nhật theo quý." (KHÔNG kể tên nền tảng như đối tác) / "AI có thay thầy cô hướng nghiệp không?" → không, là công cụ hỗ trợ, quyết định thuộc về học sinh và gia đình / "Có gợi ý cả học nghề không?" → có, luôn kèm tuyến cao đẳng/nghề / "Thông tin của em có riêng tư không?" → lưu cục bộ trên máy trong bản demo.
13. **CTA band** (nền gradient teal, chữ trắng): icon la bàn; H2 "Sẵn sàng tìm hướng đi của bạn?"; mô tả **trung thực**: "Được xây dựng tại VAIC 2026 — bạn chỉ cần 10 phút để có lộ trình đầu tiên." (**KHÔNG viết "hàng nghìn học sinh đã dùng"** — chưa có user); nút accent "Làm bài đánh giá miễn phí →" + outline trắng "Xem demo →"; dòng nhỏ "Miễn phí cho học sinh · Không cần thẻ tín dụng".
14. **Footer** (nền brand-deep, chữ trắng): logo + mô tả 1 dòng; 3 cột link (Sản phẩm: Tính năng/Dữ liệu thị trường/Lộ trình học/Trợ lý AI · Công ty: Về chúng tôi/Blog/Tuyển dụng/VAIC 2026 · Pháp lý: Điều khoản/Bảo mật/Cookie); dòng cuối "© 2026 · TrainSformers × VEX Technology Solutions" + "Được xây dựng tại VAIC 2026 · Hà Nội, Việt Nam".

**Quy tắc số liệu:** chỉ dùng MỘT bộ số từ `demoData.ts` xuyên suốt (12.480 tin, +41% Hà Nội, 22tr Phân tích DL...). Không bịa số mới lệch nhau giữa các section.

## 6. Web app (`/app`) — 3 tab

**Layout:** sidebar trái cố định 240px (nền trắng, border phải): logo + "Career Compass" (sub "La Bàn Nghề"); 3 nav item dọc cao 44px (icon + chữ; active: nền brand-light + chữ teal + thanh bo trái; hover: xám nhạt): **Tổng quan / Lộ trình của tôi / Trợ lý AI**; dưới cùng: avatar + tên (từ profile, mặc định "Khách") + menu (Chỉnh sửa thông tin → mở modal; Đăng xuất → clearProfile). Nội dung phải có header tab (H1 + hành động phụ).

### Tab 1 — Tổng quan (Dashboard)
- Bộ lọc: dropdown Vùng (`REGIONS`) — lọc được là điểm cộng, tối thiểu đổi tiêu đề theo vùng chọn.
- 4 KPI card: Nghề đang tăng trưởng ("Phân tích dữ liệu ↑ +41%") / Kỹ năng thiếu hụt nhất ("Tiếng Anh — 50% tin") / Lương trung vị cao nhất ("CNTT — 25.750.000đ") / Số tin đã phân tích ("12.480").
- Card "Kỹ năng cầu cao nhất": bar chart ngang từ `TOP_SKILLS`, hover tooltip (tên, %, nhóm, lương) — tooltip làm bằng CSS group-hover.
- Card "Nhu cầu theo vùng": lưới thẻ từ `REGION_DEMAND` (tên vùng, số tin, top 3 kỹ năng), độ đậm nền theo số tin, hover hiện chi tiết.
- Card "Lương trung vị theo nhóm ngành": bar chart từ `SALARY_BY_CLUSTER`.
- Bảng "Kỹ năng nóng cục bộ" từ `HOT_LOCAL` (Vùng · Kỹ năng · Tăng trưởng · Lương).

### Tab 2 — Lộ trình của tôi
Hai trạng thái theo `loadProfile()`:
- **A. Chưa có profile:** empty state giữa màn: minh hoạ la bàn nhỏ + H2 "Bắt đầu tìm hướng đi của bạn" + mô tả + nút accent lớn "Làm bài đánh giá" (→ chuyển tab Trợ lý AI) + dòng "Chỉ mất khoảng 5 phút · Miễn phí".
- **B. Có profile (mặc định về sau, KHÔNG bao giờ tự hiện lại test):**
  - Header: "Lộ trình của tôi" + **nút nhỏ ghost góc phải "Làm lại đánh giá"** (confirm → clearProfile → chuyển tab Trợ lý AI).
  - Card hồ sơ tóm tắt: 1 dòng thiên hướng ghép từ profile (vd "Thích khám phá dữ liệu · Mạnh Toán, Tiếng Anh · Ưu tiên đường ngắn, thu nhập") + nút bút chì "Chỉnh sửa thông tin" → **modal chỉnh sửa**: Họ tên, Khu vực (REGIONS), Trình độ, Môn mạnh (chip multi), Ưu tiên (chip multi), Lộ trình học (radio) — Lưu (saveProfile) / Huỷ.
  - "Định hướng gợi ý cho bạn": render `profile.recommendations` — mỗi card: tên nghề + badge % (accent) + câu "Vì sao hợp bạn" (in nghiêng) + chips kỹ năng cần học + dòng lộ trình học + chips bằng chứng (nền brand-light) + nhãn mờ "Gợi ý tham khảo".
  - Timeline stepper ngang 4 bước: Học nền tảng → Lấy chứng chỉ → Thực tập → Việc đầu tiên (mốc thời gian ước lượng theo studyHorizon).
  - Card "Mở rộng cơ hội" (nền nhạt): "Bạn có thể đi làm sớm rồi liên thông đại học sau — nhiều công ty hỗ trợ học phí. Hướng đi không bao giờ đóng lại."

### Tab 3 — Trợ lý AI (chat)
- Khung chat: bubble AI trái (trắng viền nhạt), user phải (nền teal chữ trắng); auto-scroll; indicator "đang phân tích..." (3 chấm) giữa các lượt (delay 600–900ms cho giống thật).
- Chạy luồng `STEPS` từ `interview.ts`: AI chào ("Chào bạn 👋 Mình là La Bàn Nghề...") rồi hỏi từng bước; câu có options → render **quick-reply buttons** (multi=true: chọn nhiều + nút "Xong"); vẫn cho gõ tự do (ô nhập + nút Gửi) — nếu gõ tự do ở câu options thì map câu trả lời vào option gần nhất hoặc lưu nguyên văn.
- Trước khi hỏi xong: hỏi tên + khu vực (2 câu đầu, freeText; khu vực có quick-reply từ REGIONS).
- Kết thúc: gọi `recommend()` → `saveProfile()` → AI tổng kết ngắn (nêu 2–3 nghề + 1 câu lý do mỗi nghề, giọng ấm, trung thực — kèm câu "đây là gợi ý tham khảo, quyết định vẫn là của bạn") + nút "Xem lộ trình của tôi →" (chuyển tab 2, giờ ở trạng thái B).
- Panel phải (ẩn được, ẩn mặc định trên màn hẹp): "Hồ sơ đang dựng" — hiện dần các field đã thu thập (thiên hướng, môn, ưu tiên...) để chứng minh AI "hiểu tới đâu".
- **Ghi chú kiến trúc (comment trong code):** luồng scripted này là demo offline; backend AI thật thay thế qua cùng interface — giữ tách biệt UI ↔ logic phỏng vấn.

## 7. Ràng buộc quan trọng (không được vi phạm)

1. Toàn bộ UI **tiếng Việt**; desktop-first (không cần mobile hoàn hảo, nhưng không vỡ ở 1280px).
2. **Không logo thương hiệu bên thứ ba**, không ngụ ý đối tác/chứng thực chính phủ.
3. **Copy trung thực**: không "hàng nghìn người dùng", testimonial gắn "Kịch bản minh hoạ", FAQ nói rõ demo chạy trên snapshot.
4. **Một bộ số duy nhất** từ `demoData.ts` — không bịa số mới.
5. Không hardcode API key; không thêm dependency ngoài danh sách package.json hiện có.
6. `npm run typecheck` và `npm run build` phải pass trước khi kết thúc.
7. Mỗi phiên code bằng AI phải ghi vào `submission/AI_COLLABORATION_LOG.md` (yêu cầu bắt buộc của BTC).

## 8. Tương lai (KHÔNG build bây giờ — chỉ để biết hướng)

- Backend AI thật (Đức Minh/Tuấn): thay `interview.ts` scripted bằng LLM qua SSE — contract sự kiện: `token / context / tool_call / tool_result / data / sources / done / error` (chi tiết trong repo chuẩn bị, file API_CONTRACT.md của frontend starter).
- Data pipeline thật: thay `demoData.ts` bằng `labor_signal.json` sinh từ pipeline trích xuất kỹ năng (extract_skills.py + analyze_demand.py đã có).
- Deploy: Vercel, root directory = `web/`.
