# ĐÁNH GIÁ CẤU HÌNH & BIẾN MÔI TRƯỜNG DEPLOY (DEPLOYMENT ENVIRONMENT REVIEW)

Tài liệu này tổng hợp toàn bộ các điểm cấu hình, biến môi trường (Environment Variables) và các yếu tố dữ liệu cứng cần chuẩn bị trước khi deploy hệ thống **CareerRadar** lên môi trường Production.

---

## 🔑 1. DANH SÁCH BIẾN MÔI TRƯỜNG (ENVIRONMENT VARIABLES)

### A. Frontend (Next.js)
Tệp cấu hình: `.env.local` hoặc cấu hình biến môi trường trên Vercel / Netlify / VPS.
- **`NEXT_PUBLIC_API_URL`**:
  - *Ý nghĩa*: Địa chỉ Base URL của Backend API để client-side Next.js fetch dữ liệu.
  - *Giá trị mặc định (Local)*: `http://localhost:4000/api`
  - *Khi Deploy Production*: Phải đổi thành link API chạy thật (ví dụ: `https://api.careerradar.vn/api`).

### B. Backend (Express + TypeScript)
Tệp cấu hình: `backend/.env` hoặc cấu hình biến môi trường trên Render / Heroku / Railway.
- **`PORT`**:
  - *Ý nghĩa*: Cổng chạy server backend.
  - *Mặc định*: `4000` (Nếu deploy lên các cloud provider, họ sẽ tự cấp cổng ngẫu nhiên thông qua biến `process.env.PORT` này).
- **`GEMINI_API_KEY`** hoặc **`OPENAI_API_KEY`**:
  - *Ý nghĩa*: Key kích hoạt các tính năng AI (Phỏng vấn thích ứng LangGraph, OCR trích xuất chứng chỉ học bạ).
  - *Mặc định*: Trống (Bị bypass bằng heuristic hoặc trả về `501 Not Implemented` khi ở môi trường dev). Khi deploy production, bắt buộc phải cung cấp key hợp lệ để kích hoạt AI.

---

## 🛠️ 2. RÀ SOÁT CÁC PHẦN DỮ LIỆU CỨNG (HARDCODED ELEMENTS)

Hệ thống đã được loại bỏ hoàn toàn các liên kết localhost cứng trong mã nguồn (mọi tệp đã chuyển sang dùng `process.env.NEXT_PUBLIC_API_URL`). Tuy nhiên, cần lưu ý một số tệp dữ liệu tĩnh sau:

### A. Tệp Tin Tuyển Dụng Thô (`data/raw/jobs.json`)
- **Tình trạng**: Đây là file dữ liệu tuyển dụng mẫu (nặng ~6.4MB) dùng để sinh ra chỉ số thị trường.
- **Lưu ý**: Tuyệt đối không dùng tệp tin hoặc thư mục cũ `data_market_processing` (đã loại bỏ).
- **Hướng dẫn deploy**:
  - Phải chạy lệnh `npm run ingest` trên server backend trước tiên để tự động xử lý và tạo ra hai tệp `jobs_normalized.json` và `market_signal_snapshot.json` trong `data/processed/` từ file `data/raw/jobs.json`.
  - Nếu không chạy lệnh này, Matching Engine sẽ báo lỗi `503 Market Signal Unavailable` khi học sinh truy cập trang so khớp ngành nghề.

### B. Danh sách Tỉnh thành (Provinces)
- **Tình trạng**: Danh sách 63 tỉnh thành Việt Nam đang được khai báo tĩnh tại:
  - Frontend: `career-onboarding-wireframe.html` (được đưa vào Onboarding Page).
  - Backend: `backend/src/profile/quickstart.ts`.
- **Đánh giá**: Chấp nhận được vì danh giới hành chính Việt Nam là cố định. Tuy nhiên, nếu mở rộng ra thị trường quốc tế, cần gom danh mục này về một API `/api/metadata/locations` dùng chung.

### C. Ngân hàng Câu hỏi Quickstart Holland Code (Ver0.9)
- **Tình trạng**: Bộ 10 câu hỏi quickstart đang được lưu tĩnh ở backend tại `backend/src/profile/quickstart.ts`.
- **Lưu ý**: Khi cần thay đổi nội dung hoặc thang điểm câu hỏi, chỉ cần sửa tệp này ở backend, frontend sẽ tự động render động theo API `/api/profile/quickstart` mà không cần build lại frontend.
