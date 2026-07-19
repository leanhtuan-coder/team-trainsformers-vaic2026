import "dotenv/config";
import express from "express";
import cors from "cors";
import marketRouter from "./routes/market.js";
import profileRouter from "./routes/profile.js";
import authRouter from "./routes/auth.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/market", marketRouter);
app.use("/api/profile", profileRouter);
app.use("/api/auth", authRouter);

// Express 5 tự forward lỗi async (throw trong route handler) tới đây — trả JSON gọn thay vì
// trang lỗi mặc định. supabase_not_configured (thiếu env) là lỗi cấu hình dev, không phải lỗi user.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[unhandled]", err);
  const message = err instanceof Error ? err.message : "internal_error";
  res.status(500).json({ error: "internal_error", message });
});

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
