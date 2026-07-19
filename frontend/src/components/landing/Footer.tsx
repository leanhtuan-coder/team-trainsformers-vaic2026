"use client";

import { m } from "framer-motion";
import { LogoMark } from "@/components/ui/Compass";
import { REVEAL_VIEWPORT, fadeIn } from "@/lib/animation";

const COLUMNS = [
  {
    heading: "Sản phẩm",
    links: [
      { label: "Tính năng", href: "#tinh-nang" },
      { label: "Dữ liệu thị trường", href: "#dashboard" },
      { label: "Lộ trình học", href: "#dashboard" },
      { label: "Trợ lý AI", href: "#tong-quan" },
    ],
  },
  {
    heading: "Công ty",
    links: [
      { label: "Về chúng tôi", href: "#ve-chung-toi" },
      { label: "Blog", href: "#" },
      { label: "Tuyển dụng", href: "#" },
      { label: "VAIC 2026", href: "#" },
    ],
  },
  {
    heading: "Pháp lý",
    links: [
      { label: "Điều khoản", href: "#" },
      { label: "Bảo mật", href: "#" },
      { label: "Cookie", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <m.footer
      id="ve-chung-toi"
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={REVEAL_VIEWPORT}
      className="bg-brand-deep px-6 py-14 text-white/80"
    >
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-bold text-white">CareerRadar</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            La Bàn Nghề — trợ lý AI hướng nghiệp bằng dữ liệu thật cho học sinh, sinh viên Việt Nam.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <p className="text-sm font-bold uppercase tracking-wider text-white">{col.heading}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm transition-colors hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/60">
        <p>© 2026 · TrainSformers × VEX Technology Solutions</p>
        <p>Được xây dựng tại VAIC 2026 · Hà Nội, Việt Nam</p>
      </div>
    </m.footer>
  );
}
