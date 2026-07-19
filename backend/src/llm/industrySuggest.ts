import type { DerivedProfileSnapshot } from "../profile/schema.js";
import type { RiasecResult } from "../profile/riasec.js";
import type { MarketSignalSnapshot } from "../routes/market.js";

export interface AiIndustrySuggestion {
  industry: string;
  match_score: number;
  reasons: string[];
  missing_skills: string[];
  next_step: string;
}

export interface AiIndustrySuggestionResult {
  suggestions: AiIndustrySuggestion[];
  disclaimer: string;
  model: string;
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[];
}

function env(name: string): string {
  return String(process.env[name] || "").trim();
}

export function isIndustrySuggestConfigured(): boolean {
  return Boolean(env("OPENAI_API_KEY") || env("NVIDIA_API_KEY"));
}

function providerSettings() {
  const usesOpenAiConfig = Boolean(env("OPENAI_API_KEY"));
  const apiKey = env("OPENAI_API_KEY") || env("NVIDIA_API_KEY");
  const baseUrl = (
    env("OPENAI_BASE_URL") ||
    env("NVIDIA_BASE_URL") ||
    "https://integrate.api.nvidia.com/v1"
  ).replace(/\/$/, "");
  const model =
    env("OPENAI_MODEL_NAME") ||
    env("NVIDIA_PATHWAY_MODEL") ||
    (usesOpenAiConfig ? "gpt-4o-mini" : "openai/gpt-oss-120b");
  const configuredTimeout = Number(env("OPENAI_TIMEOUT_SECONDS") || "45");
  const timeoutMs = (Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 45) * 1000;
  return { apiKey, baseUrl, model, timeoutMs };
}

/** Chỉ gửi các nhóm hồ sơ có ý nghĩa hướng nghiệp; không gửi context/demographic vào matching. */
function buildSafeProfile(snapshot: DerivedProfileSnapshot, riasec: RiasecResult) {
  return {
    profile_id: snapshot.profile_id,
    holland_code: riasec.holland_code,
    holland_scores: riasec.scores.map(({ letter, score }) => ({ letter, score })),
    confidence: riasec.confidence,
    evidence: {
      ability_skill: snapshot.groups.ability_skill,
      activity_interest: snapshot.groups.activity_interest,
      work_values: snapshot.groups.work_values,
      goals_exploration: snapshot.groups.goals_exploration.filter(
        (item) => !/tên|tuổi|giới tính|vùng miền|địa phương/i.test(item.dimension)
      ),
    },
  };
}

function buildMarketData(market: MarketSignalSnapshot) {
  return market.industry_insights.map((item) => ({
    industry: item.industry,
    posting_count: item.posting_count,
    demand_share: item.demand_share,
    entry_level_ratio: item.entry_level_ratio,
    salary: item.salary,
    top_skills: item.top_skills,
    top_provinces: item.top_provinces,
  }));
}

function extractJson(content: string): Record<string, unknown> {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed: unknown = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("industry_suggest_invalid_json_shape");
  }
  return parsed as Record<string, unknown>;
}

function cleanStringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => item.trim())
    .slice(0, max);
}

/** Validate theo tên ngành thật, tương đương bước validate job_id trong service job_suggest gốc. */
export function validateIndustrySuggestions(
  raw: Record<string, unknown>,
  allowedIndustries: string[],
  limit: number
): { suggestions: AiIndustrySuggestion[]; disclaimer: string } {
  const allowed = new Map(allowedIndustries.map((name) => [name.toLocaleLowerCase("vi"), name]));
  const items = Array.isArray(raw.suggestions) ? raw.suggestions : [];
  const seen = new Set<string>();
  const suggestions: AiIndustrySuggestion[] = [];

  for (const value of items) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const item = value as Record<string, unknown>;
    const requestedName = String(item.industry || item.title || item.job || "").trim();
    const industry = allowed.get(requestedName.toLocaleLowerCase("vi"));
    if (!industry || seen.has(industry)) continue;

    const score = Number(item.match_score);
    const reasons = cleanStringList(item.reasons, 3);
    const nextStep = String(item.next_step || "").trim();
    if (!Number.isFinite(score) || reasons.length === 0 || !nextStep) continue;

    suggestions.push({
      industry,
      match_score: Math.max(0, Math.min(100, Math.round(score))),
      reasons,
      missing_skills: cleanStringList(item.missing_skills, 5),
      next_step: nextStep,
    });
    seen.add(industry);
    if (suggestions.length >= limit) break;
  }

  return {
    suggestions,
    disclaimer:
      typeof raw.disclaimer === "string" && raw.disclaimer.trim()
        ? raw.disclaimer.trim()
        : "Đây là gợi ý tham khảo dựa trên hồ sơ và dữ liệu thị trường hiện có.",
  };
}

export async function suggestIndustriesWithAi(
  snapshot: DerivedProfileSnapshot,
  riasec: RiasecResult,
  market: MarketSignalSnapshot,
  limit = 6
): Promise<AiIndustrySuggestionResult> {
  const settings = providerSettings();
  if (!settings.apiKey) throw new Error("industry_suggest_not_configured");

  const systemPrompt = `Bạn là chuyên gia hướng nghiệp tại Việt Nam. Hãy xếp hạng các NGÀNH phù hợp với học sinh dựa duy nhất trên bằng chứng trong user_profile và market_data.
Không đoán dữ kiện còn thiếu, không sử dụng thuộc tính nhạy cảm và chỉ được chọn đúng tên ngành có trong market_data.
Trả về DUY NHẤT JSON hợp lệ theo cấu trúc:
{"suggestions":[{"industry":"tên ngành chính xác","match_score":0,"reasons":["..."],"missing_skills":["..."],"next_step":"..."}],"disclaimer":"..."}
Mỗi reasons có 1-3 ý ngắn bằng tiếng Việt, missing_skills tối đa 5 mục. Chọn tối đa ${limit} ngành và xếp từ phù hợp nhất xuống thấp nhất.`;
  const userPrompt = JSON.stringify({
    user_profile: buildSafeProfile(snapshot, riasec),
    market_data: buildMarketData(market),
    max_suggestions: limit,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
  try {
    const response = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`industry_suggest_provider_${response.status}: ${detail}`);
    }
    const payload = (await response.json()) as OpenAiChatResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("industry_suggest_empty_response");

    const validated = validateIndustrySuggestions(
      extractJson(content),
      market.industry_insights.map((item) => item.industry),
      limit
    );
    if (validated.suggestions.length === 0) throw new Error("industry_suggest_no_valid_suggestions");
    return { ...validated, model: settings.model };
  } finally {
    clearTimeout(timeout);
  }
}
