"use client";

// Side-panel phỏng vấn AI — trượt từ mép phải, landing vẫn hiện sau lớp mờ.
// Kết thúc khảo sát: tạo hồ sơ trên backend Express, nộp 6 câu tự do (Chặng 1 — user-jouney.docx,
// chấm RIASEC bằng AI ở backend), rồi CHUYỂN HƯỚNG học sinh sang Student Portal /profile/[id].

import { useEffect, useRef, useState } from "react";
import { savePortalRef, type PortalRef } from "@/lib/profile";
import { LogoMark } from "@/components/ui/Compass";
import { IconX } from "@/components/ui/icons";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export interface Step {
  id: string;
  question: string;
  options?: { key: string; label: string }[];
  placeholder?: string;
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

// 6 câu hỏi tự do (Chặng 1 — user-jouney.docx). Id phải khớp backend/src/profile/quickstart.ts
// — mỗi câu chấm RIASEC bằng LLM (gpt-oss-120b) ở backend, không còn chip chọn đáp án.
const RIASEC_STEPS: Step[] = [
  {
    id: "q1-interest",
    question: "Câu 1. Việc gì khiến bạn quên cả thời gian?",
    placeholder: "Ví dụ: mình có thể ngồi cả buổi mày mò sửa máy tính mà không thấy chán…",
  },
  {
    id: "q2-aptitude",
    question: "Câu 2. Điều gì bạn làm dễ mà người khác thấy khó?",
    placeholder: "Ví dụ: mình nhớ số liệu rất nhanh, bạn bè phải ghi chép còn mình thì không…",
  },
  {
    id: "q3-value",
    question: "Câu 3. Công việc phải có gì bạn mới thấy đáng làm?",
    placeholder: "Ví dụ: phải giúp được người khác, hoặc phải thấy mình tiến bộ mỗi ngày…",
  },
  {
    id: "q4-environment",
    question: "Câu 4. Bạn làm tốt nhất khi một mình / nhóm / dẫn dắt?",
    placeholder: "Ví dụ: mình làm tốt nhất khi được tự do làm một mình, ít bị ngắt quãng…",
  },
  {
    id: "q5-trait",
    question: "Câu 5. Gặp vấn đề khó, bước đầu tiên bạn làm gì?",
    placeholder: "Ví dụ: mình thường thử ngay bằng tay, sai thì sửa, ít khi lên kế hoạch trước…",
  },
  {
    id: "q6-aspiration",
    question: "Câu 6. 5 năm nữa muốn được nhìn nhận là ai?",
    placeholder: "Ví dụ: một chuyên gia giỏi trong lĩnh vực của mình, được mọi người tin tưởng…",
  },
];

const FLOW: Step[] = [
  { id: "name", question: "Trước tiên cho mình biết: bạn tên là gì?" },
  { id: "region", question: "Bạn đang học / sống ở khu vực nào?", options: REGION_OPTIONS },
  ...RIASEC_STEPS,
];

const FIELD_LABELS: { id: string; label: string }[] = [
  { id: "name", label: "Tên" },
  { id: "region", label: "Khu vực" },
  { id: "q1-interest", label: "Q1" },
  { id: "q2-aptitude", label: "Q2" },
  { id: "q3-value", label: "Q3" },
  { id: "q4-environment", label: "Q4" },
  { id: "q5-trait", label: "Q5" },
  { id: "q6-aspiration", label: "Q6" },
];

type Message = { id: number; role: "ai" | "user"; text: string };
type Phase = "existing" | "asking" | "done";
type AnswerMap = Record<string, string>;

function matchOption(step: Step, input: string): { key: string; label: string } | null {
  if (!step.options) return null;
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const t = norm(input);
  let best: { key: string; label: string } | null = null;
  let bestScore = 0;
  for (const o of step.options) {
    const tokens = `${norm(o.label)} ${norm(o.key)}`.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
    const score = tokens.filter((w) => t.includes(w)).length;
    if (score > bestScore) {
      best = o;
      bestScore = score;
    }
  }
  return best;
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
    setResultId(null);
    setMessages([
      {
        id: nextId(),
        role: "ai",
        text: `Chào bạn! Mình là La Bàn Nghề — trợ lý hướng nghiệp thông minh của bạn.`,
      },
    ]);
    aiSay(["Mình sẽ hỏi 6 câu ngắn (~5 phút) để hiểu bạn hơn — trả lời tự do bằng lời của bạn nhé!", FLOW[0].question]);
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

      // 2. Nộp 6 câu tự do lên Evidence Ledger — backend chấm RIASEC bằng AI
      const answersPayload = RIASEC_STEPS.map((s) => ({ question_id: s.id, answer: a[s.id] || "" }));

      const resQuick = await fetch(`${API_BASE}/profile/${profile_id}/quickstart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersPayload }),
      });
      if (!resQuick.ok) throw new Error("Không thể nộp câu trả lời quickstart");

      const name = typeof a.name === "string" && a.name.trim() ? a.name.trim() : "Học sinh";
      const region = typeof a.region === "string" && a.region.trim() ? a.region.trim() : "Toàn quốc";

      // 3. Nộp Tên và Khu vực lên Evidence Ledger của Backend
      await fetch(`${API_BASE}/profile/${profile_id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: "self_report",
          source_ref: "quickstart-interview",
          confidence: "high",
          claims: [
            { group: "goals_exploration", dimension: "tên", value: name },
            { group: "context_preferences", dimension: "vùng miền mong muốn làm việc", value: region }
          ]
        })
      });

      // 4. Lưu con trỏ Portal vào localStorage — Navbar sẽ tự hiện nút "Hồ sơ của tôi"
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

      // 5. Redirect sang Portal cá nhân /profile/[id] (không mở dashboard tại chỗ)
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

  const advance = (display: string, value: string) => {
    const step = FLOW[flowIndex];
    setMessages((m) => [...m, { id: nextId(), role: "user", text: display }]);
    const nextAnswers: AnswerMap = { ...answers, [step.id]: value };
    setAnswers(nextAnswers);
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
    advance(opt.label, opt.key);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || typing || phase !== "asking") return;
    const step = FLOW[flowIndex];
    if (step.options) {
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
                    {f.label}: {answers[f.id]}
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
                {step.options.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => handleQuickReply(o)}
                    className="rounded-full border border-brand/25 bg-white px-3.5 py-1.5 text-left text-xs font-medium text-brand transition-colors hover:bg-brand-light"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={step && !step.options ? step.placeholder || "Trả lời tự do..." : "Hoặc gõ câu trả lời của bạn..."}
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
