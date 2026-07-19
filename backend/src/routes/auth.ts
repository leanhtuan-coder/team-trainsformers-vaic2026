import { Router } from "express";
import { authenticate, createAccount, type Account } from "../auth/store.js";

const router = Router();

function publicAccount(account: Account) {
  return {
    username: account.username,
    email: account.email,
    name: account.name,
    region: account.region,
    profile_id: account.profile_id,
  };
}

router.post("/login", async (req, res) => {
  const identifier = String(req.body?.identifier || "");
  const password = String(req.body?.password || "");
  if (!identifier.trim() || !password) {
    return res.status(400).json({ error: "credentials_required" });
  }
  const account = await authenticate(identifier, password);
  if (!account) return res.status(401).json({ error: "invalid_credentials" });
  res.json(publicAccount(account));
});

router.post("/register", async (req, res) => {
  const name = String(req.body?.name || "");
  const email = String(req.body?.email || "");
  const password = String(req.body?.password || "");
  const region = String(req.body?.region || "Toàn quốc");
  if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
    return res.status(400).json({ error: "invalid_registration" });
  }
  try {
    const account = await createAccount({ name, email, password, region });
    res.status(201).json(publicAccount(account));
  } catch (error: any) {
    if (error?.message === "account_exists") {
      return res.status(409).json({ error: "account_exists" });
    }
    throw error;
  }
});

export default router;
