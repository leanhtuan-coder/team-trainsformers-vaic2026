import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProfile, saveProfile } from "../profile/store.js";

export interface Account {
  username: string;
  email: string;
  name: string;
  region: string;
  password_salt: string;
  password_hash: string;
  profile_id: string;
  created_at: string;
}

const ACCOUNT_PATH = fileURLToPath(new URL("../../../data/accounts/accounts.json", import.meta.url));
const SEEDED_ACCOUNTS: Account[] = [
  {
    username: "minhnd",
    email: "minhnd@careerradar.vn",
    name: "Minh ND",
    region: "Hà Nội",
    password_salt: "careerradar-minhnd-v1",
    password_hash: "358e128dcf84db865db01040e5cc5b136f241c581ab8fa4a497fe3e50e97ca2b9ff86fa28a2f648e97d235708c5246d373d841118608d98a63008898531e297e",
    profile_id: "5a7f8c18-895b-4fb2-8711-10fe93afc326",
    created_at: "2026-07-19T00:00:00.000Z",
  },
  {
    // Tài khoản demo cho ban giám khảo VAIC 2026 — luôn được tự tạo lại nếu thiếu
    // (kể cả sau khi filesystem tạm thời của Render bị reset), để judge luôn đăng nhập được.
    username: "giamkhao",
    email: "giamkhao@careerradar.vn",
    name: "Ban Giám Khảo",
    region: "Toàn quốc",
    password_salt: "careerradar-giamkhao-v1",
    password_hash: "131ca4e2c3c724d52d2a821d72ec302d6d41887ee0137bd038ed127271d54ec1a17f38b260ab6e864a9bb71b639fdd8914b73c4c0bf8840d896cee19fa0e27a8",
    profile_id: "34263f3e-5bc3-4189-8acb-725203df0e61",
    created_at: "2026-07-19T00:00:00.000Z",
  },
];

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function passwordMatches(account: Account, password: string): boolean {
  const expected = Buffer.from(account.password_hash, "hex");
  const actual = Buffer.from(hashPassword(password, account.password_salt), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function readAccounts(): Promise<Account[]> {
  let accounts: Account[] = [];
  try {
    accounts = JSON.parse(await readFile(ACCOUNT_PATH, "utf8")) as Account[];
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }
  const missingSeeds = SEEDED_ACCOUNTS.filter(
    (seed) => !accounts.some((account) => account.username === seed.username)
  );
  if (missingSeeds.length > 0) {
    accounts.push(...missingSeeds);
    await writeAccounts(accounts);
  }
  return accounts;
}

async function writeAccounts(accounts: Account[]): Promise<void> {
  await mkdir(dirname(ACCOUNT_PATH), { recursive: true });
  await writeFile(ACCOUNT_PATH, JSON.stringify(accounts, null, 2), "utf8");
}

async function ensureProfile(account: Account): Promise<void> {
  if (await loadProfile(account.profile_id)) return;
  await saveProfile({
    profile_id: account.profile_id,
    created_at: account.created_at,
    evidence: [],
  });
}

export async function authenticate(identifier: string, password: string): Promise<Account | null> {
  const normalized = identifier.trim().toLowerCase();
  const account = (await readAccounts()).find(
    (candidate) => candidate.username === normalized || candidate.email === normalized
  );
  if (!account || !passwordMatches(account, password)) return null;
  await ensureProfile(account);
  return account;
}

export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
  region: string;
}): Promise<Account> {
  const email = input.email.trim().toLowerCase();
  const accounts = await readAccounts();
  if (accounts.some((account) => account.email === email)) throw new Error("account_exists");

  const base = email.split("@")[0].replace(/[^a-z0-9._-]/g, "") || "user";
  let username = base;
  let suffix = 2;
  while (accounts.some((account) => account.username === username)) username = `${base}${suffix++}`;

  const salt = randomBytes(16).toString("hex");
  const account: Account = {
    username,
    email,
    name: input.name.trim(),
    region: input.region.trim() || "Toàn quốc",
    password_salt: salt,
    password_hash: hashPassword(input.password, salt),
    profile_id: randomUUID(),
    created_at: new Date().toISOString(),
  };
  accounts.push(account);
  await writeAccounts(accounts);
  await ensureProfile(account);
  return account;
}
