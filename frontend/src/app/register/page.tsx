"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/ui/Compass";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { linkSessionToProfile } from "@/lib/linkProfile";

const REGIONS = [
  "Hồ Chí Minh",
  "Hà Nội",
  "Bắc Ninh",
  "Bình Dương",
  "Đà Nẵng",
  "Hải Phòng",
  "Đồng Nai",
  "Toàn quốc",
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState("Hồ Chí Minh");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!isSupabaseConfigured) {
      setError("Chưa cấu hình Supabase — điền NEXT_PUBLIC_SUPABASE_URL/ANON_KEY trong .env.local.");
      return;
    }
    const supabase = getSupabase()!;
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim(), region },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) {
        const msg = signUpError.message || "";
        setError(
          /already registered|already exists/i.test(msg)
            ? "Email này đã có tài khoản. Hãy đăng nhập."
            : /at least 6/i.test(msg)
            ? "Mật khẩu cần tối thiểu 6 ký tự."
            : msg || "Đăng ký thất bại. Vui lòng thử lại."
        );
        return;
      }

      if (data.session && data.user) {
        // Email confirmation TẮT → đã có phiên, vào Portal luôn.
        const profileId = await linkSessionToProfile(supabase, data.user, {
          name: name.trim(),
          region,
        });
        router.push(`/profile/${profileId}`);
      } else {
        // Email confirmation BẬT → chờ user xác nhận qua email.
        setInfo(`Đã gửi email xác nhận tới ${email.trim()}. Xác nhận xong rồi đăng nhập nhé.`);
      }
    } catch (err: any) {
      setError(err?.message || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-[#111827]">
      {/* Top Navbar */}
      <nav className="h-16 md:h-20 px-6 md:px-8 flex items-center flex-shrink-0 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark className="w-9 h-9" />
          <span className="font-bold text-lg text-[#005c6d]">CareerRadar</span>
        </Link>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center max-w-[1400px] mx-auto w-full px-6 md:px-8 lg:px-16 gap-10 lg:gap-24 xl:gap-32 pb-12">
        
        {/* Left Column — Form */}
        <div className="w-full max-w-[400px] xl:max-w-[440px] flex flex-col justify-center flex-shrink-0 mt-8 lg:mt-0">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#111827] tracking-tight leading-tight mb-3">
            Đăng ký<br />tài khoản
          </h1>
          <p className="text-base text-gray-500 mb-8">
            Bắt đầu định hình lộ trình tương lai bằng dữ liệu thật
          </p>

          {error && (
            <div className="p-3.5 rounded-xl text-sm font-medium mb-5 bg-red-50 text-red-600 border border-red-100">
              {error}
            </div>
          )}

          {info && (
            <div className="p-3.5 rounded-xl text-sm font-medium mb-5 bg-emerald-50 text-emerald-700 border border-emerald-100">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 mb-2">
              Họ và tên *
            </label>
            <input
              className="w-full h-12 px-4 bg-white border-2 border-gray-100 rounded-xl focus:border-[#005c6d] focus:outline-none transition shadow-sm mb-4 text-sm text-[#111827] placeholder:text-gray-300"
              type="text"
              placeholder="VD: Nguyễn Minh Khoa"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            <label className="text-sm font-semibold text-gray-600 mb-2">
              Email *
            </label>
            <input
              className="w-full h-12 px-4 bg-white border-2 border-gray-100 rounded-xl focus:border-[#005c6d] focus:outline-none transition shadow-sm mb-4 text-sm text-[#111827] placeholder:text-gray-300"
              type="email"
              placeholder="ten@vi-du.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className="text-sm font-semibold text-gray-600 mb-2">
              Khu vực sinh sống / học tập
            </label>
            <select
              className="w-full h-12 px-4 bg-white border-2 border-gray-100 rounded-xl focus:border-[#005c6d] focus:outline-none transition shadow-sm mb-4 text-sm text-[#111827]"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <label className="text-sm font-semibold text-gray-600 mb-2">
              Mật khẩu *
            </label>
            <div className="relative mb-6">
              <input
                className="w-full h-12 px-4 pr-11 bg-white border-2 border-gray-100 rounded-xl focus:border-[#005c6d] focus:outline-none transition shadow-sm text-sm text-[#111827] placeholder:text-gray-300"
                type={showPassword ? "text" : "password"}
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim() || !email.trim() || !password}
              className="w-full h-12 bg-[#005c6d] hover:bg-[#004b58] text-white font-semibold rounded-full transition mb-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#005c6d]/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Đăng ký miễn phí"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">Hoặc tiếp tục với</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Social — Google login thật qua Supabase Auth */}
          <GoogleLoginButton label="Đăng ký với Google" disabled={loading} />

          {/* Footer */}
          <p className="mt-8 text-sm text-center text-gray-500">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-[#005c6d] font-semibold hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>

        {/* Right Column — Tilted Product Illustration */}
        <div className="hidden lg:flex w-full max-w-xl relative items-center justify-center py-8">
          <div className="absolute inset-[-10%] bg-gradient-to-br from-[#005c6d]/[0.07] via-blue-500/[0.04] to-emerald-500/[0.05] rounded-[2rem] transform -rotate-3 scale-105" />

          {/* Mock Dashboard Card */}
          <div className="relative bg-white border border-gray-100 shadow-2xl rounded-2xl w-full aspect-[4/3] p-5 transform rotate-2 hover:rotate-0 transition duration-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="h-2 w-24 bg-gray-100 rounded-full" />
            </div>

            <div className="flex gap-4 h-[calc(100%-2rem)]">
              {/* Sidebar */}
              <div className="w-1/4 flex flex-col gap-2.5">
                {[0.7, 0.5, 0.8, 0.4, 0.6].map((w, i) => (
                  <div key={i} className="h-2 rounded-full bg-gray-100" style={{ width: `${w * 100}%` }} />
                ))}
                <div className="mt-auto flex flex-col gap-2">
                  <div className="h-6 rounded-lg bg-[#005c6d]/10 border border-[#005c6d]/20" />
                </div>
              </div>

              {/* Main content — Kanban */}
              <div className="flex-1 flex gap-3">
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-2 w-12 bg-gray-200 rounded-full mb-1" />
                  <div className="flex-1 rounded-lg bg-gray-50 p-2 flex flex-col gap-2">
                    <div className="bg-white rounded-md p-2 shadow-sm border border-gray-100">
                      <div className="h-1.5 w-3/4 bg-gray-200 rounded mb-2" />
                      <div className="h-1.5 w-1/2 bg-gray-100 rounded mb-2" />
                      <div className="flex gap-1">
                        <div className="h-3.5 w-8 rounded-full bg-teal-50 border border-teal-100" />
                        <div className="h-3.5 w-6 rounded-full bg-emerald-50 border border-emerald-100" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
