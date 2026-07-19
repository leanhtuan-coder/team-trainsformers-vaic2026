"use client";

import { SectionHead } from "@/components/ui/SectionHead";
import { IconCheck } from "@/components/ui/icons";
import { m } from "framer-motion";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";

type Card = {
  title: string;
  badge?: { label: string; className: string };
  desc: string;
  checks: string[];
  cta: { label: string; className: string; href?: string };
  highlighted?: boolean;
};

const CARDS: Card[] = [
  {
    title: "Học sinh & Sinh viên",
    badge: { label: "Miễn phí", className: "bg-accent/10 text-accent-dark" },
    desc: "Tìm hướng đi phù hợp với chính mình, trước khi đặt bút chọn nguyện vọng.",
    checks: [
      "Đánh giá qua hội thoại ~5 phút",
      "Lộ trình nghề có giải thích rõ ràng",
      "Luôn kèm tuyến cao đẳng, học nghề",
    ],
    cta: { label: "Bắt đầu miễn phí", className: "bg-accent text-white hover:bg-accent-dark" },
  },
  {
    title: "Nhà trường & Trung tâm",
    badge: { label: "Phổ biến", className: "bg-brand text-white" },
    desc: "Đưa dữ liệu thị trường vào tiết hướng nghiệp, thay cho lời khuyên chung chung.",
    checks: [
      "Công cụ tư vấn cho giáo viên chủ nhiệm",
      "Bức tranh định hướng của cả lớp",
      "Dữ liệu thị trường cập nhật theo quý",
    ],
    cta: {
      label: "Liên hệ tư vấn",
      className: "bg-brand text-white hover:bg-brand-dark",
      href: "#ve-chung-toi",
    },
    highlighted: true,
  },
  {
    title: "Doanh nghiệp",
    desc: "Kết nối sớm với lực lượng lao động trẻ đang được định hướng đúng kỹ năng.",
    checks: [
      "Tiếp cận nguồn nhân lực trẻ từ sớm",
      "Tín hiệu kỹ năng theo vùng",
      "Đồng hành chương trình thực tập",
    ],
    cta: {
      label: "Liên hệ hợp tác",
      className: "border border-gray-300 text-ink hover:border-brand hover:text-brand",
      href: "#ve-chung-toi",
    },
  },
];

export function Audience({ onStart }: { onStart: () => void }) {
  return (
    <section aria-labelledby="audience-heading" className="bg-white px-6 py-20">
      <Reveal>
        <SectionHead kicker="Đối tượng sử dụng" title="Phù hợp với mọi đối tượng" />
      </Reveal>
      <StaggerGroup
        className="mx-auto mt-12 grid max-w-5xl items-start gap-6 md:grid-cols-3"
        stagger={0.14}
      >
        {CARDS.map((c) => (
          <StaggerItem
            key={c.title}
            as="article"
            whileHover={{ y: -8 }}
            className={`flex flex-col rounded-2xl bg-white p-7 ${
              c.highlighted
                ? "border-2 border-brand shadow-xl shadow-brand/10"
                : "border border-gray-200 transition-shadow hover:shadow-lg"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-ink">{c.title}</h3>
              {c.badge && (
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${c.badge.className}`}>
                  {c.badge.label}
                </span>
              )}
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{c.desc}</p>
            <ul className="mt-5 space-y-2.5">
              {c.checks.map((check) => (
                <li key={check} className="flex items-start gap-2.5 text-sm text-ink">
                  <span className="mt-0.5 text-accent-dark">
                    <IconCheck />
                  </span>
                  {check}
                </li>
              ))}
            </ul>
            {c.cta.href ? (
              <a
                href={c.cta.href}
                className={`mt-7 rounded-xl px-5 py-3 text-center text-sm font-semibold transition-colors ${c.cta.className}`}
              >
                {c.cta.label}
              </a>
            ) : (
              <m.button
                type="button"
                onClick={onStart}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`mt-7 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${c.cta.className}`}
              >
                {c.cta.label}
              </m.button>
            )}
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
