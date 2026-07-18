"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/ui/Compass";
import {
  addAssessment,
  addEvidence,
  createBackendProfile,
  getBackendProfile,
  getQuickstartQuestions,
  hasCompletedOnboarding,
  loadPortalRef,
  savePortalRef,
  submitQuickstartAnswers,
  type EvidenceClaim,
  type QuickstartQuestion,
} from "@/lib/profile";

const PROVINCES = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre",
  "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng",
  "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai",
  "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang",
  "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng",
  "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận",
  "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị",
  "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế",
  "Tiền Giang", "TP. Hồ Chí Minh", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc",
  "Yên Bái", "Làm việc từ xa (Remote)", "Nước ngoài",
];

type Answers = Record<string, string | string[]>;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profileId, setProfileId] = useState("");
  const [questions, setQuestions] = useState<QuickstartQuestion[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [currentRegion, setCurrentRegion] = useState("");
  const [preferredRegion, setPreferredRegion] = useState("");
  const [certificates, setCertificates] = useState("");
  const [academicName, setAcademicName] = useState("GPA / điểm trung bình gần nhất");
  const [academicScore, setAcademicScore] = useState("");
  const [academicScale, setAcademicScale] = useState("10");
  const [academicNotes, setAcademicNotes] = useState("");
  const [experience, setExperience] = useState("");

  useEffect(() => {
    let alive = true;
    async function boot() {
      try {
        const url = new URL(window.location.href);
        const fromQuery = url.searchParams.get("profileId") || url.searchParams.get("profile_id") || "";
        const ref = loadPortalRef();
        const id = fromQuery || ref?.profile_id || await createBackendProfile();

        if (ref?.profile_id === id) {
          setName(ref.name || "");
          setCurrentRegion(ref.region || "");
          setPreferredRegion(ref.region || "");
        }

        const [qs, profile] = await Promise.all([
          getQuickstartQuestions(),
          getBackendProfile(id).catch(() => null),
        ]);
        if (!alive) return;

        setProfileId(id);
        setQuestions(qs);

        if (profile && hasCompletedOnboarding(profile) && !fromQuery) {
          router.replace(`/profile/${id}`);
          return;
        }
      } catch (err: any) {
        setError(err?.message || "Không khởi tạo được onboarding. Kiểm tra backend rồi thử lại.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void boot();
    return () => { alive = false; };
  }, [router]);

  const answeredCount = useMemo(() => {
    return questions.filter((q) => {
      const value = answers[q.id];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    }).length;
  }, [answers, questions]);

  const setAnswer = (question: QuickstartQuestion, value: string) => {
    if (question.type === "multi") {
      setAnswers((prev) => {
        const current = Array.isArray(prev[question.id]) ? prev[question.id] as string[] : [];
        const exists = current.includes(value);
        const next = exists ? current.filter((v) => v !== value) : [...current, value].slice(0, 2);
        return { ...prev, [question.id]: next };
      });
      return;
    }
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const buildContextClaims = (): EvidenceClaim[] => {
    const claims: EvidenceClaim[] = [];
    if (age.trim()) claims.push({ group: "context_preferences", dimension: "tuổi", value: age.trim() });
    if (gender.trim()) claims.push({ group: "context_preferences", dimension: "giới tính (không dùng để chấm điểm)", value: gender.trim() });
    if (currentRegion.trim()) claims.push({ group: "context_preferences", dimension: "nơi ở hiện tại", value: currentRegion.trim() });
    if (preferredRegion.trim()) claims.push({ group: "context_preferences", dimension: "nơi muốn học/làm việc", value: preferredRegion.trim() });
    if (name.trim()) claims.push({ group: "goals_exploration", dimension: "tên hiển thị", value: name.trim() });
    return claims;
  };

  const submit = async () => {
    if (!profileId || saving) return;
    setSaving(true);
    setError("");

    try {
      const quickstartPayload = questions
        .map((q) => ({ question_id: q.id, answer: answers[q.id] }))
        .filter((a): a is { question_id: string; answer: string | string[] } => {
          return Array.isArray(a.answer) ? a.answer.length > 0 : Boolean(a.answer);
        });

      if (quickstartPayload.length > 0) {
        await submitQuickstartAnswers(profileId, quickstartPayload);
      }

      const contextClaims = buildContextClaims();
      if (contextClaims.length > 0) {
        await addEvidence(profileId, {
          source_type: "self_report",
          source_ref: "onboarding-basic-info",
          confidence: "medium",
          claims: contextClaims,
        });
      }

      if (certificates.trim()) {
        await addEvidence(profileId, {
          source_type: "document",
          source_ref: "onboarding-certificates",
          confidence: "high",
          claims: [{ group: "ability_skill", dimension: "chứng chỉ/kỹ năng đã có", value: certificates.trim() }],
        });
      }

      const score = Number(academicScore);
      const scale = Number(academicScale);
      if (academicName.trim() && Number.isFinite(score) && Number.isFinite(scale) && scale > 0) {
        await addAssessment(profileId, {
          name: academicName.trim(),
          provider: "Hồ sơ học thuật tự khai",
          score,
          scale_max: scale,
          taken_at: new Date().toISOString(),
          claims: academicNotes.trim()
            ? [{ group: "ability_skill", dimension: "ghi chú học thuật", value: academicNotes.trim() }]
            : undefined,
        });
      } else if (academicNotes.trim()) {
        await addEvidence(profileId, {
          source_type: "document",
          source_ref: "onboarding-academic-notes",
          confidence: "medium",
          claims: [{ group: "ability_skill", dimension: "hồ sơ học thuật", value: academicNotes.trim() }],
        });
      }

      if (experience.trim()) {
        await addEvidence(profileId, {
          source_type: "document",
          source_ref: "onboarding-experience",
          confidence: "high",
          claims: [{ group: "activity_interest", dimension: "trải nghiệm/dự án đã làm", value: experience.trim() }],
        });
      }

      savePortalRef({
        profile_id: profileId,
        name: name.trim() || "Học sinh",
        region: preferredRegion.trim() || currentRegion.trim() || "Toàn quốc",
        completedAt: new Date().toISOString(),
      });
      router.push(`/profile/${profileId}?tab=roadmap`);
    } catch (err: any) {
      setError(err?.message || "Không lưu được hồ sơ. Kiểm tra backend rồi thử lại nhé.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f2ec] px-6 text-center">
        <div>
          <LogoMark className="mx-auto h-14 w-14 animate-pulse" />
          <p className="mt-4 font-semibold text-[#1f1e1c]">Đang chuẩn bị hồ sơ onboarding…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f2ec] px-4 py-8 text-[#1f1e1c]">
      <section className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center gap-3">
          <LogoMark className="h-11 w-11" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Định hướng nghề nghiệp</h1>
            <p className="text-sm text-[#6b6a64]">3 bước ngắn để tạo Evidence Ledger đầu tiên của bạn.</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#e3e1d8] bg-[#faf9f5] p-4 shadow-xl shadow-black/5 md:p-6">
          <div className="mb-6 grid gap-2 md:grid-cols-3">
            {["1. Về bạn", "2. Câu hỏi", "3. Hồ sơ"].map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(i + 1)}
                className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                  step === i + 1 ? "border-[#2f6fb0] bg-[#e6f1fb] text-[#0c447c]" : "border-[#e3e1d8] bg-white text-[#6b6a64] hover:bg-[#f4f2ec]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">Cùng làm quen nhé</h2>
                <p className="text-sm text-[#6b6a64]">Các thông tin này giúp cá nhân hóa lộ trình. Giới tính không tham gia chấm điểm/matching.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tên hiển thị">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Minh Khoa" className={inputCls} />
                </Field>
                <Field label="Tuổi">
                  <input value={age} onChange={(e) => setAge(e.target.value)} type="number" min="10" max="80" placeholder="18" className={inputCls} />
                </Field>
                <Field label="Giới tính">
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
                    <option value="">Không muốn tiết lộ</option>
                    <option>Nữ</option>
                    <option>Nam</option>
                    <option>Khác</option>
                  </select>
                </Field>
                <Field label="Nơi ở hiện tại">
                  <select value={currentRegion} onChange={(e) => setCurrentRegion(e.target.value)} className={inputCls}>
                    <option value="">Chọn tỉnh/thành</option>
                    {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Nơi muốn học/làm việc">
                  <select value={preferredRegion} onChange={(e) => setPreferredRegion(e.target.value)} className={inputCls}>
                    <option value="">Chọn tỉnh/thành</option>
                    {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
              </div>
              <StepActions step={step} setStep={setStep} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">Chia sẻ điều khiến bạn hứng thú</h2>
                <p className="text-sm text-[#6b6a64]">
                  Đã trả lời {answeredCount}/{questions.length}. Không có đáp án đúng/sai; bạn có thể bỏ qua câu chưa chắc.
                </p>
              </div>
              <div className="grid gap-4">
                {questions.map((q) => (
                  <QuestionBlock key={q.id} question={q} value={answers[q.id]} onChange={setAnswer} />
                ))}
              </div>
              <StepActions step={step} setStep={setStep} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">Bổ sung hồ sơ học thuật & trải nghiệm</h2>
                <p className="text-sm text-[#6b6a64]">Không bắt buộc, nhưng bằng chứng có nguồn sẽ làm dashboard đáng tin hơn.</p>
              </div>
              <div className="grid gap-4">
                <div className="rounded-2xl border border-dashed border-[#cfcdc2] bg-white p-4">
                  <h3 className="font-bold">Chứng chỉ / kỹ năng</h3>
                  <textarea value={certificates} onChange={(e) => setCertificates(e.target.value)} placeholder="VD: IELTS 7.0, MOS Excel, Python cơ bản, giải học sinh giỏi…" className={`${inputCls} mt-2 min-h-[82px]`} />
                </div>

                <div className="rounded-2xl border border-dashed border-[#cfcdc2] bg-white p-4">
                  <h3 className="font-bold">Hồ sơ học thuật</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <input value={academicName} onChange={(e) => setAcademicName(e.target.value)} placeholder="Tên kết quả" className={inputCls} />
                    <input value={academicScore} onChange={(e) => setAcademicScore(e.target.value)} type="number" step="any" placeholder="Điểm" className={inputCls} />
                    <input value={academicScale} onChange={(e) => setAcademicScale(e.target.value)} type="number" step="any" placeholder="Thang điểm" className={inputCls} />
                  </div>
                  <textarea value={academicNotes} onChange={(e) => setAcademicNotes(e.target.value)} placeholder="Môn mạnh, ngành đang học, GPA từng kỳ, giải thưởng học thuật…" className={`${inputCls} mt-3 min-h-[70px]`} />
                </div>

                <div className="rounded-2xl border border-dashed border-[#cfcdc2] bg-white p-4">
                  <h3 className="font-bold">Trải nghiệm / dự án</h3>
                  <textarea value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="VD: làm web bán hàng, CLB truyền thông, thực tập, phụ việc gia đình, dự án khoa học…" className={`${inputCls} mt-2 min-h-[92px]`} />
                </div>
              </div>

              {answeredCount < 3 && (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Bạn mới trả lời {answeredCount} câu. Vẫn có thể gửi, nhưng Holland Code sẽ cần thêm dữ liệu để đáng tin hơn.
                </p>
              )}

              <div className="flex flex-wrap justify-between gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)} className={secondaryBtn}>← Quay lại</button>
                <button type="button" onClick={submit} disabled={saving} className={`${primaryBtn} min-w-[170px]`}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu…</> : "Gửi hồ sơ →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

const inputCls = "w-full rounded-xl border border-[#e3e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#2f6fb0] focus:ring-4 focus:ring-[#e6f1fb]";
const primaryBtn = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#2f6fb0] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#245f98] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryBtn = "inline-flex items-center justify-center rounded-xl border border-[#cfcdc2] bg-white px-5 py-2.5 text-sm font-bold text-[#1f1e1c] transition hover:bg-[#f4f2ec]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-[#6b6a64]">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function StepActions({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  return (
    <div className={`flex pt-2 ${step === 1 ? "justify-end" : "justify-between"}`}>
      {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className={secondaryBtn}>← Quay lại</button>}
      <button type="button" onClick={() => setStep(step + 1)} className={primaryBtn}>Tiếp tục →</button>
    </div>
  );
}

function QuestionBlock({
  question,
  value,
  onChange,
}: {
  question: QuickstartQuestion;
  value: string | string[] | undefined;
  onChange: (question: QuickstartQuestion, value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-[#e3e1d8] bg-white p-4">
      <h3 className="text-sm font-bold text-[#1f1e1c]">{question.text}</h3>
      {question.type === "text" ? (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(question, e.target.value)}
          className={`${inputCls} mt-3 min-h-[70px]`}
          placeholder="Nhập câu trả lời ngắn…"
        />
      ) : (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {question.options?.map((opt) => {
            const selected = Array.isArray(value) ? value.includes(opt) : value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(question, opt)}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  selected ? "border-[#2f6fb0] bg-[#e6f1fb] font-semibold text-[#0c447c]" : "border-[#e3e1d8] bg-[#faf9f5] text-[#1f1e1c] hover:bg-[#f4f2ec]"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
      {question.type === "multi" && <p className="mt-2 text-xs text-[#8a8981]">Chọn tối đa 2 lựa chọn.</p>}
    </section>
  );
}
