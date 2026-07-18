import { SectionHead } from "@/components/ui/SectionHead";
import { IconBranch, IconBulb, IconDatabase } from "@/components/ui/icons";

const JOB_CARD_SKILLS = ["Java", "React", "SQL", "Docker"];

export function Features() {
  return (
    <section id="tinh-nang" aria-labelledby="features-heading" className="bg-white px-6 py-20">
      <SectionHead
        kicker="Tính năng"
        title="Khác biệt ở điều gì?"
        sub="Ba giá trị lõi có mặt ở mọi màn hình — từ dashboard tới từng gợi ý nghề."
      />
      <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-2">
        {/* Ô lớn trái: Bám dữ liệu thật + mini job-card minh hoạ */}
        <article className="flex flex-col rounded-2xl border border-brand/15 bg-gradient-to-br from-brand-light/70 to-white p-8">
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
              <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">89%</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-brand">22.000.000đ – 45.000.000đ/tháng</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {JOB_CARD_SKILLS.map((s) => (
                <span key={s} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-ink-soft">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </article>

        <div className="grid gap-6">
          <article className="rounded-2xl border border-gray-200 bg-white p-8 transition-shadow hover:shadow-lg">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-light text-2xl text-brand">
              <IconBulb />
            </span>
            <h3 className="mt-5 text-xl font-bold text-ink">Giải thích được</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
              Không hộp đen. Mỗi định hướng đi kèm câu &ldquo;vì sao hợp bạn&rdquo; và chip bằng chứng
              từ dữ liệu — đủ rõ để bạn thuyết phục cả bố mẹ.
            </p>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-white p-8 transition-shadow hover:shadow-lg">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-light text-2xl text-brand">
              <IconBranch />
            </span>
            <h3 className="mt-5 text-xl font-bold text-ink">Mở rộng cơ hội</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
              Nhiều hướng đi thay vì một đáp án: luôn có tuyến đại học, cao đẳng và học nghề. Mọi kết
              quả là gợi ý tham khảo — quyết định thuộc về bạn.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
