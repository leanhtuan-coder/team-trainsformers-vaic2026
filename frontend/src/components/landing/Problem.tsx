import { SectionHead } from "@/components/ui/SectionHead";
import { IconGradCap, IconUnlink, IconWrench } from "@/components/ui/icons";

const PROBLEMS = [
  {
    icon: IconGradCap,
    title: "Học xong thất nghiệp",
    desc: "Chọn ngành theo phong trào, theo lời khuyên chung chung — đến khi ra trường mới phát hiện thị trường không còn cần vị trí đó.",
  },
  {
    icon: IconWrench,
    title: "Thừa thầy thiếu thợ",
    desc: "Ai cũng dồn vào vài ngành đại học \"hot\", trong khi doanh nghiệp đỏ mắt tìm kỹ thuật viên lành nghề với thu nhập không hề thấp.",
  },
  {
    icon: IconUnlink,
    title: "Không ai kết nối",
    desc: "Dữ liệu tuyển dụng có thật ngoài kia, nhưng chưa ai dịch nó thành lời khuyên mà một học sinh 17 tuổi đọc hiểu được.",
  },
];

export function Problem() {
  return (
    <section aria-labelledby="problem-heading" className="bg-brand-light/60 px-6 py-20">
      <SectionHead
        kicker="Vấn đề"
        title="Chọn nghề theo cảm tính — cái giá quá đắt"
        sub="Ba khoảng trống khiến hàng loạt quyết định nghề nghiệp bắt đầu sai từ vạch xuất phát."
      />
      <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
        {PROBLEMS.map((p) => (
          <article
            key={p.title}
            className="rounded-2xl border border-gray-200 bg-white p-7 transition-shadow hover:shadow-lg"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-light text-2xl text-brand">
              <p.icon />
            </span>
            <h3 className="mt-5 text-lg font-bold text-ink">{p.title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{p.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
