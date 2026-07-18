import type { MarketSignalSnapshot } from "../routes/market.js";
import type { DerivedProfileSnapshot } from "../profile/schema.js";

// Pathway Portfolio — bước 1 của Slice C (BA_DESIGN.md §6.6, F-04/F-05), CHƯA cần LLM:
// chỉ đối chiếu từ khóa (rule-based, xác định) giữa hồ sơ và market signal đã ingest sẵn.
// Bước sinh giải thích tự nhiên bằng LLM (query construction → LLM ghép) sẽ nối tiếp sau khi
// có OPENAI_API_KEY/GEMINI_API_KEY — cho tới lúc đó, mỗi candidate vẫn có đủ evidence có trích
// dẫn (matched tokens + market data) để hiển thị "Why this path?" ở dạng structured, không suy diễn.

const STOPWORDS = new Set([
  "và", "các", "trong", "cho", "là", "có", "được", "một", "những", "để", "này",
  "với", "khi", "sẽ", "đã", "không", "hay", "hoặc", "làm", "rất", "cũng", "của",
  "người", "mình", "em", "tôi", "bạn", "đang", "muốn", "thích", "nhất", "hơn", "về",
  "còn", "vào", "ra", "lên", "xuống", "theo", "như", "nên", "phải", "từ", "trên",
  // Quá phổ biến trong cả câu trả lời tự do lẫn tên kỹ năng/ngành — match được nhưng không
  // mang tín hiệu phân biệt, dễ gây điểm ảo (vd "học" khớp mọi thứ có chữ "Tin học").
  "học", "hàng", "việc", "nghề", "nhà", "mạng", "giỏi", "tốt", "khá",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

interface ProfileEvidenceSource {
  dimension: string;
  value: string;
  tokens: string[];
  evidence_refs: string[];
}

function collectProfileSources(snapshot: DerivedProfileSnapshot): ProfileEvidenceSource[] {
  const sources: ProfileEvidenceSource[] = [];
  for (const group of ["activity_interest", "ability_skill"] as const) {
    for (const dim of snapshot.groups[group]) {
      for (const v of dim.values) {
        sources.push({
          dimension: dim.dimension,
          value: v.value,
          tokens: tokenize(v.value),
          evidence_refs: v.evidence_refs,
        });
      }
    }
  }
  return sources;
}

export interface MatchedProfileEvidence {
  dimension: string;
  value: string;
  matched_tokens: string[];
  evidence_refs: string[];
}

export interface PathwayCandidate {
  industry: string;
  /** Fit Score 0..100, chuẩn hoá từ số tín hiệu hồ sơ khớp với kỹ năng/ngành trên thị trường. */
  relevance_score: number;
  matched_profile_evidence: MatchedProfileEvidence[];
  market_evidence: MarketSignalSnapshot["industry_insights"][number];
}

export interface PathwayPortfolio {
  profile_id: string;
  generated_at: string;
  /** false = hồ sơ chưa đủ evidence để cá nhân hóa — trả về gợi ý khám phá chung, không phải top-match. */
  is_personalized: boolean;
  candidates: PathwayCandidate[];
  data_limitations: string[];
}

const MIN_PERSONALIZED_CANDIDATES = 3;
const MAX_CANDIDATES = 6;

export function matchPathways(
  snapshot: DerivedProfileSnapshot,
  market: MarketSignalSnapshot
): PathwayPortfolio {
  const profileSources = collectProfileSources(snapshot);

  const allCandidates: PathwayCandidate[] = market.industry_insights.map((ind) => {
    const corpusTokens = new Set([
      ...tokenize(ind.industry),
      ...ind.top_skills.flatMap((s) => tokenize(s.name)),
    ]);

    const matched_profile_evidence: MatchedProfileEvidence[] = [];
    let score = 0;
    for (const src of profileSources) {
      const overlap = [...new Set(src.tokens.filter((t) => corpusTokens.has(t)))];
      if (overlap.length > 0) {
        matched_profile_evidence.push({
          dimension: src.dimension,
          value: src.value,
          matched_tokens: overlap,
          evidence_refs: src.evidence_refs,
        });
        score += overlap.length;
      }
    }

    return {
      industry: ind.industry,
      relevance_score: score,
      matched_profile_evidence,
      market_evidence: ind,
    };
  });

  const maxRawScore = Math.max(...allCandidates.map((c) => c.relevance_score), 1);
  const normalizedCandidates = allCandidates.map((c) => ({
    ...c,
    relevance_score: c.relevance_score > 0 ? Math.round((c.relevance_score / maxRawScore) * 100) : 0,
  }));

  const matched = normalizedCandidates
    .filter((c) => c.relevance_score > 0)
    .sort((a, b) => b.relevance_score - a.relevance_score);

  const isPersonalized = matched.length >= MIN_PERSONALIZED_CANDIDATES;

  // Cold-start / hồ sơ ít bằng chứng: KHÔNG suy "không match" thành "không có cơ hội" (ETH-04) —
  // trả về top ngành theo posting_count như gợi ý khám phá chung, gắn cờ is_personalized=false.
  const fallback = normalizedCandidates
    .filter((c) => c.relevance_score === 0)
    .sort((a, b) => b.market_evidence.posting_count - a.market_evidence.posting_count);

  const candidates = (isPersonalized ? matched : [...matched, ...fallback]).slice(0, MAX_CANDIDATES);

  return {
    profile_id: snapshot.profile_id,
    generated_at: new Date().toISOString(),
    is_personalized: isPersonalized,
    candidates,
    data_limitations: [
      "Dữ liệu ngành hiện chỉ từ TopCV (thiên về khối văn phòng/kinh doanh/CNTT) — chưa có nguồn riêng cho tuyến học nghề/kỹ thuật (CADjob.vn hoặc ESCO), nên danh sách dưới đây CHƯA đại diện đầy đủ cho các lựa chọn học nghề.",
      "Khớp hồ sơ với ngành hiện dùng đối chiếu từ khóa (rule-based, xác định) — CHƯA có bước LLM sinh giải thích tự nhiên bằng câu văn; cần cấu hình OPENAI_API_KEY hoặc GEMINI_API_KEY để bật bước đó.",
    ],
  };
}
