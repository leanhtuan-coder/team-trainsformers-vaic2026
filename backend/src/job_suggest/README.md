# Job Suggest API

Dịch vụ FastAPI đọc file hồ sơ và file dữ liệu thị trường rồi gọi endpoint
OpenAI-compatible `/chat/completions` để xếp hạng các việc làm hoặc nhánh nghề
phù hợp. Toàn bộ nội dung của cả user profile và market data được gửi vào
prompt; nếu market data có `job` thật thì kết quả được validate theo các ID
đó.

## Chuẩn bị

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/src/job_suggest/requirements.txt
```

Nếu `python3 -m venv` báo thiếu `ensurepip` trên Ubuntu/Debian, cài một lần
gói hệ thống `python3.12-venv` (hoặc gói `python3-venv` tương ứng phiên bản
Python) rồi chạy lại.

Tạo `data/profiles/user_profile.json` (file này đã được `.gitignore`), ví dụ:

```json
{
  "name": "Nguyễn An",
  "skills": ["Python", "phân tích dữ liệu", "Excel"],
  "interests": ["công nghệ", "tài chính"],
  "location": "Hà Nội",
  "experience": "sinh viên mới tốt nghiệp"
}
```

Mặc định market dùng `data/processed/jobs_normalized.json`. Có thể thay cả hai
đường dẫn qua biến môi trường:

```bash
export OPENAI_API_KEY="..."
export OPENAI_BASE_URL="https://api.openai.com/v1"  # ví dụ: URL v1 của provider khác
export OPENAI_MODEL_NAME="gpt-4o-mini"
export USER_PROFILE_PATH="data/profiles/user_profile.json"
export MARKET_JSON_PATH="data/processed/jobs_normalized.json"
# hoặc dùng Markdown digest:
# export MARKET_JSON_PATH="data/processed/market_signal_ai_digest.md"
uvicorn backend.src.job_suggest.main:app --reload --port 8000
```

Hoặc thêm các biến trên vào file `.env` ở thư mục gốc; service tự nạp file này.

Market data có thể là JSON, Markdown (`.md`/`.markdown`) hoặc text (`.txt`).
JSON được gửi nguyên vẹn vào prompt, không cần phải là mảng job hay object
`{ "jobs": [...] }`. Service sẽ tự tìm các object có `job_id` và `title` ở bất
kỳ nhánh nào trong JSON để validate kết quả LLM. Nếu file là Markdown digest
hoặc dữ liệu tổng hợp không có job cụ thể, API vẫn trả gợi ý nhánh nghề từ nội
dung đó và tự sinh `job_id` dạng `market-signal-1`.

> Lưu ý: market data lớn có thể vượt context window hoặc làm tăng chi phí theo
> token của LLM provider. API chủ động gửi nguyên vẹn dữ liệu theo yêu cầu,
> không cắt bớt hay tiền lọc.

## API

```bash
curl -X POST 'http://localhost:8000/v1/job-suggestions?limit=5'
```

Swagger UI: `http://localhost:8000/docs`.

## Kiểm thử

Smoke test dùng profile mẫu và market data thật, nhưng mock LLM nên không tốn
API key hay gọi mạng. Nó xác nhận toàn bộ dữ liệu được đưa vào prompt, validate
được `job_id` khi có job thật, và vẫn nhận Markdown digest khi không có job ID.

```bash
python3 -m unittest -v backend.src.job_suggest.tests.test_main
```

Để test thật với LLM, điền `OPENAI_API_KEY` vào `.env`, khởi động service, rồi
gọi endpoint ở phần API. Response hiện trực tiếp trên terminal:

```bash
curl -s -X POST 'http://localhost:8000/v1/job-suggestions?limit=5' | jq
```

Không commit file `.env`.
