"use client";

import { SectionHead } from "@/components/ui/SectionHead";
import { IconChat, IconDatabase, IconRoute } from "@/components/ui/icons";
import { m } from "framer-motion";
import { META } from "@/lib/demoData";
import { fmtInt } from "@/lib/format";
import { EASE_OUT_EXPO, REVEAL_VIEWPORT } from "@/lib/animation";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";

const STEPS = [
  {
    num: "01",
    icon: IconChat,
    title: "Trò chuyện với AI",
    desc: "Kể về môn học bạn mạnh, điều bạn thích và ưu tiên của bạn — như nhắn tin với một người anh đi trước.",
  },
  {
    num: "02",
    icon: IconDatabase,
    title: "Đối chiếu thị trường",
    desc: `AI so hồ sơ của bạn với ${fmtInt(META.totalJobs)} tin tuyển dụng thật: kỹ năng nào đang cần, ở đâu, lương bao nhiêu.`,
  },
  {
    num: "03",
    icon: IconRoute,
    title: "Nhận lộ trình",
    desc: "2–3 hướng nghề kèm lý do \"vì sao hợp bạn\" và tuyến học rõ ràng: đại học, cao đẳng hoặc học nghề.",
  },
];

export function HowItWorks() {
  return (
    <section id="cach-hoat-dong" aria-labelledby="how-heading" className="px-6 py-20">
      <Reveal>
        <SectionHead kicker="Cách hoạt động" title="3 bước đến lộ trình của bạn" />
      </Reveal>
      <div className="relative mx-auto mt-14 grid max-w-5xl gap-10 md:grid-cols-3 md:gap-6">
        {/* Đường kẻ nối tự vẽ dài ra (scaleX) khi vào view */}
        <m.div
          aria-hidden="true"
          className="absolute left-[16%] right-[16%] top-7 hidden origin-left border-t-2 border-dashed border-brand/25 md:block"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={REVEAL_VIEWPORT}
          transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: 0.2 }}
        />
        {/* display:contents để StaggerGroup không phá lưới — các StaggerItem thành ô lưới trực tiếp */}
        <StaggerGroup as="div" className="contents" stagger={0.18}>
          {STEPS.map((s) => (
            <StaggerItem key={s.num} className="relative flex flex-col items-center text-center">
              <m.span
                className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl border border-brand/20 bg-white text-2xl text-brand shadow-sm"
                initial={{ scale: 0.6, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={REVEAL_VIEWPORT}
                transition={{ type: "spring", stiffness: 350, damping: 18 }}
              >
                <s.icon />
              </m.span>
              <p className="mt-4 text-3xl font-extrabold text-brand/25">{s.num}</p>
              <h3 className="mt-1 text-lg font-bold text-ink">{s.title}</h3>
              <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-ink-soft">{s.desc}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
