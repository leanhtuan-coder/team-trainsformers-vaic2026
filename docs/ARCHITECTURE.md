# Kiến trúc kỹ thuật — La Bàn Nghề

## Tổng quan
Hệ thống gồm 2 giai đoạn tách biệt rõ ràng: **Offline (chuẩn bị dữ liệu, chạy 1 lần)** và
**Online (chạy mỗi phiên chat thật, đây là phần code chính trong 48h)**.

## Giai đoạn OFFLINE — chuẩn bị Reference DB

```
Dữ liệu tuyển dụng (TopCV JSON đã crawl)
        ↓
Trích kỹ năng & chuẩn hóa (parse field có sẵn hoặc LLM nếu cần)
        ↓
Phân tích cầu (tổng hợp xu hướng theo vùng/ngành/thời gian)
        ↓
Reference DB (vector store — dùng cho RAG ở runtime)
```

Chạy 1 lần trước/đầu giờ thi, KHÔNG chạy lại mỗi tin nhắn của học sinh.

## Giai đoạn ONLINE — luồng agent trong chatbox

```
Học sinh nhắn tin
        ↓
Agent hỏi thích ứng (dựng hồ sơ từng bước) ─┐
        ↓                                    │ ↻ lặp đến khi đủ hồ sơ
        └────────────────────────────────────┘
        ↓ (khi đủ hồ sơ)
Truy xuất RAG + ghép giải thích
        ↓
Tự kiểm tra thiên vị (hoán đổi giới tính/vùng, so sánh)
        ↓
Trả lời trong chatbox (kèm trích dẫn bằng chứng)
```

### Chi tiết bước "Truy xuất RAG + ghép giải thích" (3 giai đoạn con)

1. **Query construction** — LLM chuyển hồ sơ học sinh thành 2-3 truy vấn tìm kiếm khác góc độ
   (sở thích, vùng miền, tuyến học nghề) thay vì 1 câu chung chung.
2. **Vector search** — Embed truy vấn, so khớp với Reference DB đã chuẩn bị sẵn (top-k kết quả).
   Bước này KHÔNG gọi LLM, chỉ truy vấn — nhanh và rẻ.
3. **LLM ghép & sinh giải thích** — Nhận hồ sơ + dữ liệu truy xuất, sinh gợi ý kèm giải thích.
   Ràng buộc bắt buộc trong prompt: "Chỉ được đưa ra lý do dựa trên dữ liệu được cung cấp, không
   được tự suy diễn thêm, mỗi gợi ý phải trích số liệu cụ thể" (grounded generation).

### Cơ chế tự kiểm tra thiên vị
Sau khi có gợi ý cho hồ sơ gốc, hệ thống tạo 1 bản sao hồ sơ với giới tính/vùng miền hoán đổi, chạy
lại toàn bộ bước Matching & giải thích, rồi so sánh 2 kết quả. Nếu lệch đáng kể → cảnh báo/lọc
trước khi trả về học sinh. Khi demo cho giám khảo, nên có chế độ hiển thị trực tiếp cả 2 kết quả
song song (điểm "wow" quan trọng nhất vì đây là tiêu chí chấm điểm trọng số cao nhất).

## Đề xuất triển khai kỹ thuật (LangGraph)
State machine đơn giản, không cần agent tự do kiểu ReAct:

- `profiling_node` — có cạnh tự trỏ về chính nó (self-loop) cho đến khi
  `is_profile_complete(state) == True`
- Khi đủ hồ sơ → chuyển tuyến tính: `matching_node` → `bias_check_node` → `respond_node`

## Module Dashboard (bổ sung, độc lập với luồng chatbox)
Route riêng (`/dashboard`) hiển thị dữ liệu đã xử lý từ giai đoạn Offline — không gọi LLM tại thời
điểm xem, dữ liệu tính sẵn lúc ingestion. Xem chi tiết yêu cầu trong `DATA_SOURCES.md` mục Dashboard.

## Stack
| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind CSS |
| Backend | Node.js + Express |
| AI Agent | LangGraph |
| Vector Store | Supabase pgvector hoặc Pinecone |
| LLM chính | GPT-4o mini (mặc định) |
| LLM cho bước Matching & giải thích | GPT-4o (chất lượng lý luận cao hơn) |
| LLM fallback | Gemini 2.5 Flash-Lite / Flash |
| Database | PostgreSQL (Supabase) |
| Deploy | Vercel (frontend) + Railway (backend) |
