import { SectionHead } from "@/components/ui/SectionHead";
import { IconChevronDown } from "@/components/ui/icons";
import { META } from "@/lib/demoData";
import { fmtInt } from "@/lib/format";

export function Faq({ totalJobs }: { totalJobs?: number }) {
  const faqs = [
    {
      q: "Dữ liệu lấy từ đâu?",
      a: `Tổng hợp và làm sạch từ ${fmtInt(totalJobs ?? META.totalJobs)}+ tin tuyển dụng công khai. Bản demo chạy trên snapshot dữ liệu; pipeline được thiết kế để cập nhật theo quý.`,
    },
    {
      q: "AI có thay thầy cô hướng nghiệp không?",
      a: "Không. La Bàn Nghề là công cụ hỗ trợ để buổi tư vấn có dữ liệu hơn — quyết định cuối cùng luôn thuộc về học sinh, gia đình và thầy cô.",
    },
    {
      q: "Có gợi ý cả học nghề không?",
      a: "Có. Mọi định hướng đều kèm tuyến cao đẳng / học nghề và đường liên thông — đại học không phải con đường duy nhất.",
    },
    {
      q: "Thông tin của em có riêng tư không?",
      a: "Trong bản demo, toàn bộ câu trả lời được lưu cục bộ ngay trên máy của em, không gửi đi bất cứ đâu.",
    },
  ];

  return (
    <section aria-labelledby="faq-heading" className="px-6 py-20">
      <SectionHead kicker="Câu hỏi thường gặp" title="Bạn có thể thắc mắc" />
      <div className="mx-auto mt-10 max-w-3xl space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="faq group rounded-2xl border border-gray-200 bg-white px-6 py-5">
            <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-ink">
              {f.q}
              <span className="shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180">
                <IconChevronDown />
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
