import "dotenv/config";
import express from "express";
import cors from "cors";
import marketRouter from "./routes/market.js";
import profileRouter from "./routes/profile.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/market", marketRouter);
app.use("/api/profile", profileRouter);

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
