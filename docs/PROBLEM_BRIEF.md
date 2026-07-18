# Đề bài gốc — Career Compass (Duy Tan University)

## Bối cảnh
Học sinh Việt Nam hiện chọn ngành chủ yếu theo cảm tính, xu hướng đám đông, hoặc kỳ vọng gia đình —
không dựa trên tín hiệu thị trường lao động thực tế. Hệ quả: thừa cử nhân, thiếu thợ lành nghề,
thất nghiệp sau tốt nghiệp, và lệch pha giữa đào tạo với nhu cầu thị trường thực tế. Hiện chưa có
công cụ AI nào kết nối được năng lực/sở thích cá nhân của học sinh với dữ liệu thị trường lao động
theo thời gian thực.

## Yêu cầu kỹ thuật bắt buộc (3 khối chức năng)

### 1. Phân tích nhu cầu kỹ năng thực từ dữ liệu tuyển dụng
Trích xuất từ: tin tuyển dụng, kỹ năng yêu cầu, mức lương, xu hướng theo vùng/thời gian. Trả lời
được câu hỏi "ngành nào đang lên, kỹ năng nào đang thiếu ở địa phương". Đây là data pipeline thật —
cần dữ liệu tuyển dụng thực tế (đã có sẵn từ TopCV, xem `DATA_SOURCES.md`), không phải dữ liệu mẫu
tĩnh giả lập.

### 2. Xây hồ sơ năng lực–sở thích qua tương tác
Yêu cầu rõ: KHÔNG được là một bài trắc nghiệm tính cách đơn thuần (kiểu Holland/MBTI). Phải qua
tương tác động — hội thoại AI thích ứng, không phải form tĩnh.

### 3. Gợi ý lộ trình học/nghề cá nhân hóa, có giải thích (explainability)
Bắt buộc giải thích được — không chỉ đưa ra gợi ý mà phải nói rõ "vì sao" (dựa trên tín hiệu thị
trường nào, kỹ năng nào đang thiếu). Phải bao gồm cả hướng học nghề (không chỉ đại học) — đúng tinh
thần chống lệch pha đào tạo.

## Ràng buộc đạo đức bắt buộc (trọng số cao nhất trong chấm điểm)
- Mở rộng lựa chọn cho học sinh, không đóng khung/giới hạn
- Không củng cố định kiến giới tính hoặc vùng miền (ví dụ: không gợi ý nghề theo khuôn mẫu
  "nữ tính/nam tính" cũ)
- Luôn trình bày kết quả như tài liệu tham khảo, không phải quyết định thay học sinh

## Tiêu chí chấm điểm
| Tiêu chí | Trọng số |
|---|---|
| Chất lượng trích xuất tín hiệu kỹ năng | Cao |
| Mức độ cá nhân hóa & khả năng giải thích | Cao |
| Thiết kế chống thiên kiến / mở rộng cơ hội | **Cao nhất** |
| Tính hữu dụng thực tế (đánh giá bởi học sinh và chuyên gia hướng nghiệp) | Trung bình–Cao |

## Bối cảnh thị trường (đã research, dùng cho pitch)
- 25–30% sinh viên bỏ học/chuyển ngành sau 2 năm đầu vì thiếu thông tin hướng nghiệp
- 25% học sinh THCS chọn học nghề không vì năng lực mà vì thiếu định hướng
- Chỉ 26.8–29.2% lao động Việt Nam qua đào tạo có bằng/chứng chỉ; 38 triệu lao động không có
  trình độ chuyên môn kỹ thuật (Tổng cục Thống kê)
- IT: thiếu 400,000 kỹ sư/năm, chỉ 35% ứng viên đạt yêu cầu dù 50,000 sinh viên tốt nghiệp mỗi năm
- Đối thủ mới: CELLLO (SEAMEO CELLL, 2025-2026) — kết hợp đánh giá năng lực + tự khám phá, nhưng
  KHÔNG kết nối dữ liệu thị trường lao động real-time — đây là khoảng trống La Bàn Nghề lấp vào
- Cách làm hiện tại của chuyên gia hướng nghiệp: quy trình thủ công dùng ChatGPT tay từng bước —
  xác nhận rõ chưa có công cụ tự động hóa toàn bộ chuỗi này
