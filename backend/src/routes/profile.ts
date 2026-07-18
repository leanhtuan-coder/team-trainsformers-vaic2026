import { Router } from "express";
import { randomUUID } from "node:crypto";
import { QUICKSTART_QUESTIONS } from "../profile/quickstart.js";
import { buildSnapshot } from "../profile/snapshot.js";
import { scoreRiasec } from "../profile/riasec.js";
import type { AssessmentDetail, Evidence, Profile } from "../profile/schema.js";
import { loadProfile, saveProfile } from "../profile/store.js";
import { matchPathways } from "../matching/engine.js";
import { loadMarketSnapshot } from "./market.js";

const router = Router();

/** Bộ câu quickstart — frontend hiển thị từng câu một, không phải form tĩnh. */
router.get("/quickstart", (_req, res) => {
  res.json({ questions: QUICKSTART_QUESTIONS });
});

/** Tạo hồ sơ mới (File A rỗng — chưa có evidence nào). */
router.post("/", async (_req, res) => {
  const profile: Profile = {
    profile_id: randomUUID(),
    created_at: new Date().toISOString(),
    evidence: [],
  };
  await saveProfile(profile);
  res.status(201).json({ profile_id: profile.profile_id });
});

/** Nộp câu trả lời quickstart — mỗi câu trả lời thành 1 evidence self_report. */
router.post("/:id/quickstart", async (req, res) => {
  const profile = await loadProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "profile_not_found" });

  const answers: { question_id: string; answer: string | string[] }[] = req.body?.answers;
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "answers_required", message: "Body cần { answers: [{question_id, answer}] }" });
  }

  const created: string[] = [];
  for (const { question_id, answer } of answers) {
    const question = QUICKSTART_QUESTIONS.find((q) => q.id === question_id);
    if (!question) continue;
    const values = Array.isArray(answer) ? answer : [answer];
    const evidence: Evidence = {
      evidence_id: randomUUID(),
      source_type: "self_report",
      source_ref: question.id,
      claims: values
        .filter((v) => typeof v === "string" && v.trim())
        .map((v) => ({ group: question.group, dimension: question.dimension, value: v.trim() })),
      confidence: "medium",
      collected_at: new Date().toISOString(),
      user_confirmed: true,
    };
    if (evidence.claims.length === 0) continue;
    profile.evidence.push(evidence);
    created.push(evidence.evidence_id);
  }

  await saveProfile(profile);
  res.json({ created_evidence: created, snapshot: buildSnapshot(profile) });
});

/** Ghi kết quả bài test/quiz có nguồn: điểm, thang điểm, top % (nếu có), tên bài, nguồn. */
router.post("/:id/assessment", async (req, res) => {
  const profile = await loadProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "profile_not_found" });

  const d: AssessmentDetail & { claims?: Evidence["claims"] } = req.body;
  if (!d?.name || !d?.provider || typeof d.score !== "number" || typeof d.scale_max !== "number") {
    return res.status(400).json({
      error: "invalid_assessment",
      message: "Cần { name, provider, score, scale_max, percentile_top?, taken_at?, claims? }",
    });
  }

  const evidence: Evidence = {
    evidence_id: randomUUID(),
    source_type: "assessment",
    source_ref: `${d.provider} — ${d.name}`,
    claims: d.claims ?? [],
    assessment_detail: {
      name: d.name,
      provider: d.provider,
      score: d.score,
      scale_max: d.scale_max,
      percentile_top: d.percentile_top,
      taken_at: d.taken_at,
    },
    confidence: "high",
    collected_at: new Date().toISOString(),
    user_confirmed: true,
  };
  profile.evidence.push(evidence);
  await saveProfile(profile);
  res.json({ evidence_id: evidence.evidence_id, snapshot: buildSnapshot(profile) });
});

/** Đọc hồ sơ: Derived Profile Snapshot (tính lại từ ledger) + toàn bộ evidence để truy vết. */
/** Ghi bằng chứng tự do vào Evidence Ledger: thông tin nền, chứng chỉ mô tả bằng chữ, trải nghiệm, sở thích mới.
 *  Endpoint này giữ nguyên nguyên tắc append-only: không sửa/xóa evidence cũ, chỉ thêm evidence mới đã được user xác nhận. */
router.post("/:id/evidence", async (req, res) => {
  const profile = await loadProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "profile_not_found" });

  const allowedSources = new Set(["self_report", "document", "interaction", "ai_inference"]);
  const allowedGroups = new Set(["ability_skill", "activity_interest", "work_values", "goals_exploration", "context_preferences"]);
  const sourceType = String(req.body?.source_type || "self_report");
  const sourceRef = String(req.body?.source_ref || "manual-entry").trim();
  const confidence = String(req.body?.confidence || "medium");
  const claims = Array.isArray(req.body?.claims) ? req.body.claims : [];

  if (!allowedSources.has(sourceType)) {
    return res.status(400).json({ error: "invalid_source_type" });
  }
  if (!["low", "medium", "high"].includes(confidence)) {
    return res.status(400).json({ error: "invalid_confidence" });
  }

  const cleanClaims = claims
    .map((c: any) => ({
      group: String(c?.group || "").trim(),
      dimension: String(c?.dimension || "").trim(),
      value: String(c?.value || "").trim(),
    }))
    .filter((c: any) => allowedGroups.has(c.group) && c.dimension && c.value);

  if (cleanClaims.length === 0) {
    return res.status(400).json({
      error: "claims_required",
      message: "Body cần { claims: [{ group, dimension, value }] } hợp lệ.",
    });
  }

  const evidence: Evidence = {
    evidence_id: randomUUID(),
    source_type: sourceType as Evidence["source_type"],
    source_ref: sourceRef || "manual-entry",
    claims: cleanClaims as Evidence["claims"],
    confidence: confidence as Evidence["confidence"],
    collected_at: new Date().toISOString(),
    user_confirmed: req.body?.user_confirmed !== false,
  };

  profile.evidence.push(evidence);
  await saveProfile(profile);
  res.status(201).json({ evidence_id: evidence.evidence_id, snapshot: buildSnapshot(profile) });
});

router.get("/:id", async (req, res) => {
  const profile = await loadProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "profile_not_found" });
  res.json({ snapshot: buildSnapshot(profile), evidence: profile.evidence });
});

/** Holland Code (RIASEC) — deterministic, tính từ Evidence Ledger (xem profile/riasec.ts). */
router.get("/:id/riasec", async (req, res) => {
  const profile = await loadProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "profile_not_found" });
  res.json(scoreRiasec(profile));
});

/** Câu phá hoà (E1.3): user chọn 1 nhóm RIASEC để chốt khi 2 nhóm sát điểm.
 *  Ghi 1 evidence 'interaction' (weight 1.2) rồi trả về snapshot RIASEC mới. */
router.post("/:id/riasec/tiebreak", async (req, res) => {
  const profile = await loadProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "profile_not_found" });

  const letter = String(req.body?.letter || "").toUpperCase();
  if (!["R", "I", "A", "S", "E", "C"].includes(letter)) {
    return res.status(400).json({ error: "invalid_letter", message: "letter phải là một trong R/I/A/S/E/C" });
  }

  profile.evidence.push({
    evidence_id: randomUUID(),
    source_type: "interaction", // hành vi phá hoà — trọng số 1.2
    source_ref: "riasec-tiebreak",
    claims: [{ group: "activity_interest", dimension: "phá hoà RIASEC", value: letter }],
    confidence: "medium",
    collected_at: new Date().toISOString(),
    user_confirmed: true,
  });
  await saveProfile(profile);
  res.json(scoreRiasec(profile));
});

/** Pathway Portfolio (Slice C, bước rule-based — xem backend/src/matching/engine.ts). */
router.get("/:id/pathways", async (req, res) => {
  const profile = await loadProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "profile_not_found" });

  try {
    const market = await loadMarketSnapshot();
    const portfolio = matchPathways(buildSnapshot(profile), market);
    res.json(portfolio);
  } catch {
    res.status(503).json({
      error: "market_signal_snapshot_unavailable",
      message: "Chưa có data/processed/market_signal_snapshot.json — chạy `npm run ingest` trước.",
    });
  }
});

/** AI phỏng vấn / Chat tư vấn hướng nghiệp kết nối NVIDIA NIM (Llama 3.1 70B). */
router.post("/:id/interview", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "missing_message" });
  }

  const profile = await loadProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "profile_not_found" });

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "api_key_missing",
      message: "Chưa cấu hình NVIDIA_API_KEY ở backend."
    });
  }

  try {
    const riasecResult = scoreRiasec(profile);
    const market = await loadMarketSnapshot();
    const portfolio = matchPathways(buildSnapshot(profile), market);
    const topCareers = portfolio.candidates.slice(0, 3).map(c => 
      `- Ngành: ${c.industry} (Khớp: ${c.relevance_score}%), Lương: ${c.market_evidence.salary ? c.market_evidence.salary.median_trieu + ' triệu/tháng' : 'Thỏa thuận'}, Số tin tuyển: ${c.market_evidence.posting_count}`
    ).join("\n");

    const systemPrompt = `Bạn là La Bàn — trợ lý hướng nghiệp AI thông minh được phát triển bởi dự án CareerRadar.
Nhiệm vụ của bạn là tư vấn hướng nghiệp sâu sắc, thực tế, thân thiện cho học sinh trung học Việt Nam dựa trên hồ sơ năng lực của họ.

Thông tin học sinh hiện tại:
- Tên: ${profile.snapshot?.name || "Học sinh"}
- Vùng miền mong muốn làm việc: ${profile.snapshot?.preferred_location || "Toàn quốc"}
- Holland Code (RIASEC): ${riasecResult.holland_code || "Chưa có đủ dữ liệu"}
- Top 3 ngành nghề phù hợp nhất dựa trên phân tích dữ liệu thị trường thực tế:
${topCareers}

Hãy trò chuyện trực tiếp với học sinh. 
Yêu cầu:
1. Hãy trả lời ngắn gọn, cô đọng, thực tế, đầy đủ thông tin hữu ích (không sáo rỗng, tối đa 3-4 câu/đoạn).
2. Xưng hô là "Mình" hoặc "La Bàn" và gọi học sinh là "bạn" hoặc bằng tên của họ nếu biết.
3. Sử dụng tiếng Việt tự nhiên, động viên, chuyên nghiệp.
4. Đưa ra các gợi ý cụ thể về kỹ năng cần học, trường đào tạo, cao đẳng hoặc trung cấp nghề phù hợp ở Việt Nam.`;

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.5,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("NVIDIA NIM Error:", errText);
      throw new Error("nvidia_api_failed");
    }

    const result = await response.json();
    const reply = result.choices?.[0]?.message?.content || "Mình chưa thể trả lời câu hỏi này lúc này. Bạn thử hỏi câu khác nhé!";
    res.json({ reply });
  } catch (err) {
    console.error("Lỗi gọi AI interview:", err);
    res.status(500).json({ error: "ai_service_error", message: "Đã xảy ra lỗi khi kết nối với AI." });
  }
});

/** Placeholder cho trích xuất tài liệu user tải lên (cần LLM). */
router.post("/:id/document", (_req, res) => {
  res.status(501).json({
    error: "not_implemented",
    message:
      "Trích xuất tài liệu chưa triển khai — cần LLM. Contract dự kiến: upload text/file → candidate evidence (source_type: document, user_confirmed: false) → user preview/sửa/xác nhận từng claim rồi mới vào snapshot (ETH-11).",
  });
});

export default router;
