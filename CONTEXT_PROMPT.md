# BỐI CẢNH DỰ ÁN — LA BÀN NGHỀ (CAREER COMPASS) — VAIC 2026

## 1. Cuộc thi
Đội TrainSformers tham gia Vietnam AI Innovation Challenge 2026 (VAIC 2026) — hackathon AI 48 giờ,
17–19/07/2026 tại NIC Hòa Lạc, Hà Nội. Đội chọn đề bài "Career Compass" (đối tác Duy Tân University).

QUY ĐỊNH QUAN TRỌNG CẦN TUÂN THỦ NGHIÊM:
- Toàn bộ CODE SẢN PHẨM chính phải được viết trong đúng 48 giờ thi (17–19/07/2026).
  KHÔNG được viết sẵn code sản phẩm (logic agent, API, component UI hoàn chỉnh) trước ngày thi.
- Được phép chuẩn bị trước: scaffold/boilerplate trung tính (cấu hình project, .gitignore, README,
  cấu trúc thư mục rỗng), snapshot dữ liệu tham chiếu công khai (không phải code), và tài liệu thiết kế.
- 5 tài liệu bắt buộc nộp cuối: Presentation slides, Demo video (≤5 phút), GitHub repo (public),
  Live deployed URL, AI collaboration log.
- Bắt buộc ghi log mọi lần dùng AI hỗ trợ code vào AI_COLLABORATION_LOG.md trong suốt 48h.

## 2. Đội hình (6 người)
| Thành viên | Vai trò | Phụ trách chính |
|---|---|---|
| Lê Anh Tuấn | Backend & Technical Lead | Kiến trúc tổng thể, backend API, điều phối kỹ thuật |
| Nguyễn Đức Minh | AI Engineer (chính) | LangGraph agent, RAG, prompt engineering, kiến trúc AI |
| Đỗ Anh Thư | AI/NLP hỗ trợ | Research, test AI, xử lý dữ liệu tiếng Việt |
| Nguyễn Quyết Thắng | Frontend Developer | Giao diện chatbox + dashboard, React/Next.js |
| Nguyễn Bích Ngọc | Business Analyst / Product | Use case, proposal, domain logic |
| Nguyễn Hải Vân Anh | Pitch & Storytelling | Demo, pitch deck, business case |

## 3. Đề bài gốc (Career Compass)
Học sinh Việt Nam chọn ngành chủ yếu theo cảm tính, xu hướng đám đông, kỳ vọng gia đình — không dựa
trên tín hiệu thị trường lao động thực. Hệ quả: thừa cử nhân, thiếu thợ lành nghề, thất nghiệp sau
tốt nghiệp, lệch pha đào tạo–nhu cầu thị trường.

Yêu cầu bắt buộc:
1. Phân tích nhu cầu kỹ năng thực từ dữ liệu tuyển dụng (tin tuyển dụng, kỹ năng, lương, xu hướng
   theo vùng/thời gian) — trả lời "ngành nào đang lên, kỹ năng nào đang thiếu ở địa phương".
2. Xây hồ sơ năng lực–sở thích QUA TƯƠNG TÁC — KHÔNG được là một bài trắc nghiệm tính cách đơn thuần.
3. Gợi ý lộ trình học/nghề cá nhân hóa, CÓ GIẢI THÍCH — bao gồm cả tuyến đại học lẫn học nghề.

Ràng buộc đạo đức BẮT BUỘC (trọng số chấm điểm cao nhất):
- Mở rộng lựa chọn, không thu hẹp/đóng khung học sinh.
- Không củng cố định kiến giới tính ("nữ hợp nghề A") hay vùng miền.
- Luôn trình bày kết quả là TÀI LIỆU THAM KHẢO, tôn trọng quyền tự quyết của học sinh.

Tiêu chí chấm điểm: chất lượng trích xuất tín hiệu kỹ năng | mức độ cá nhân hóa & khả năng giải
thích | thiết kế chống thiên kiến/mở rộng cơ hội (trọng số cao nhất) | tính hữu dụng thực tế.

## 4. Giải pháp — La Bàn Nghề
Agent trò chuyện dựng dần hồ sơ năng lực–sở thích qua hội thoại thích ứng, đối chiếu với dữ liệu
tuyển dụng thật để gợi ý lộ trình có giải thích bằng chứng cụ thể, và tự kiểm tra thiên vị bằng
cách hoán đổi giới tính/vùng miền trước khi trả kết quả.

### Kiến trúc 5 bước (QUAN TRỌNG: phân biệt rõ OFFLINE vs ONLINE)

**Giai đoạn OFFLINE (chuẩn bị 1 lần, KHÔNG chạy lại mỗi phiên chat):**
- Bước 1 — Trích kỹ năng: đọc dữ liệu tuyển dụng đã crawl sẵn (xem Mục 5) → chuẩn hóa kỹ năng
- Bước 2 — Phân tích cầu: tổng hợp xu hướng kỹ năng thiếu/lương/biến động theo vùng
- Output: Reference DB (vector store) dùng cho RAG — xây 1 lần, query nhiều lần

**Giai đoạn ONLINE (chạy mỗi phiên chat thật sự, đây là phần cần code chính trong 48h):**
- Bước 3 — Dựng hồ sơ: agent hỏi thích ứng qua nhiều lượt (LOOP — câu hỏi tiếp theo phụ thuộc câu
  trả lời trước, KHÔNG theo kịch bản cố định), dừng khi đủ tin cậy (is_profile_complete())
- Bước 4 — Ghép & giải thích: khi hồ sơ đủ → (a) Query construction: chuyển hồ sơ thành 2-3 truy
  vấn tìm kiếm → (b) Vector search trong Reference DB (top-k) → (c) LLM ghép hồ sơ + dữ liệu truy
  xuất → sinh gợi ý kèm giải thích PHẢI trích dẫn bằng chứng cụ thể (grounded generation, không
  được tự suy diễn thêm ngoài dữ liệu cung cấp)
- Bước 5 — Tự kiểm tra thiên vị: hoán đổi giới tính/vùng miền trong hồ sơ đầu vào, chạy lại bước 4,
  so sánh 2 kết quả, cảnh báo/lọc nếu phát hiện lệch

### Kỹ thuật triển khai gợi ý
- State machine dạng LangGraph: 1 node lặp (`profiling_node` tự trỏ về chính nó cho đến khi đủ hồ
  sơ) → chuyển tuyến tính qua `matching_node` → `bias_check_node` → `respond_node`
- KHÔNG cần agent tự do kiểu ReAct phức tạp — state machine tuyến tính + 1 vòng lặp là đủ và dễ
  kiểm soát trong 48h

## 5. Nguồn dữ liệu tham chiếu

### 5.1 — Dữ liệu chính: TopCV đã crawl sẵn (JSON, đã có sẵn)
Team đã có sẵn 1 file JSON crawl từ TopCV (chuẩn bị trước bởi người ngoài team), chứa tin tuyển
dụng thật. File đặt tại `data/raw/topcv_jobs_raw.json`.

QUAN TRỌNG — Claude Code cần làm ngay khi bắt đầu code (không phải lúc lên kế hoạch):
1. Đọc và in ra cấu trúc thật của file JSON (danh sách field, 5-10 record mẫu, không chỉ 1) TRƯỚC
   khi viết pipeline xử lý — không đoán schema, không giả định field names.
2. Xác nhận field nào map vào: tiêu đề công việc, kỹ năng yêu cầu, mức lương, địa điểm/vùng,
   ngành nghề, thời gian đăng tin — dựa trên cấu trúc thật đã xem (xem thêm Mục 5.4 bên dưới).
3. Viết script ingestion RIÊNG BIỆT (`scripts/ingest_topcv.py` hoặc tương đương) để:
   - Đọc file JSON gốc, làm sạch dữ liệu (loại tin trùng/thiếu field quan trọng, chuẩn hóa lương)
   - Trích xuất/chuẩn hóa kỹ năng (Bước 1) — xem Mục 5.4 để biết field nào đã có sẵn, không cần LLM
   - Tổng hợp xu hướng theo vùng/ngành (Bước 2)
   - Xuất ra Reference DB (embeddings nạp vào vector store) — input cho RAG ở runtime
   - Đồng thời xuất bảng tổng hợp riêng cho Dashboard (xem Mục 9)
4. TopCV thiên về khối văn phòng/công nghệ — cần bổ sung nguồn cho tuyến học nghề, xem Mục 5.2.

### 5.2 — Dữ liệu bổ sung (nếu kịp thời gian): tuyến học nghề/kỹ thuật
CẦN ít nhất 1 nguồn bổ sung để đề xuất được cả tuyến học nghề (đề bài yêu cầu bắt buộc "vocational
routes, not just university"). Gợi ý nguồn công khai:
- CADjob.vn (job board chuyên ngành kỹ thuật) — nếu có thời gian crawl thêm hoặc thu thập thủ công
- Nếu không kịp: dùng ESCO taxonomy (miễn phí, có occupation cho khối kỹ thuật/thủ công), LLM bản
  địa hóa sang tiếng Việt để bù khoảng trống này
- Claude Code: hỏi rõ team xem có file thứ 2 này chưa trước khi giả định phạm vi ngành nghề

### 5.3 — Không crawl real-time trong 48h
Toàn bộ dữ liệu dùng cho demo là snapshot tĩnh (đã có sẵn) — KHÔNG cần viết crawler chạy live
trong lúc thi. Nếu cần "cập nhật liên tục" cho phần pitch, chỉ cần thiết kế kiến trúc cho phép
(ví dụ: script ingestion có thể chạy lại định kỳ), không cần chứng minh thực tế trong demo.

### 5.4 — Cấu trúc thật của dữ liệu TopCV (dựa trên mẫu thật đã xem)
Mô tả công việc trong file JSON có dạng bán cấu trúc (semi-structured), gồm các phần có thể nhận
diện qua label rõ ràng trong text: "Mô tả công việc", "Yêu cầu ứng viên", "Kiến thức ngành",
"Kỹ năng cần có", "Quyền lợi ứng viên", "Địa điểm làm việc", "Thời gian làm việc".

QUAN TRỌNG — Claude Code cần kiểm tra ngay khi đọc file JSON thật:
1. Kiểm tra xem "Kiến thức ngành" và "Kỹ năng cần có" có phải là FIELD RIÊNG trong JSON (structured)
   hay chỉ nằm lẫn trong 1 field mô tả dài (free text)?
   - Nếu là field riêng → parse trực tiếp, KHÔNG cần gọi LLM để trích kỹ năng cho phần này (tiết
     kiệm chi phí + tăng độ chính xác vì đây là dữ liệu gốc từ TopCV, đáng tin hơn LLM đoán)
   - Nếu chỉ có trong text mô tả dài → cần LLM trích xuất như kế hoạch ban đầu
2. Lương — PHẦN LỚN tin đăng ghi "thoả thuận theo năng lực" hoặc tương tự, KHÔNG có số cụ thể.
   Chiến lược bắt buộc:
   - Viết regex/LLM để phân loại: tin có số lương rõ ràng (VD: "15-20 triệu") vs tin "thoả thuận"
   - Chỉ dùng nhóm có số cho biểu đồ/thống kê lương theo ngành
   - Với nhóm "thoả thuận", vẫn giữ lại để phân tích xu hướng kỹ năng/ngành (không loại bỏ toàn bộ)
   - Hiển thị rõ trong dashboard: "X% tin có công khai lương, thống kê dựa trên nhóm này"
   - KHÔNG được tự bịa số lương cho tin "thoả thuận" để lấp đầy dữ liệu
3. Địa điểm làm việc có thể chứa tên đơn vị hành chính sau sáp nhập 2025 (VD: "Xã Hiệp Hòa (huyện
   Hiệp Hòa cũ)") — khi chuẩn hóa vùng miền, ưu tiên cấp tỉnh/thành phố làm đơn vị phân tích chính
   (ổn định hơn), không parse cứng theo cấp huyện/xã vì có thể đã đổi tên.
4. Text mô tả có ký tự thừa từ crawl (`*\-`, escape ký tự, bullet `•` lẫn lộn) — cần bước làm sạch
   (regex strip) trước khi đưa vào LLM hoặc hiển thị lên UI.
5. Trước khi viết pipeline, in ra 5-10 record JSON thật (không phải chỉ 1 mẫu) để xác nhận các
   field trên có nhất quán giữa các tin hay không — tin từ ngành khác nhau có thể có format hơi
   khác nhau.

## 6. Stack kỹ thuật đã thống nhất
- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: Node.js + Express
- AI: LangGraph, RAG (Supabase pgvector hoặc Pinecone)
- LLM: GPT-4o mini (mặc định, rẻ) + GPT-4o (cho bước Matching & giải thích — bước quan trọng nhất
  về chất lượng lý luận) + Gemini 2.5 Flash-Lite/Flash làm fallback — KHÔNG phụ thuộc 1 provider
- Database: PostgreSQL (Supabase)
- Deploy: Vercel (frontend) + Railway (backend)

## 7. Quy ước làm việc
- Branch: `main` (deploy) / `dev` (tích hợp) / `feature/<tên>` / `fix/<tên>`
- Commit message rõ ràng, tránh "update", "fix bug" chung chung
- Review chéo trước khi merge, kể cả khi gấp
- Mỗi lần dùng AI hỗ trợ code, ghi ngay vào AI_COLLABORATION_LOG.md (thời gian, người dùng, tool,
  mục đích, ghi chú) — đừng dồn cuối mới ghi

## 8. Mô hình chi phí (đã tính sẵn, xem docs/COST_MODEL_SUMMARY.md)
Chi phí LLM ước tính ~102–513đ/phiên tùy phương án model. Chi phí hạ tầng giảm mạnh theo quy mô
(~7,000đ/user/tháng ở quy mô pilot xuống ~900đ/user/tháng ở quy mô 100,000 MAU). Không ảnh hưởng
trực tiếp đến việc code trong 48h nhưng cần biết để không over-engineer phần chọn model — ưu tiên
GPT-4o mini cho các bước phụ, chỉ dùng GPT-4o cho bước Matching & giải thích.

## 9. TÍNH NĂNG — DASHBOARD PHÂN TÍCH THỊ TRƯỜNG

Ngoài luồng chatbox cho học sinh, cần thêm 1 module Dashboard (route riêng trong cùng Next.js app,
ví dụ `/dashboard` hoặc `/market-insights`) để trực quan hóa dữ liệu đã xử lý từ Bước 1-2 (offline
pipeline). Đây vừa là công cụ nội bộ để team validate chất lượng dữ liệu trong 48h, vừa dùng trong
demo để chứng minh "chúng tôi xử lý dữ liệu tuyển dụng thật" — trực tiếp ăn điểm tiêu chí "Quality
of skill-signal extraction from hiring data".

Đề xuất các biểu đồ tối thiểu:
- Top kỹ năng đang được yêu cầu nhiều nhất (bar chart, đếm tần suất từ field "Kỹ năng cần có")
- Phân bổ ngành nghề theo số lượng tin đăng (từ field "Kiến thức ngành")
- Phân bố lương theo ngành (CHỈ dùng nhóm tin có số lương rõ ràng — xem Mục 5.4 điểm 2)
- Phân bố tin tuyển dụng theo vùng/tỉnh (map hoặc bar chart)
- Tỉ lệ tin có công khai lương vs "thoả thuận" — hiển thị minh bạch để không gây hiểu lầm về độ
  đầy đủ dữ liệu

Công nghệ đề xuất: Recharts hoặc D3.js (Thắng đã có kinh nghiệm dashboard tương tự dự án NHS Health
Data Visualisation) — dữ liệu tính sẵn ở bước ingestion (không tính lại mỗi lần load trang), lưu
kết quả tổng hợp vào bảng riêng trong Postgres hoặc file JSON tĩnh để dashboard load nhanh.

## 10. Việc cần Claude Code làm ngay bây giờ
Trước khi viết bất kỳ dòng code sản phẩm nào, hãy:
1. Đọc file `data/raw/topcv_jobs_raw.json` (nếu đã có), in ra cấu trúc thật + 5-10 record mẫu —
   xác nhận với người dùng các field trước khi giả định bất cứ điều gì (xem Mục 5.1, 5.4)
2. Đề xuất cấu trúc thư mục dự án đầy đủ (frontend/backend/scripts/docs) dựa trên stack ở Mục 6,
   và CHỜ XÁC NHẬN trước khi tạo file
3. Hỏi rõ: đây là code thật để nộp bài (trong khung 48h thi) hay đang code thử/luyện tập trước —
   vì ràng buộc ở Mục 1 chỉ áp dụng cho code nộp bài chính thức
4. Sau khi xác nhận, thứ tự ưu tiên đề xuất:
   a. Script ingestion dữ liệu TopCV (Bước 1-2, offline) — vì mọi thứ khác phụ thuộc vào đây
   b. Backend state machine (Bước 3-4-5, online) — phần lõi AI-Native quyết định điểm số
   c. Frontend chatbox
   d. Dashboard phân tích thị trường
