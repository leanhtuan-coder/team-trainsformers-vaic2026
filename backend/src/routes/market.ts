import { Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";

const router = Router();

const PROJECT_ROOT = path.resolve(import.meta.dirname, "../../..");
const DEFAULT_MARKET_SNAPSHOT_PATH = path.join(PROJECT_ROOT, "data/processed/market_signal_snapshot.json");

/** Đường dẫn tương đối trong env luôn được hiểu từ project root, không phụ thuộc cwd khi deploy. */
function marketSnapshotPath(): string {
  const configured = String(process.env.INDUSTRY_MARKET_PATH || "").trim();
  if (!configured) return DEFAULT_MARKET_SNAPSHOT_PATH;
  return path.isAbsolute(configured) ? configured : path.resolve(PROJECT_ROOT, configured);
}

let cachedSnapshot: MarketSignalSnapshot | null = null;

export interface MarketSignalSnapshot {
  industry_insights: {
    industry: string;
    posting_count: number;
    demand_share: number;
    entry_level_ratio: number;
    salary: { median_trieu: number; min_trieu: number; max_trieu: number; sample_size: number } | null;
    top_skills: { name: string; count: number }[];
    top_provinces: { name: string; count: number }[];
  }[];
  [key: string]: unknown;
}

export async function loadMarketSnapshot(): Promise<MarketSignalSnapshot> {
  if (cachedSnapshot) return cachedSnapshot;
  const sourcePath = marketSnapshotPath();
  const raw = await readFile(sourcePath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as Partial<MarketSignalSnapshot>).industry_insights)
  ) {
    throw new Error(`invalid_market_snapshot: ${sourcePath} cần có mảng industry_insights`);
  }
  cachedSnapshot = parsed as MarketSignalSnapshot;
  return cachedSnapshot!;
}

router.get("/snapshot", async (_req, res) => {
  try {
    const snapshot = await loadMarketSnapshot();
    res.json(snapshot);
  } catch {
    res.status(503).json({
      error: "market_signal_snapshot_unavailable",
      message: "Không đọc được market snapshot — kiểm tra INDUSTRY_MARKET_PATH hoặc chạy `npm run ingest`.",
    });
  }
});

export default router;
