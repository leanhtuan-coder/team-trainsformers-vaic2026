# PROMPT XÁC THỰC & HOÀN THIỆN SAU KHI MERGE BACKEND/PORTAL
> Dành cho Claude Code / AI Coding Assistant. Chạy prompt này sau khi đã thực hiện xong các bước liên kết API và phân chia luồng Landing/Portal.

---

## 📌 Các bước kiểm tra & hoàn thiện cuối cùng

### 1. Chạy Build và Tự sửa lỗi Type check
Hãy chạy lệnh sau trong terminal của dự án để kiểm tra biên dịch frontend Next.js:
```bash
npm run build --workspace=frontend
```
Nếu có bất kỳ lỗi biên dịch Next.js hay lỗi Type check TypeScript nào (ví dụ: thiếu import, sai kiểu dữ liệu interface `UserProfile` hay `PathwayCandidate`, sai tên biến props), hãy tự động mở các tệp bị lỗi và sửa đổi cho đến khi lệnh build Next.js thành công 100% không còn lỗi.

### 2. Xác minh liên kết dữ liệu thật (Không dùng Mock ở Portal)
- Hãy kiểm tra xem file `/profile/[id]/page.tsx` đã hoàn toàn loại bỏ việc import `recommend` từ `lib/interview` chưa. Đảm bảo mọi gợi ý lộ trình đều phải được lấy động từ API backend `GET /api/profile/:id/pathways`.
- Đảm bảo trong `MarketCharts.tsx` và `PersonalPanel.tsx` không còn hiển thị số lượng tin `12480` của demoData mock nữa, mà phải hiển thị đúng số tin analyze thật từ backend (là `1332` tin có mô tả chi tiết trên tổng số `3365` tin TopCV) kèm chú thích quy mô mẫu `n=...` cho các dải lương.

### 3. Đồng bộ hóa Header & Điều hướng
- Hãy kiểm tra component `Navbar` (`frontend/src/components/landing/Navbar.tsx` hoặc tương tự):
  - Khi học sinh đã có `profile_id` trong `localStorage` (tức là đã hoàn thành khảo sát trước đó), hãy hiển thị nút **"Hồ sơ của tôi"** dẫn trực tiếp tới `/profile/[id]` thay vì hiển thị nút "Bắt đầu".
  - Nút logo hoặc "Trang chủ" của Navbar/Header phải luôn dẫn về `/` (Landing Page).

### 4. Dọn dẹp mã nguồn thừa
- Hãy dọn dẹp các route cũ không dùng đến trong `frontend/src/app` nếu chúng gây xung đột hoặc trùng lặp với cấu trúc mới (ví dụ: các route `/dashboard` hay `/profile/quickstart` cũ của chúng ta từ phiên làm việc trước nếu đã được dồn tích hợp hoàn toàn vào luồng trang chủ `/` và `/profile/[id]`).

---
Sau khi hoàn tất, hãy báo cáo danh sách các file đã sửa đổi và xác nhận build thành công 100%.
