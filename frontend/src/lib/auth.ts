import { API_BASE } from "@/lib/profile";

export interface AuthAccount {
  username: string;
  email: string;
  name: string;
  region: string;
  profile_id: string;
}

async function authRequest(path: string, body: Record<string, string>): Promise<AuthAccount> {
  const response = await fetch(`${API_BASE}/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `auth_error_${response.status}`);
  return data as AuthAccount;
}

export function loginAccount(identifier: string, password: string): Promise<AuthAccount> {
  return authRequest("/login", { identifier, password });
}

export function registerAccount(input: {
  name: string;
  email: string;
  password: string;
  region: string;
}): Promise<AuthAccount> {
  return authRequest("/register", input);
}

export function friendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "invalid_credentials") return "Tên đăng nhập hoặc mật khẩu không đúng.";
  if (message === "account_exists") return "Email này đã có tài khoản. Hãy đăng nhập.";
  if (message === "invalid_registration") return "Thông tin đăng ký chưa hợp lệ. Mật khẩu cần tối thiểu 6 ký tự.";
  if (/Failed to fetch|NetworkError|auth_error_0/.test(message)) {
    return "Không kết nối được backend. Hãy chạy npm run dev:backend rồi thử lại.";
  }
  return "Không thể xác thực tài khoản. Vui lòng thử lại.";
}
