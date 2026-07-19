"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { m } from "framer-motion";
import { LogoMark } from "@/components/ui/Compass";
import { loadPortalRef, type PortalRef } from "@/lib/profile";
import { EASE_OUT_EXPO } from "@/lib/animation";
import { ScrollProgress } from "@/components/ui/motion";

const LINKS = [
  { label: "Tổng quan", href: "#tong-quan" },
  { label: "Dữ liệu thị trường", href: "#dashboard" },
  { label: "Tính năng", href: "#tinh-nang" },
  { label: "Về chúng tôi", href: "#ve-chung-toi" },
];

export function Navbar({ onStart }: { onStart: () => void }) {
  // Đọc localStorage sau mount để tránh lệch SSR/CSR — có hồ sơ thì hiện nút vào Portal.
  const [portal, setPortal] = useState<PortalRef | null>(null);
  useEffect(() => {
    setPortal(loadPortalRef());
  }, []);

  return (
    <m.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/80 backdrop-blur"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <a href="#tong-quan" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[15px] font-bold text-ink">CareerRadar</span>
        </a>
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-brand"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-ink-soft hover:text-brand transition-colors px-3 py-2"
          >
            Đăng nhập
          </Link>
          {portal ? (
            <Link
              href={`/profile/${portal.profile_id}`}
              className="rounded-xl border border-brand/30 bg-brand-light px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
            >
              Hồ sơ của tôi
            </Link>
          ) : (
            <m.button
              type="button"
              onClick={onStart}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Bắt đầu ngay →
            </m.button>
          )}
        </div>
      </div>
      <ScrollProgress />
    </m.header>
  );
}
