# HƯỚNG DẪN KỸ THUẬT & PROMPT LẬP TRÌNH (TECHNICAL HANDOVER & CODING PROMPT)

Tài liệu này tổng hợp cấu trúc mã nguồn hiện tại của dự án **CareerRadar (La Bàn Nghề)** và cung cấp các chỉ thị lập trình chi tiết dành cho Codex/Claude để hoàn thiện các chức năng frontend và backend.

---

## 🏗️ 1. KHẢO SÁT CẤU TRÚC KỸ THUẬT HIỆN TẠI

### 📂 Backend (Express + TypeScript)
Các tệp quan trọng nằm tại thư mục `backend/src`:
- **`profile/schema.ts`**: Định nghĩa cấu trúc `Profile` (File A chỉ chứa `evidence` ledger), `EvidenceClaim`, `AssessmentDetail`, và snapshot được tính toán `DerivedProfileSnapshot`.
- **`profile/snapshot.ts`**: Hàm `buildSnapshot(profile)` đọc toàn bộ Ledger bằng chứng để tính toán điểm số thế mạnh real-time.
- **`profile/riasec.ts`**: Hàm `scoreRiasec(profile)` tính toán điểm số Holland Code và trả về mã RIASEC.
- **`routes/profile.ts`**: Chứa các API chính:
  - `GET /api/profile/quickstart`: Lấy bộ câu hỏi onboarding.
  - `POST /api/profile`: Khởi tạo Profile trống.
  - `POST /api/profile/:id/quickstart`: Gửi câu trả lời onboarding (lưu dưới dạng `self_report` evidence).
  - `POST /api/profile/:id/assessment`: Ghi nhận kết quả test (lưu dưới dạng `assessment` evidence).
  - `GET /api/profile/:id`: Lấy snapshot và danh sách evidence.
  - `GET /api/profile/:id/riasec`: Lấy mã Holland Code và điểm số.
  - `POST /api/profile/:id/riasec/tiebreak`: Phá hòa RIASEC bằng cách gửi lựa chọn chữ cái `{ letter }` (lưu dưới dạng `interaction` evidence).
  - `GET /api/profile/:id/pathways`: So khớp hồ sơ học sinh với dữ liệu thị trường và gợi ý ngành nghề.
- **`matching/engine.ts`**: Matching Engine so khớp Snapshot của học sinh với dữ liệu tuyển dụng real-time.

### 🖥️ Frontend (Next.js App Router + TailwindCSS)
Các file giao diện quan trọng nằm tại `frontend/src`:
- **`app/layout.tsx`**: Layout chính dùng phông chữ `Be Vietnam Pro` đồng bộ toàn dự án.
- **`lib/profile.ts`**: Các hàm call API backend (lấy profile, quickstart, assessment, pathways).
- **`app/profile/[id]/page.tsx`**: Trang cá nhân (Portal) chứa các tab:
  - **Tab 1 (Tổng quan & So sánh)**: Chế độ Cân Đo.
  - **Tab 2 (Lộ trình & Bản đồ Gap)**: Roadmap tự học & học nghề.
  - **Tab 3 (AI Mentor Chat)**: Trợ lý AI phỏng vấn.
  - **Tab 4 (Sổ cái Bằng chứng)**: Evidence Ledger.

---

## 🛠️ 2. CHÌ THỊ LẬP TRÌNH CHI TIẾT CHO CLAUDE/CODEX

Bạn là AI Coding Agent lập trình cho dự án **CareerRadar**. Hãy triển khai tiếp theo các phần việc sau:

### 🚀 Nhiệm vụ 1: Triển khai Giao diện Onboarding & Thuật toán Holland Ver0.9
1. Tích hợp giao diện **[career-onboarding-wireframe.html](file:///d:/LaBanNghe_ClaudeCode_Package/VAIC%202026/career-onboarding-wireframe.html)** thành trang Next.js tại `frontend/src/app/onboarding/page.tsx` để lấy dữ liệu ban đầu.
2. Tích hợp bộ **10 Câu hỏi Holland Ver0.9** với thuật toán cộng trừ điểm cho 9 nhóm ngành:
   - *Câu 1*: Máy móc ➡️ `+(4) +(7)`; Con số ➡️ `+(3) +(1)`; Con người ➡️ `+(5) +(6)`; Ý tưởng ➡️ `+(9) +(2)`.
   - *Câu 2*: Dẫn dắt ➡️ `+(2)`; Kế hoạch ➡️ `+(3)`; Hòa giải ➡️ `+(6) +(5)`; Kỹ thuật ➡️ `+(1) +(4)`.
   - *Câu 3*: Sửa đồ ➡️ `+(4) +(1)`; Quy luật ➡️ `+(3) +(1)`; Giúp đỡ ➡️ `+(5) +(6)`; Tạo mới ➡️ `+(9) +(2)`.
   - *Câu 4*: Tự nhiên (Toán/Lý/Tin) ➡️ `+(1) +(4) +(3)`; Xã hội ➡️ `+(6) +(2)`; Sinh/Hóa ➡️ `+(5)`; Mỹ thuật ➡️ `+(9)`.
   - *Câu 5*: Phần mềm/Quy trình ➡️ `+(1)`; Máy móc/Vật lý ➡️ `+(4) +(7)`; Dịch vụ ➡️ `+(6)`; Cái đẹp ➡️ `+(9)`.
   - *Câu 6 (Chọn tối đa 2)*: Logic/Toán ➡️ `+(1) +(3) +(4)`; Viết/Thuyết trình ➡️ `+(2) +(6)`; Cẩn thận ➡️ `+(3) +(5)`; Vẽ/Thiết kế ➡️ `+(9)`; Sửa chữa ➡️ `+(4) +(7)`.
   - *Câu 7*: Đúng quy tắc ➡️ `+(3)`; Insight ➡️ `+(1) +(2)`; Kể câu chuyện ➡️ `+(2) +(6)`.
   - *Câu 8*: Hiện trường ➡️ `+(4) +(7)`; Văn phòng ➡️ `+(3)`; Tiếp xúc nhiều người ➡️ `+(6) +(2)`; Tự do ➡️ `+(9) +(1)`.
   - *Câu 9*: Ổn định ➡️ `+(3) +(6) +(5)`; Mới mẻ ➡️ `+(1) +(2)`; Làm chủ ➡️ `+(9) +(2)`.
   - *Câu 10 (Câu phản chứng)*: Ngồi yên ➡️ `-(3) -(7) +(2) +(4) +(6)`; Giao tiếp lạ ➡️ `-(2) -(6) +(1) +(3) +(4)`; Mơ hồ ➡️ `-(9) -(2) +(3) +(4)`; Deadline cao ➡️ `-(2) -(5) +(3) +(6)`.
3. Lưu kết quả trắc nghiệm và dữ liệu chứng chỉ/học bạ vào Ledger cá nhân của học sinh thông qua API backend.
4. Triển khai **Cờ Mâu Thuẫn** (hạ Confidence khi có xung đột điểm cộng/trừ giữa câu 1-8 và câu 10) và cơ chế **Tie-breaker** (phá hòa RIASEC).

### 🚀 Nhiệm vụ 2: Hoàn thiện Tab "Lộ trình & Bản đồ Gap"
1. Gọi API `GET /api/profile/:id/pathways` để lấy dữ liệu so khớp thị trường (chỉ số lương, đà tăng trưởng, phân bổ vùng miền từ tệp `jobs_normalized.json` đã được xử lý qua script `npm run ingest` từ tệp tin dữ liệu gốc **`data/raw/jobs.json`** - không dùng tệp cũ `data_market_processing`).
2. Vẽ **Bản đồ Gap** và **Lộ trình Roadmap** tự học/học nghề tương thích với Fit Score thực tế.

### 🚀 Nhiệm vụ 3: Hoàn thiện Tab "Sổ cái Bằng chứng (Evidence Ledger)"
1. Hiển thị bảng Sổ cái từ API `GET /api/profile/:id`.
2. Tạo form cho phép học sinh tải lên/thêm bằng chứng chứng chỉ mới để hệ thống tự cập nhật Dashboard real-time.

---

## ⚙️ RÀNG BUỘC PHÁT TRIỂN:
- **Tuyệt đối không dùng dữ liệu mock tĩnh**: Mọi API gọi lên backend phải được kết nối thật. Backend phải đọc/ghi trực tiếp vào file JSON trong `backend/data/profiles/`.
- **Đảm bảo tính trung thực**: Tôn trọng quyền tự quyết của học sinh (Anti-bias, nút "Không phải tôi",...).
