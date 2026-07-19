"use client";

import { SectionHead } from "@/components/ui/SectionHead";
import { IconBranch, IconBulb, IconDatabase } from "@/components/ui/icons";
import { m } from "framer-motion";
import { REVEAL_VIEWPORT, slideLeft, slideRight, staggerContainer } from "@/lib/animation";
import { Reveal } from "@/components/ui/motion";

const JOB_CARD_SKILLS = ["Java", "React", "SQL", "Docker"];

const chipGroup = staggerContainer(0.08, 0.3);
const chipItem = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 16 } },
};

export function Features() {
  return (
    <section id="tinh-nang" aria-labelledby="features-heading" className="bg-white px-6 py-20">
      <Reveal>
        <SectionHead
          kicker="Tính năng"
          title="Khác biệt ở điều gì?"
          sub="Ba giá trị lõi có mặt ở mọi màn hình — từ dashboard tới từng gợi ý nghề."
        />
      </Reveal>
      <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-2">
        {/* Ô lớn trái */}
        <m.article
          className="flex flex-col rounded-2xl border border-brand/15 bg-gradient-to-br from-brand-light/70 to-white p-8"
          variants={slideLeft}
          initial="hidden"
          whileInView="visible"
          viewport={REVEAL_VIEWPORT}
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-2xl text-white">
            <IconDatabase />
          </span>
          <h3 className="mt-5 text-xl font-bold text-ink">Bám dữ liệu thật</h3>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
            Mỗi gợi ý đều truy được về tin tuyển dụng thật: kỹ năng doanh nghiệp yêu cầu, mức lương
            đang trả, nhu cầu theo vùng. Đây là một tin trong dữ liệu của chúng tôi:
          </p>
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-ink">Kỹ sư Phần mềm</p>
              <m.span
                className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={REVEAL_VIEWPORT}
                transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.35 }}
              >
                89%
              </m.span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-brand">22.000.000đ – 45.000.000đ/tháng</p>
            <m.div
              className="mt-3 flex flex-wrap gap-2"
              variants={chipGroup}
              initial="hidden"
              whileInView="visible"
              viewport={REVEAL_VIEWPORT}
            >
              {JOB_CARD_SKILLS.map((s) => (
                <m.span
                  key={s}
                  variants={chipItem}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-ink-soft"
                >
                  {s}
                </m.span>
              ))}
            </m.div>
          </div>
        </m.article>

        {/* Cột phải — 2 ô */}
        <m.div
          className="grid gap-6"
          variants={staggerContainer(0.15)}
          initial="hidden"
          whileInView="visible"
          viewport={REVEAL_VIEWPORT}
        >
          <m.article
            variants={slideRight}
            whileHover={{ y: -6 }}
            className="rounded-2xl border border-gray-200 bg-white p-8 transition-shadow hover:shadow-lg"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-light text-2xl text-brand">
              <IconBulb />
            </span>
            <h3 className="mt-5 text-xl font-bold text-ink">Giải thích được</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
              Không hộp đen. Mỗi định hướng đi kèm câu &ldquo;vì sao hợp bạn&rdquo; và chip bằng chứng
              từ dữ liệu — đủ rõ để bạn thuyết phục cả bố mẹ.
            </p>
          </m.article>
          <m.article
            variants={slideRight}
            whileHover={{ y: -6 }}
            className="rounded-2xl border border-gray-200 bg-white p-8 transition-shadow hover:shadow-lg"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-light text-2xl text-brand">
              <IconBranch />
            </span>
            <h3 className="mt-5 text-xl font-bold text-ink">Mở rộng cơ hội</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
              Nhiều hướng đi thay vì một đáp án: luôn có tuyến đại học, cao đẳng và học nghề. Mọi kết
              quả là gợi ý tham khảo — quyết định thuộc về bạn.
            </p>
          </m.article>
        </m.div>
      </div>
    </section>
  );
}
