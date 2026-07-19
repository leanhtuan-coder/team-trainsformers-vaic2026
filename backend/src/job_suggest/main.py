"""Suggest suitable jobs from a user profile and a market data file.

Both input documents are sent in full to the configured OpenAI-compatible LLM.
Returned job IDs are validated when the market data contains concrete jobs.
"""

from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv


# main.py lives at <project>/backend/src/job_suggest/main.py.
PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_PROFILE_PATH = PROJECT_ROOT / "data/profiles/user_profile.json"
DEFAULT_MARKET_PATH = PROJECT_ROOT / "data/processed/jobs_normalized.json"

# Load local development secrets without committing .env to the repository.
load_dotenv(PROJECT_ROOT / ".env")


class Settings(BaseModel):
    """Runtime configuration, supplied through environment variables."""

    api_key: str = ""
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o-mini"
    profile_path: Path = DEFAULT_PROFILE_PATH
    market_path: Path = DEFAULT_MARKET_PATH
    timeout_seconds: int = 45


@lru_cache
def get_settings() -> Settings:
    return Settings(
        api_key=os.getenv("OPENAI_API_KEY", ""),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/"),
        model=os.getenv("OPENAI_MODEL_NAME", "openai/gpt-oss-120b"),
        profile_path=Path(os.getenv("USER_PROFILE_PATH", str(DEFAULT_PROFILE_PATH))),
        market_path=Path(os.getenv("MARKET_JSON_PATH", str(DEFAULT_MARKET_PATH))),
        timeout_seconds=int(os.getenv("OPENAI_TIMEOUT_SECONDS", "45")),
    )


class SuggestedJob(BaseModel):
    job_id: str
    title: str
    company: str | None = None
    match_score: int = Field(ge=0, le=100)
    reasons: list[str] = Field(min_length=1, max_length=3)
    missing_skills: list[str] = Field(default_factory=list, max_length=5)
    next_step: str


class JobSuggestionResponse(BaseModel):
    suggestions: list[SuggestedJob]
    disclaimer: str
    model: str


app = FastAPI(
    title="Job Suggest API",
    version="0.1.0",
    description="Gợi ý việc làm bằng hồ sơ người dùng và dữ liệu thị trường JSON.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def load_document(path: Path, label: str) -> Any:
    """Load a configured JSON or Markdown/text file."""
    try:
        content = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Không tìm thấy file {label}: {path}. Hãy cấu hình biến môi trường tương ứng.",
        ) from exc

    if path.suffix.lower() in {".md", ".markdown", ".txt"}:
        return content

    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=503, detail=f"File {label} không phải JSON hợp lệ: {exc.msg}") from exc


def iter_job_records(data: Any) -> list[dict[str, Any]]:
    """Find job-like objects anywhere in a market document."""
    jobs: list[dict[str, Any]] = []
    if isinstance(data, dict):
        if data.get("job_id") and data.get("title"):
            jobs.append(data)
        for value in data.values():
            jobs.extend(iter_job_records(value))
    elif isinstance(data, list):
        for item in data:
            jobs.extend(iter_job_records(item))
    return jobs


def suggestion_title(item: dict[str, Any]) -> str:
    for key in ("title", "job", "job_title", "industry", "career_path", "pathway", "name"):
        value = item.get(key)
        if value:
            return str(value)
    return "Gợi ý nghề nghiệp từ dữ liệu thị trường"


def build_messages(profile: dict[str, Any], market: Any, limit: int) -> list[dict[str, str]]:
    system = """Bạn là chuyên gia hướng nghiệp tại Việt Nam. Đánh giá theo bằng chứng trong user_profile và
market_data; không đoán dữ kiện còn thiếu. Nếu market_data có tin tuyển dụng cụ thể, chỉ chọn các job có sẵn
và trả về đúng job. Không suy luận hay đề cập các thuộc tính nhạy cảm.
Trả về DUY NHẤT JSON hợp lệ:
{
  "suggestions": [{"job":"...","title":"...","match_score":0,"reasons":["..."],"missing_skills":["..."],"next_step":"..."}],
  "disclaimer":"..."
}
Mỗi reasons có tối đa 3 ý ngắn, tiếng Việt. Chọn tối đa số lượng yêu cầu."""
    user = json.dumps(
        {"user_profile": profile, "market_data": market, "max_suggestions": limit},
        ensure_ascii=False,
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def extract_json(content: str) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="LLM không trả về JSON hợp lệ.") from exc
    if not isinstance(data, dict):
        raise HTTPException(status_code=502, detail="LLM trả về JSON không đúng cấu trúc.")
    return data


def call_llm(messages: list[dict[str, str]], settings: Settings) -> dict[str, Any]:
    if not settings.api_key:
        raise HTTPException(status_code=503, detail="Thiếu OPENAI_API_KEY.")
    payload = json.dumps(
        {"model": settings.model, "messages": messages, "temperature": 0.2, "response_format": {"type": "json_object"}},
        ensure_ascii=False,
    ).encode("utf-8")
    request = Request(
        f"{settings.base_url}/chat/completions",
        data=payload,
        headers={"Authorization": f"Bearer {settings.api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=settings.timeout_seconds) as response:
            response_data = json.loads(response.read().decode("utf-8"))
        content = response_data["choices"][0]["message"]["content"]
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise HTTPException(status_code=502, detail=f"LLM provider trả lỗi HTTP {exc.code}: {detail}") from exc
    except (URLError, TimeoutError) as exc:
        reason = getattr(exc, "reason", str(exc))
        raise HTTPException(status_code=504, detail=f"Không gọi được LLM provider: {reason}") from exc
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="Phản hồi từ LLM provider không đúng định dạng OpenAI.") from exc
    return extract_json(content)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/job-suggestions", response_model=JobSuggestionResponse)
def suggest_jobs(limit: int = Query(default=5, ge=1, le=10)) -> JobSuggestionResponse:
    """Read the configured profile and market files and return LLM-ranked suggestions."""
    settings = get_settings()
    profile = load_document(settings.profile_path, "hồ sơ người dùng")
    market = load_document(settings.market_path, "dữ liệu thị trường")
    valid_jobs = iter_job_records(market)

    raw_result = call_llm(build_messages(profile, market, limit), settings)
    allowed_jobs = {str(job["job_id"]): job for job in valid_jobs}
    raw_suggestions = raw_result.get("suggestions", [])
    if not isinstance(raw_suggestions, list):
        raise HTTPException(status_code=502, detail="LLM không trả về danh sách suggestions.")

    suggestions: list[SuggestedJob] = []
    seen_ids: set[str] = set()
    for item in raw_suggestions:
        if not isinstance(item, dict):
            continue
        job_id = str(item.get("job_id") or item.get("id") or "")
        if allowed_jobs:
            if job_id not in allowed_jobs or job_id in seen_ids:
                continue
            source = allowed_jobs[job_id]
            item["job_id"] = job_id
            item["title"] = source["title"]
            item["company"] = source.get("company") or None
        else:
            title = suggestion_title(item)
            job_id = job_id or f"market-signal-{len(suggestions) + 1}"
            if job_id in seen_ids:
                continue
            item["job_id"] = job_id
            item["title"] = title
            item["company"] = item.get("company") or None
        try:
            # Constructor works with both Pydantic v1 and v2.
            suggestions.append(SuggestedJob(**item))
            seen_ids.add(job_id)
        except Exception:
            continue
        if len(suggestions) == limit:
            break
    if not suggestions:
        raise HTTPException(status_code=502, detail="LLM không trả về gợi ý hợp lệ từ dữ liệu thị trường.")

    return JobSuggestionResponse(
        suggestions=suggestions,
        disclaimer=str(raw_result.get("disclaimer", "Đây là gợi ý tham khảo dựa trên dữ liệu hiện có.")),
        model=settings.model,
    )
