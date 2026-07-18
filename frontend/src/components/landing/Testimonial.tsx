import { SectionHead } from "@/components/ui/SectionHead";
import { IconStar } from "@/components/ui/icons";

export function Testimonial() {
  return (
    <section aria-labelledby="testimonial-heading" className="px-6 py-20">
      <SectionHead kicker="Học sinh nói gì" title="Một lộ trình đủ rõ để tự tin nói về tương lai" />
      <figure className="relative mx-auto mt-12 max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm md:p-10">
        <span className="absolute right-5 top-5 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-ink-soft/60">
          Kịch bản minh hoạ
        </span>
        <div className="flex gap-1 text-lg text-amber-400" aria-label="Đánh giá 5 trên 5 sao">
          {[1, 2, 3, 4, 5].map((i) => (
            <IconStar key={i} />
          ))}
        </div>
        <blockquote className="mt-5 text-lg leading-relaxed text-ink">
          &ldquo;Nhà em không khá giả, La Bàn Nghề chỉ cho em đường ngắn mà vẫn thu nhập ổn định —
          kèm lý do rõ ràng để em thuyết phục bố mẹ. Lần đầu tiên em thấy tự tin khi nói về tương lai
          của mình.&rdquo;
        </blockquote>
        <figcaption className="mt-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand text-lg font-bold text-white">
            M
          </span>
          <div>
            <p className="font-semibold text-ink">Nguyễn Thanh Minh</p>
            <p className="text-sm text-ink-soft">Học sinh lớp 12</p>
          </div>
        </figcaption>
      </figure>
    </section>
  );
}
