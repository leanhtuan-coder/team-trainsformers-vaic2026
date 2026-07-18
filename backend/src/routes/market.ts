import { Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";

const router = Router();

const PROCESSED_DIR = path.resolve(import.meta.dirname, "../../../data/processed");

let cachedSnapshot: MarketSignalSnapshot | null = null;

export interface MarketSignalSnapshot {
  industry_insights: {
    industry: string;
    posting_count: number;
    demand_share: number;
    entry_level_ratio: number;
    salary: { median_trieu: number; sample_size: number } | null;
    top_skills: { name: string; count: number }[];
    top_provinces: { name: string; count: number }[];
  }[];
  [key: string]: unknown;
}

export async function loadMarketSnapshot(): Promise<MarketSignalSnapshot> {
  if (cachedSnapshot) return cachedSnapshot;
  const raw = await readFile(path.join(PROCESSED_DIR, "market_signal_snapshot.json"), "utf-8");
  cachedSnapshot = JSON.parse(raw);
  return cachedSnapshot!;
}

router.get("/snapshot", async (_req, res) => {
  try {
    const snapshot = await loadMarketSnapshot();
    res.json(snapshot);
  } catch {
    res.status(503).json({
      error: "market_signal_snapshot_unavailable",
      message: "Chưa có data/processed/market_signal_snapshot.json — chạy `npm run ingest` trước.",
    });
  }
});

export default router;
