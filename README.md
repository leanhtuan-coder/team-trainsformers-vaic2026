# La Bàn Nghề (Career Compass) — TrainSformers

> Vietnam AI Innovation Challenge 2026 | Track: Giáo Dục & Đào Tạo | Đề bài: Career Compass

## Bối cảnh
Xem chi tiết đầy đủ tại `CONTEXT_PROMPT.md` — file này chứa toàn bộ bối cảnh dự án để Claude Code
đọc trước khi bắt đầu code.

## 👥 Team
| Vai trò | Thành viên |
|---|---|
| Backend & Technical Lead | Lê Anh Tuấn |
| AI Engineer (chính) | Nguyễn Đức Minh |
| AI / NLP hỗ trợ | Đỗ Anh Thư |
| Frontend Developer | Nguyễn Quyết Thắng |
| Business Analyst / Product | Nguyễn Bích Ngọc |
| Pitch & Storytelling | Nguyễn Hải Vân Anh |

Chi tiết: `docs/TEAM.md`

## 📦 Tech Stack (dự kiến)
- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express
- **AI:** LangGraph, RAG (multi-LLM: GPT-4o mini/GPT-4o + Gemini fallback)
- **Database:** PostgreSQL (Supabase)
- **Deploy:** Vercel (FE) + Railway (BE)

## 🗂️ Tài liệu
- `CONTEXT_PROMPT.md` — bối cảnh đầy đủ cho Claude Code (đọc đầu tiên)
- `docs/BA_DESIGN.md` — thiết kế BA đầy đủ (11 tính năng P0, data model, ethics, delivery slices A-E).
  **Phạm vi code 48h thi = Slice A+B+C** (labor signal → evidence profile → explainable portfolio);
  Slice D/E và các tính năng còn lại để sau pilot.
- `docs/PROBLEM_BRIEF.md` — đề bài gốc chi tiết
- `docs/ARCHITECTURE.md` — kiến trúc kỹ thuật 5 bước (lưu ý: mô tả luồng đơn giản hóa, xem BA_DESIGN.md
  để biết data model chi tiết hơn — Evidence Ledger, Market Signal Snapshot, v.v.)
- `docs/DATA_SOURCES.md` — nguồn dữ liệu (TopCV + bổ sung)
- `docs/TEAM.md` — vai trò từng thành viên
- `docs/COST_MODEL_SUMMARY.md` — tóm tắt chi phí LLM/hạ tầng
- `docs/UI_PROMPT_ANTIGRAVITY.md` — prompt chi tiết cho Antigravity để code phần giao diện (màu sắc,
  ràng buộc UX/đạo đức, API contract thật)

## 🗂️ Cấu trúc dự án
Monorepo dùng npm workspaces:
```
frontend/     Next.js + TS + Tailwind (chatbox + /dashboard)
backend/      Express + TS — src/agent (LangGraph), src/rag, src/routes, src/db
scripts/      Pipeline ingestion offline (ingest_topcv.ts)
data/raw/     Dữ liệu gốc (topcv_jobs_raw.json — chưa commit, xem .gitignore)
data/processed/  Output ingestion (Reference DB export, bảng Dashboard)
```

## 🚀 Getting Started
```bash
npm install                # cài dependencies cho cả 3 workspace
npm run dev:frontend       # http://localhost:3000
npm run dev:backend        # http://localhost:4000 (GET /health)
npm run ingest             # đọc data/raw/topcv_jobs_raw.json, in cấu trúc + record mẫu
```
Copy `.env.example` → `.env` và điền API key trước khi chạy backend/ingest.

## 📄 AI Collaboration Log
Xem `AI_COLLABORATION_LOG.md` — ghi lại toàn bộ quá trình dùng AI hỗ trợ (theo yêu cầu BTC).
