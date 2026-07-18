import { Router } from "express";
import { randomUUID } from "node:crypto";
import { QUICKSTART_QUESTIONS } from "../profile/quickstart.js";
import { buildSnapshot } from "../profile/snapshot.js";
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
router.get("/:id", async (req, res) => {
  const profile = await loadProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "profile_not_found" });
  res.json({ snapshot: buildSnapshot(profile), evidence: profile.evidence });
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

/** Placeholder cho AI phỏng vấn (LangGraph agent — Đức Minh phụ trách trong 48h). */
router.post("/:id/interview", (_req, res) => {
  res.status(501).json({
    error: "not_implemented",
    message:
      "AI phỏng vấn chưa triển khai — cần LangGraph agent + LLM key. Contract dự kiến: POST body {message}, response {reply, extracted_evidence: Evidence[] (source_type: interaction, user_confirmed: false — cần user xác nhận trước khi vào snapshot)}.",
  });
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
