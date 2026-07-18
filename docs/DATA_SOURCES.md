# Nguồn dữ liệu — La Bàn Nghề

## 1. Dữ liệu chính: TopCV (đã crawl sẵn)

**File:** `data/raw/topcv_jobs_raw.json`
**Trạng thái:** Đã có sẵn (crawl trước ngày thi bởi cộng tác viên ngoài team)
**Định dạng:** JSON

### Cấu trúc dữ liệu (bán cấu trúc — dựa trên mẫu thật đã kiểm tra)

Mô tả công việc chứa các phần nhận diện được qua label trong text:
- `Mô tả công việc` — mô tả chi tiết nhiệm vụ
- `Yêu cầu ứng viên` — bằng cấp, kinh nghiệm, kiến thức cần có
- `Kiến thức ngành` — ví dụ: "Xây dựng" (có thể là field riêng hoặc lẫn trong text)
- `Kỹ năng cần có` — danh sách kỹ năng, ví dụ: "Kỹ năng giao tiếp, Quản lý thời gian, Kỹ năng đàm
  phán..." (có thể là field riêng hoặc lẫn trong text)
- `Quyền lợi ứng viên` — lương, chế độ (lương thường ghi "thoả thuận theo năng lực", KHÔNG phải số)
- `Địa điểm làm việc` — có thể chứa tên đơn vị hành chính sau sáp nhập 2025
- `Thời gian làm việc`

### Việc BẮT BUỘC làm trước khi viết pipeline xử lý
1. In ra 5-10 record JSON thật để xác nhận field nào là structured (JSON key riêng) và field nào
   chỉ là text tự do gộp chung — KHÔNG giả định trước.
2. Nếu `Kiến thức ngành` / `Kỹ năng cần có` là field riêng → parse trực tiếp, không cần LLM.
3. Xử lý lương: phân loại tin có số cụ thể vs tin "thoả thuận" — chỉ dùng nhóm có số cho thống kê
   lương, không bịa số cho nhóm còn lại.
4. Chuẩn hóa vùng miền theo cấp tỉnh/thành (ổn định hơn cấp huyện/xã do sáp nhập hành chính 2025).
5. Làm sạch ký tự thừa từ crawl (`*\-`, escape ký tự, bullet lẫn lộn) trước khi đưa vào LLM/UI.

## 2. Dữ liệu bổ sung: tuyến học nghề/kỹ thuật (cần bổ sung, chưa có)

TopCV thiên về khối văn phòng/công nghệ. Đề bài yêu cầu bắt buộc phải có tuyến học nghề, không chỉ
đại học — cần ít nhất 1 nguồn bù đắp:

- **CADjob.vn** — job board chuyên ngành kỹ thuật/cơ khí, có dữ liệu theo vùng (TP.HCM, Bình Dương,
  Đồng Nai, Hà Nội, Hải Phòng)
- **ESCO taxonomy** (dự phòng nếu không kịp crawl thêm) — miễn phí, có API, 3,008 nghề nghiệp +
  13,890 kỹ năng, bao gồm khối kỹ thuật/thủ công. Không có tiếng Việt sẵn — cần LLM bản địa hóa các
  nghề phổ biến tại Việt Nam.

**Trạng thái: CHƯA CÓ — cần team xác nhận trước khi Claude Code giả định phạm vi ngành nghề.**

## 3. Nguyên tắc chung
- KHÔNG crawl real-time trong lúc thi — toàn bộ là snapshot tĩnh đã chuẩn bị trước.
- Kiến trúc ingestion nên viết theo dạng script độc lập, chạy lại được — để trong pitch có thể nói
  "kiến trúc cho phép cập nhật định kỳ" mà không cần chứng minh live trong demo.

## 4. Dữ liệu cho Dashboard phân tích thị trường
Bảng tổng hợp riêng (xuất từ bước ingestion) phục vụ module Dashboard (`/dashboard`):
- Tần suất xuất hiện của từng kỹ năng (top N)
- Số lượng tin theo ngành nghề
- Lương trung vị/khoảng theo ngành — CHỈ tính trên nhóm tin có số lương rõ ràng
- Số lượng tin theo vùng/tỉnh
- Tỉ lệ tin công khai lương vs "thoả thuận" (hiển thị minh bạch, không che giấu hạn chế dữ liệu)

Dữ liệu này nên tính sẵn lúc ingestion (batch), không tính lại mỗi lần dashboard load trang.
