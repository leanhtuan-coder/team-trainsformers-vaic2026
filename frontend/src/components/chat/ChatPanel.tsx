"use client";

// Side-panel phỏng vấn AI — trượt từ mép phải, landing vẫn hiện sau lớp mờ.
// Kết thúc khảo sát: tạo hồ sơ trên backend Express, nộp 10 câu quickstart,
// rồi CHUYỂN HƯỚNG học sinh sang Student Portal /profile/[id] (không mở dashboard tại chỗ).

import { useEffect, useRef, useState } from "react";
import { savePortalRef, type PortalRef } from "@/lib/profile";
import { normalizeVi } from "@/lib/text";
import { LogoMark } from "@/components/ui/Compass";
import { IconX } from "@/components/ui/icons";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export interface Step {
  id: string;
  question: string;
  options?: { key: string; label: string }[];
  multi?: boolean;
  freeText?: boolean;
}

const REGION_OPTIONS = [
  { key: "Hồ Chí Minh", label: "Hồ Chí Minh" },
  { key: "Hà Nội", label: "Hà Nội" },
  { key: "Bắc Ninh", label: "Bắc Ninh" },
  { key: "Bình Dương", label: "Bình Dương" },
  { key: "Đà Nẵng", label: "Đà Nẵng" },
  { key: "Hải Phòng", label: "Hải Phòng" },
  { key: "Đồng Nai", label: "Đồng Nai" },
  { key: "Toàn quốc", label: "Tỉnh thành khác" },
];

const FLOW: Step[] = [
  { id: "name", question: "Trước tiên cho mình biết: bạn tên là gì?", freeText: true },
  {
    id: "region",
    question: "Bạn đang học / sống ở khu vực nào?",
    options: REGION_OPTIONS,
    freeText: true,
  },
  {
    id: "qs-01-object",
    question: "Câu 1. Đối tượng làm việc nào khiến bạn thấy cuốn hút nhất?",
    options: [
      { key: "Máy móc, thiết bị, xây dựng thứ gì đó bằng tay", label: "Máy móc, thiết bị, xây dựng bằng tay" },
      { key: "Con số, dữ liệu, phân tích", label: "Con số, dữ liệu, phân tích" },
      { key: "Con người: giúp đỡ, chăm sóc, dạy dỗ", label: "Con người: giúp đỡ, chăm sóc, dạy học" },
      { key: "Ý tưởng, sáng tạo, cái đẹp", label: "Ý tưởng, sáng tạo, cái đẹp" },
    ],
  },
  {
    id: "qs-02-teamrole",
    question: "Câu 2. Trong một dự án nhóm, bạn thường là người…?",
    options: [
      { key: "Đứng ra dẫn dắt, thuyết phục mọi người", label: "Đứng ra dẫn dắt, thuyết phục" },
      { key: "Lên kế hoạch, sắp xếp cho chạy trơn tru", label: "Lên kế hoạch, sắp xếp quy trình" },
      { key: "Kết nối, hòa giải, chăm lo cảm xúc nhóm", label: "Kết nối, hòa giải, chăm lo cảm xúc" },
      { key: "Giải quyết phần khó nhất về kỹ thuật/logic", label: "Giải quyết phần khó nhất về kỹ thuật/logic" },
    ],
  },
  {
    id: "qs-03-satisfaction",
    question: "Câu 3. Bạn thấy thỏa mãn nhất khi…?",
    options: [
      { key: "Sửa được một thứ hỏng / làm ra sản phẩm chạy được", label: "Sửa được đồ hỏng / làm sản phẩm chạy được" },
      { key: "Tìm ra quy luật ẩn trong mớ thông tin", label: "Tìm ra quy luật ẩn trong thông tin" },
      { key: "Thấy người khác tiến bộ/khỏe hơn nhờ mình", label: "Thấy người khác tiến bộ/khỏe hơn nhờ mình" },
      { key: "Tạo ra thứ chưa ai làm, được công nhận", label: "Tạo ra thứ chưa ai làm, được công nhận" },
    ],
  },
  {
    id: "qs-04-subject",
    question: "Câu 4. Môn học hoặc hoạt động bạn thấy dễ chịu nhất?",
    options: [
      { key: "Toán, Lý, Tin", label: "Toán, Lý, Tin học" },
      { key: "Văn, Ngoại ngữ, Sử", label: "Văn, Ngoại ngữ, Sử" },
      { key: "Sinh, Hóa", label: "Sinh học, Hóa học" },
      { key: "Mỹ thuật, Âm nhạc, sáng tạo", label: "Mỹ thuật, Âm nhạc, sáng tạo" },
    ],
  },
  {
    id: "qs-05-building",
    question: "Câu 5. Bạn thích \"xây\" thứ nào hơn?",
    options: [
      { key: "Thứ vô hình: phần mềm, hệ thống, quy trình", label: "Thứ vô hình: phần mềm, hệ thống" },
      { key: "Thứ sờ được: máy móc, công trình, sản phẩm vật lý", label: "Thứ sờ được: máy móc, công trình, vật lý" },
      { key: "Thứ thuộc về con người: trải nghiệm, bài giảng, dịch vụ", label: "Thứ thuộc về con người: trải nghiệm, dịch vụ" },
      { key: "Thứ thuộc về cái đẹp: hình ảnh, âm thanh, tác phẩm", label: "Thứ thuộc về cái đẹp: hình ảnh, âm thanh" },
    ],
  },
  {
    id: "qs-06-strength",
    question: "Câu 6. Việc nào bạn thấy mình làm tốt hơn hẳn bạn bè cùng lớp? (Chọn tối đa 2)",
    options: [
      { key: "Giải bài logic/toán khó", label: "Giải bài logic/toán khó" },
      { key: "Viết, thuyết trình, thuyết phục", label: "Viết, thuyết trình, thuyết phục" },
      { key: "Nhớ chi tiết, làm cẩn thận không sai sót", label: "Nhớ chi tiết, cẩn thận không sai sót" },
      { key: "Vẽ, thiết kế, cảm nhận thẩm mỹ", label: "Vẽ, thiết kế, cảm nhận thẩm mỹ" },
      { key: "Làm tay chân, lắp ráp, sửa chữa", label: "Làm tay chân, lắp ráp, sửa chữa" },
    ],
    multi: true,
  },
  {
    id: "qs-07-datahandling",
    question: "Câu 7. Với một bảng dữ liệu, bạn thích làm gì hơn?",
    options: [
      { key: "Kiểm tra cho khớp, đúng quy tắc, không sai sót", label: "Kiểm tra cho khớp, đúng quy tắc" },
      { key: "Tìm insight, dự đoán xu hướng từ nó", label: "Tìm insight, dự đoán xu hướng" },
      { key: "Trình bày cho người khác hiểu, kể thành câu chuyện", label: "Trình bày, kể câu chuyện dữ liệu" },
    ],
  },
  {
    id: "qs-08-environment",
    question: "Câu 8. Môi trường làm việc bạn muốn?",
    options: [
      { key: "Ngoài hiện trường, vận động, không ngồi bàn nhiều", label: "Ngoài hiện trường, vận động" },
      { key: "Văn phòng, ổn định, quy trình rõ ràng", label: "Văn phòng, ổn định, quy trình" },
      { key: "Tiếp xúc nhiều người, năng động", label: "Tiếp xúc nhiều người, năng động" },
      { key: "Tự do, linh hoạt, tự đặt nhịp", label: "Tự do, linh hoạt, tự đặt nhịp" },
    ],
  },
  {
    id: "qs-09-route",
    question: "Câu 9. Con đường nào nghe hấp dẫn hơn với bạn?",
    options: [
      { key: "Nghề ổn định, rõ lộ trình, ít biến động", label: "Nghề ổn định, rõ lộ trình, ít biến động" },
      { key: "Nghề mới, thay đổi nhanh, nhiều cơ hội đột phá", label: "Nghề mới, thay đổi nhanh, đột phá" },
      { key: "Tự làm chủ, tự do nhưng tự chịu rủi ro", label: "Tự làm chủ, tự do và chịu rủi ro" },
    ],
  },
  {
    id: "qs-10-avoid",
    question: "Câu 10. Điều gì khiến bạn thấy ngán nhất ở một công việc?",
    options: [
      { key: "Ngồi yên một chỗ, lặp đi lặp lại", label: "Ngồi yên một chỗ, lặp đi lặp lại" },
      { key: "Giao tiếp/thuyết phục người lạ liên tục", label: "Giao tiếp, thuyết phục người lạ" },
      { key: "Làm việc mơ hồ, không có đáp án đúng", label: "Làm việc mơ hồ, không có đáp án" },
      { key: "Áp lực deadline/cạnh tranh cao", label: "Áp lực deadline, cạnh tranh cao" },
    ],
  },
];

const FIELD_LABELS: { id: string; label: string }[] = [
  { id: "name", label: "Tên" },
  { id: "region", label: "Khu vực" },
  { id: "qs-01-object", label: "Q1" },
  { id: "qs-02-teamrole", label: "Q2" },
  { id: "qs-03-satisfaction", label: "Q3" },
  { id: "qs-04-subject", label: "Q4" },
  { id: "qs-05-building", label: "Q5" },
  { id: "qs-06-strength", label: "Q6" },
  { id: "qs-07-datahandling", label: "Q7" },
  { id: "qs-08-environment", label: "Q8" },
  { id: "qs-09-route", label: "Q9" },
  { id: "qs-10-avoid", label: "Q10" },
];

const MULTI_LIMITS: Record<string, number> = { "qs-06-strength": 2 };

type Message = { id: number; role: "ai" | "user"; text: string };
type Phase = "existing" | "asking" | "done";
type AnswerMap = Record<string, string | string[]>;

function matchOption(step: Step, input: string): { key: string; label: string } | null {
  if (!step.options) return null;
  const t = normalizeVi(input);
  let best: { key: string; label: string } | null = null;
  let bestScore = 0;
  for (const o of step.options) {
    const tokens = `${normalizeVi(o.label)} ${normalizeVi(o.key)}`
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3);
    const score = tokens.filter((w) => t.includes(w)).length;
    if (score > bestScore) {
      best = o;
      bestScore = score;
    }
  }
  return best;
}

function displayValue(id: string, value: string | string[]): string {
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

type Props = {
  open: boolean;
  portal: PortalRef | null;
  onClose: () => void;
  /** Gọi khi hồ sơ đã nộp thành công lên backend — parent sẽ router.push sang /profile/[id]. */
  onComplete: (profileId: string) => void;
  onRetake: () => void;
  onViewPortal: () => void;
};

export function ChatPanel({ open, portal, onClose, onComplete, onRetake, onViewPortal }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<Phase>("asking");
  const [flowIndex, setFlowIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [multiSel, setMultiSel] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);

  const startedRef = useRef(false);
  const idRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const redirectRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const nextId = () => ++idRef.current;

  const aiSay = (texts: string[], after?: () => void) => {
    setTyping(true);
    const delay = 500 + Math.random() * 200;
    timerRef.current = window.setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        ...texts.map((t) => ({ id: nextId(), role: "ai" as const, text: t })),
      ]);
      after?.();
    }, delay);
  };

  const questionFor = (step: Step, a: AnswerMap): string => {
    if (step.id === "region") {
      const name = typeof a.name === "string" && a.name ? `, ${a.name}` : "";
      return `Rất vui được gặp bạn${name}! ${step.question}`;
    }
    return step.question;
  };

  const startInterview = () => {
    setPhase("asking");
    setFlowIndex(0);
    setAnswers({});
    setMultiSel([]);
    setResultId(null);
    setMessages([
      {
        id: nextId(),
        role: "ai",
        text: `Chào bạn! Mình là La Bàn Nghề — trợ lý hướng nghiệp thông minh của bạn.`,
      },
    ]);
    aiSay(["Mình sẽ hỏi vài câu ngắn (~5 phút) để xây dựng hồ sơ thế mạnh cho bạn nhé!", FLOW[0].question]);
  };

  const showExisting = (p: PortalRef) => {
    setPhase("existing");
    setMessages([
      { id: nextId(), role: "ai", text: `Chào ${p.name}! Bạn đã có Portal cá nhân từ lần khảo sát trước.` },
      {
        id: nextId(),
        role: "ai",
        text: "Bạn có thể mở lại hồ sơ, hoặc làm lại khảo sát để tạo hồ sơ mới trên hệ thống.",
      },
    ]);
  };

  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    if (portal) {
      showExisting(portal);
    } else {
      startInterview();
    }
  }, [open, portal]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (redirectRef.current !== null) window.clearTimeout(redirectRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const finish = async (a: AnswerMap) => {
    setTyping(true);
    try {
      // 1. Tạo profile mới trên backend → nhận profile_id
      const resProfile = await fetch(`${API_BASE}/profile`, { method: "POST" });
      if (!resProfile.ok) throw new Error("Không thể tạo hồ sơ");
      const { profile_id } = await resProfile.json();

      // 2. Nộp 10 câu quickstart lên Evidence Ledger
      const answersPayload = FLOW.filter((s) => s.id.startsWith("qs-")).map((s) => ({
        question_id: s.id,
        answer: a[s.id],
      }));

      const resQuick = await fetch(`${API_BASE}/profile/${profile_id}/quickstart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersPayload }),
      });
      if (!resQuick.ok) throw new Error("Không thể nộp câu trả lời quickstart");

      // 3. Lưu con trỏ Portal vào localStorage — Navbar sẽ tự hiện nút "Hồ sơ của tôi"
      const name = typeof a.name === "string" && a.name.trim() ? a.name.trim() : "Học sinh";
      const region = typeof a.region === "string" && a.region.trim() ? a.region.trim() : "Toàn quốc";
      savePortalRef({ profile_id, name, region, completedAt: new Date().toISOString() });

      setPhase("done");
      setResultId(profile_id);
      setMessages((m) => [
        ...m,
        { id: nextId(), role: "ai", text: `Tuyệt vời ${name}! Hồ sơ của bạn đã được lưu lên hệ thống.` },
        {
          id: nextId(),
          role: "ai",
          text: "Mình đang mở Student Portal cá nhân — nơi phân tích thế mạnh, lộ trình kép và dữ liệu tuyển dụng thật dành riêng cho bạn…",
        },
      ]);

      // 4. Redirect sang Portal cá nhân /profile/[id] (không mở dashboard tại chỗ)
      redirectRef.current = window.setTimeout(() => onComplete(profile_id), 1600);
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        { id: nextId(), role: "ai", text: "Có lỗi xảy ra khi lưu hồ sơ lên hệ thống. Bạn kiểm tra backend (cổng 4000) rồi thử lại nhé!" },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const advance = (display: string, value: string | string[]) => {
    const step = FLOW[flowIndex];
    setMessages((m) => [...m, { id: nextId(), role: "user", text: display }]);
    const nextAnswers: AnswerMap = { ...answers, [step.id]: value };
    setAnswers(nextAnswers);
    setMultiSel([]);
    setInput("");
    const nextIndex = flowIndex + 1;
    if (nextIndex < FLOW.length) {
      setFlowIndex(nextIndex);
      aiSay([questionFor(FLOW[nextIndex], nextAnswers)]);
    } else {
      finish(nextAnswers);
    }
  };

  const handleQuickReply = (opt: { key: string; label: string }) => {
    if (typing || phase !== "asking") return;
    const step = FLOW[flowIndex];
    if (step.multi) {
      const limit = MULTI_LIMITS[step.id] ?? Number.POSITIVE_INFINITY;
      setMultiSel((sel) => {
        if (sel.includes(opt.key)) return sel.filter((k) => k !== opt.key);
        if (sel.length >= limit) return sel;
        return [...sel, opt.key];
      });
    } else {
      advance(opt.label, opt.key);
    }
  };

  const handleMultiDone = () => {
    if (multiSel.length === 0 || typing) return;
    const step = FLOW[flowIndex];
    const labels = multiSel.map((k) => step.options?.find((o) => o.key === k)?.label ?? k);
    advance(labels.join(", "), multiSel);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || typing || phase !== "asking") return;
    const step = FLOW[flowIndex];
    if (step.options && step.multi) {
      const matched = matchOption(step, text);
      advance(text, matched ? [matched.key] : [text]);
    } else if (step.options) {
      const matched = matchOption(step, text);
      advance(text, matched ? matched.key : text);
    } else {
      advance(text, text);
    }
  };

  const step = phase === "asking" && !typing ? FLOW[flowIndex] : null;
  const total = FLOW.length;
  const progress = phase === "done" ? 100 : Math.round((flowIndex / total) * 100);
  const collected = FIELD_LABELS.filter((f) => answers[f.id] !== undefined);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Trợ lý AI La Bàn Nghề"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
          <LogoMark className="h-10 w-10" />
          <div className="flex-1">
            <p className="font-bold text-ink">La Bàn Nghề</p>
            <p className="text-xs text-ink-soft">
              {phase === "done" ? "Đã có lộ trình cho bạn" : "Trợ lý hướng nghiệp AI thông minh"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng trợ lý"
            className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-gray-100 hover:text-ink"
          >
            <IconX />
          </button>
        </header>

        {phase !== "existing" && (
          <div className="border-b border-gray-100 px-5 py-3">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-brand">
                {phase === "done" ? "Hoàn thành ✓" : "Đang thực hiện khảo sát nhanh"}
              </span>
              <span className="tabular-nums text-ink-soft">
                {phase === "done" ? `${total}/${total}` : `Bước ${Math.min(flowIndex + 1, total)}/${total}`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {collected.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto thin-scroll">
                {collected.map((f) => (
                  <span
                    key={f.id}
                    className="max-w-[180px] truncate rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] text-brand-deep font-medium"
                  >
                    {f.label}: {displayValue(f.id, answers[f.id])}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={scrollRef} className="thin-scroll flex flex-1 flex-col gap-3 overflow-y-auto bg-brand-mist/70 px-4 py-5">
          {messages.map((m) =>
            m.role === "ai" ? (
              <div
                key={m.id}
                className="fade-up max-w-[85%] self-start rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-ink"
              >
                {m.text}
              </div>
            ) : (
              <div
                key={m.id}
                className="fade-up max-w-[85%] self-end rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm leading-relaxed text-white"
              >
                {m.text}
              </div>
            )
          )}

          {typing && (
            <div className="flex items-center gap-2 self-start rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-brand" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-brand" />
              <span className="text-xs text-ink-soft">đang phân tích dữ liệu thị trường...</span>
            </div>
          )}

          {phase === "existing" && !typing && (
            <div className="flex flex-wrap gap-2 self-start">
              <button
                type="button"
                onClick={onViewPortal}
                className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
              >
                Mở Portal của tôi →
              </button>
              <button
                type="button"
                onClick={onRetake}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
              >
                Làm lại khảo sát
              </button>
            </div>
          )}

          {phase === "done" && !typing && resultId && (
            <button
              type="button"
              onClick={() => onComplete(resultId)}
              className="fade-up self-start rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark animate-bounce"
            >
              Vào Student Portal của tôi →
            </button>
          )}
        </div>

        {phase === "asking" && (
          <div className="space-y-2.5 border-t border-gray-200 bg-white px-4 py-3.5">
            {step?.options && (
              <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto thin-scroll py-1">
                {step.options.map((o) => {
                  const selected = step.multi && multiSel.includes(o.key);
                  return (
                    <button
                      key={o.key}
                      type="button"
                      aria-pressed={step.multi ? selected : undefined}
                      onClick={() => handleQuickReply(o)}
                      className={`rounded-full border px-3.5 py-1.5 text-left text-xs font-medium transition-colors ${
                        selected
                          ? "border-brand bg-brand text-white"
                          : "border-brand/25 bg-white text-brand hover:bg-brand-light"
                      }`}
                    >
                      {o.label}
                      {selected ? " ✓" : ""}
                    </button>
                  );
                })}
                {step.multi && (
                  <button
                    type="button"
                    onClick={handleMultiDone}
                    disabled={multiSel.length === 0}
                    className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Xong ✓
                  </button>
                )}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hoặc gõ câu trả lời của bạn..."
                aria-label="Câu trả lời"
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-ink transition-colors focus:border-brand focus:outline-none"
              />
              <button
                type="submit"
                disabled={input.trim().length === 0 || typing}
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                Gửi
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
  );
}
