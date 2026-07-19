# Landing Page Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp landing page (`src/app/page.tsx`) lên mức animation "trình diễn" — scroll-reveal có nhịp, parallax, stagger, số đếm tăng dần — bằng Framer Motion, giữ hiệu năng và accessibility.

**Architecture:** Một lớp nền tảng dùng chung (`src/lib/animation.ts` tokens/variants + `src/components/ui/motion.tsx` primitives bọc Framer Motion qua LazyMotion), rồi áp "biên đạo" cho từng section landing. Portal, auth, ChatPanel, và nội bộ `MarketCharts` KHÔNG đụng tới.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · framer-motion@^11 (LazyMotion strict, `m` components).

## Global Constraints

Mọi task đều phải tuân (giá trị lấy nguyên văn từ spec `docs/superpowers/specs/2026-07-18-landing-animations-design.md`):

- Toàn bộ UI **tiếng Việt**; desktop-first, **không vỡ layout ở 1280px**.
- Chỉ animate **transform + opacity** — không đụng width/height/top/left/margin/padding/font-size/filter.
- Mọi scroll-reveal chạy **1 lần** (`once: true`) — không re-trigger khi cuộn ngược.
- Tôn trọng `prefers-reduced-motion`: qua `MotionConfig reducedMotion="user"` + `useReducedMotion()` cho parallax/count-up.
- **LazyMotion `strict`** — chỉ dùng `m.*`, KHÔNG dùng `motion.*` (strict mode throw runtime nếu vi phạm).
- Chỉ thêm **1 dependency mới**: `framer-motion@^11` (đã duyệt, nới ràng buộc "no new deps" của WEBSITE_SPEC).
- Giữ nguyên nội dung/copy hiện có của mỗi section — chỉ thêm chuyển động, không đổi chữ, số, hay cấu trúc dữ liệu (trừ TrustStat: đổi mảng STATS sang mang số thô cho CountUp).
- KHÔNG đụng: `MarketCharts` nội bộ · `ChatPanel` · `/profile/[id]` · `/login` `/register` `/auth/callback` · keyframes trong `globals.css`.
- Gate bắt buộc trước khi coi là xong: `npm run typecheck` sạch + `npm run build` sạch.

## Verification model (đọc trước khi bắt đầu)

Repo **không có test runner** (package.json chỉ có `dev`/`build`/`start`/`typecheck`), và đây là công việc thuần thị giác — unit test cho parallax/scroll-reveal sẽ giả tạo và giòn. Vì vậy "test cycle" của mỗi task là:

1. `npm run typecheck` → phải sạch (0 error).
2. **Kiểm tra thị giác trong browser thật** ở ≥1280px (dev server chạy từ Task 3): làm đúng các bước mô tả trong task, quan sát hiệu ứng nêu ra.
3. `npm run build` ở các mốc (Task 3 và Task 9) → phải sạch.
4. Commit.

Task 1 và 2 là hạ tầng (chưa render gì) → chỉ typecheck + commit.

---

## File Structure

**Tạo mới:**
- `src/lib/animation.ts` — tokens (easing/duration/viewport) + variants dùng chung. Pure, không JSX.
- `src/components/ui/motion.tsx` — primitives client: `MotionProvider`, `Reveal`, `StaggerGroup`, `StaggerItem`, `Parallax`, `CountUp`, `ScrollProgress`.

**Sửa:**
- `package.json` — thêm framer-motion.
- `src/app/page.tsx` — bọc `MotionProvider`, reveal cho khối "Dashboard preview".
- `src/components/landing/{Navbar,Hero,TrustStat,Problem,HowItWorks,Features,Testimonial,Audience,Faq,CtaBand,Footer}.tsx` — áp biên đạo.

---

### Task 1: Animation tokens & variants (`src/lib/animation.ts`)

**Files:**
- Modify: `package.json`
- Create: `src/lib/animation.ts`

**Interfaces:**
- Produces:
  - `EASE_OUT_EXPO: [number, number, number, number]`
  - `DURATION: { fast: number; normal: number; slow: number }`
  - `REVEAL_VIEWPORT` — `{ once: true; margin: "0px 0px -80px 0px" }`
  - `fadeUp, fadeIn, scaleIn, slideLeft, slideRight, staggerItem, popIn: Variants`
  - `staggerContainer(stagger?: number, delayChildren?: number): Variants`

- [ ] **Step 1: Cài framer-motion**

Run: `npm install framer-motion@^11`
Expected: `package.json` dependencies có `"framer-motion": "^11.x"`, cập nhật `package-lock.json`, không lỗi.

- [ ] **Step 2: Tạo `src/lib/animation.ts`**

```ts
// Tokens + variants animation dùng chung cho landing page (Framer Motion).
// Chỉ animate transform + opacity. Easing khớp cubic-bezier CSS hiện có (.grow-bar / .fade-up).

import type { Variants } from "framer-motion";

// Kiểu tuple tường minh để Framer nhận là cubic-bezier hợp lệ (tránh lỗi readonly khi as const).
export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const DURATION = { fast: 0.35, normal: 0.6, slow: 0.9 } as const;

/** Viewport mặc định cho scroll-reveal: chạy 1 lần, nổ khi phần tử vào khung ~80px. */
export const REVEAL_VIEWPORT = { once: true, margin: "0px 0px -80px 0px" } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.normal, ease: EASE_OUT_EXPO } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.normal, ease: EASE_OUT_EXPO } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURATION.normal, ease: EASE_OUT_EXPO } },
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.normal, ease: EASE_OUT_EXPO } },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.normal, ease: EASE_OUT_EXPO } },
};

/** Container điều phối stagger cho các con dùng variant kế thừa (hidden/visible). */
export function staggerContainer(stagger = 0.12, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  };
}

export const staggerItem: Variants = fadeUp;

/** Pop kiểu spring cho badge %, sao đánh giá. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 15 } },
};
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS, 0 error.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/animation.ts
git commit -m "feat(landing): add framer-motion + animation tokens"
```

---

### Task 2: Motion primitives (`src/components/ui/motion.tsx`)

**Files:**
- Create: `src/components/ui/motion.tsx`

**Interfaces:**
- Consumes (Task 1): `fadeUp`, `staggerContainer`, `staggerItem`, `REVEAL_VIEWPORT` từ `@/lib/animation`; `fmtInt` từ `@/lib/format`.
- Produces (component API dùng ở mọi task sau):
  - `MotionProvider({ children })`
  - `Reveal({ children, variant?, delay?, as?, className? })`
  - `StaggerGroup({ children, stagger?, delay?, as?, className? })`
  - `StaggerItem({ children, variant?, as?, className?, whileHover? })`
  - `Parallax({ children, offset?, className? })`
  - `CountUp({ to, suffix?, duration?, format? })`
  - `ScrollProgress()`
  - `type MotionTag` — `"div"|"section"|"article"|"ul"|"li"|"span"|"header"|"footer"|"figure"`

- [ ] **Step 1: Tạo `src/components/ui/motion.tsx`**

```tsx
"use client";

// Primitives animation cho landing page — bọc Framer Motion (LazyMotion strict, chỉ transform/opacity).
// Tôn trọng prefers-reduced-motion: MotionConfig reducedMotion="user" + useReducedMotion() cho parallax/count-up.

import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  LazyMotion,
  domAnimation,
  MotionConfig,
  m,
  animate,
  useScroll,
  useTransform,
  useInView,
  useReducedMotion,
  type Variants,
  type TargetAndTransition,
} from "framer-motion";
import { fadeUp, staggerContainer, staggerItem, REVEAL_VIEWPORT } from "@/lib/animation";
import { fmtInt } from "@/lib/format";

// Bảng thẻ đa hình — giữ HTML ngữ nghĩa (section/article/li…) mà vẫn là motion component.
const MOTION_TAGS = {
  div: m.div, section: m.section, article: m.article, ul: m.ul, li: m.li,
  span: m.span, header: m.header, footer: m.footer, figure: m.figure,
} as const;
export type MotionTag = keyof typeof MOTION_TAGS;

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

export function Reveal({
  children,
  variant = fadeUp,
  delay = 0,
  as = "div",
  className,
}: {
  children: ReactNode;
  variant?: Variants;
  delay?: number;
  as?: MotionTag;
  className?: string;
}) {
  // Cast về m.div: mọi thẻ chia sẻ các prop ta dùng (className/variants/initial/whileInView/viewport/transition).
  const Tag = MOTION_TAGS[as] as typeof m.div;
  return (
    <Tag
      className={className}
      variants={variant}
      initial="hidden"
      whileInView="visible"
      viewport={REVEAL_VIEWPORT}
      transition={{ delay }}
    >
      {children}
    </Tag>
  );
}

export function StaggerGroup({
  children,
  stagger = 0.12,
  delay = 0,
  as = "div",
  className,
}: {
  children: ReactNode;
  stagger?: number;
  delay?: number;
  as?: MotionTag;
  className?: string;
}) {
  const Tag = MOTION_TAGS[as] as typeof m.div;
  return (
    <Tag
      className={className}
      variants={staggerContainer(stagger, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={REVEAL_VIEWPORT}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({
  children,
  variant = staggerItem,
  as = "div",
  className,
  whileHover,
}: {
  children: ReactNode;
  variant?: Variants;
  as?: MotionTag;
  className?: string;
  whileHover?: TargetAndTransition;
}) {
  // KHÔNG set initial/whileInView ở đây — kế thừa "hidden"/"visible" từ StaggerGroup cha.
  const Tag = MOTION_TAGS[as] as typeof m.div;
  return (
    <Tag className={className} variants={variant} whileHover={whileHover}>
      {children}
    </Tag>
  );
}

export function Parallax({
  children,
  offset = 60,
  className,
}: {
  children: ReactNode;
  offset?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [offset, -offset]);
  return (
    <m.div ref={ref} style={{ y }} className={className}>
      {children}
    </m.div>
  );
}

export function CountUp({
  to,
  suffix = "",
  duration = 1.6,
  format = fmtInt,
}: {
  to: number;
  suffix?: string;
  duration?: number;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(() => format(reduce ? to : 0));

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(format(to));
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(format(Math.round(v))),
    });
    return () => controls.stop();
  }, [inView, to, duration, reduce, format]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <m.div
      aria-hidden="true"
      style={{ scaleX: scrollYProgress }}
      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-brand to-accent"
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS, 0 error.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/motion.tsx
git commit -m "feat(landing): add framer-motion primitives (Reveal/Stagger/Parallax/CountUp/ScrollProgress)"
```

---

### Task 3: Wire MotionProvider + Navbar entrance + ScrollProgress + dashboard reveal

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/landing/Navbar.tsx`

**Interfaces:**
- Consumes: `MotionProvider`, `Reveal`, `ScrollProgress` từ `@/components/ui/motion`; `scaleIn`, `EASE_OUT_EXPO` từ `@/lib/animation`.

- [ ] **Step 1: Bọc `MotionProvider` + reveal khối dashboard trong `src/app/page.tsx`**

Thêm 2 import (sau các import hiện có):

```tsx
import { MotionProvider, Reveal } from "@/components/ui/motion";
import { scaleIn } from "@/lib/animation";
```

Thay toàn bộ khối `return (...)` (hiện từ `<>` tới `</>`) bằng:

```tsx
  return (
    <MotionProvider>
      <Navbar onStart={openChat} />
      <main>
        <Hero onStart={openChat} />

        {/* Dashboard thị trường CHUNG (công khai) — dữ liệu thật từ GET /api/market/snapshot */}
        <section
          id="dashboard"
          aria-labelledby="dashboard-heading"
          className="scroll-mt-20 px-4 pb-20 md:px-6"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal className="mb-7 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand">
                Dữ liệu thị trường · Tương tác trực tiếp
              </p>
              <h2 id="dashboard-heading" className="mt-3 text-3xl font-extrabold text-ink md:text-4xl">
                Khám phá thị trường việc làm hôm nay
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-ink-soft">
                Lọc theo vùng và khối ngành — tổng hợp từ tin tuyển dụng thật trên toàn quốc.
              </p>
            </Reveal>
            <Reveal
              variant={scaleIn}
              className="relative rounded-3xl border border-gray-200 bg-white p-4 shadow-2xl shadow-brand-deep/10 md:p-6"
            >
              <MarketCharts onStart={openChat} />
            </Reveal>
          </div>
        </section>

        <TrustStat />
        <Problem />
        <HowItWorks />
        <Features />
        <Testimonial />
        <Audience onStart={openChat} />
        <Faq />
        <CtaBand onStart={openChat} />
      </main>
      <Footer />
      <ChatPanel
        key={`${retakeCount}-${portal ? portal.profile_id : "new"}`}
        open={chatOpen}
        portal={portal}
        onClose={() => setChatOpen(false)}
        onComplete={handleComplete}
        onRetake={handleRetake}
        onViewPortal={handleViewPortal}
      />
    </MotionProvider>
  );
```

- [ ] **Step 2: Thay `src/components/landing/Navbar.tsx` (thêm entrance + ScrollProgress)**

Ghi đè toàn bộ file:

```tsx
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
              Bắt đầu miễn phí →
            </m.button>
          )}
        </div>
      </div>
      <ScrollProgress />
    </m.header>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS, 0 error.

- [ ] **Step 4: Khởi động dev server (giữ chạy cho các task sau)**

Run: `npm run dev` (chạy nền, mở `http://localhost:3000`).

- [ ] **Step 5: Kiểm tra thị giác**

Mở `http://localhost:3000` ở cửa sổ ≥1280px:
- Navbar **trượt xuống + mờ dần** khi load.
- Cuộn trang: **thanh gradient teal→xanh lá** ở mép dưới navbar chạy dài theo tiến độ cuộn.
- Khối "Khám phá thị trường việc làm hôm nay": tiêu đề fade-up, khung chart scale-in khi cuộn tới.
- Console không có lỗi Framer strict-mode (nếu lỗi "motion is not allowed in strict mode" → có chỗ dùng `motion.*` thay vì `m.*`).

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: PASS, không lỗi.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/components/landing/Navbar.tsx
git commit -m "feat(landing): wire MotionProvider, navbar entrance, scroll progress, dashboard reveal"
```

---

### Task 4: Hero choreography

**Files:**
- Modify: `src/components/landing/Hero.tsx`

**Interfaces:**
- Consumes: `m` từ framer-motion; `EASE_OUT_EXPO`, `staggerContainer` từ `@/lib/animation`; `Parallax` từ `@/components/ui/motion`.

- [ ] **Step 1: Ghi đè `src/components/landing/Hero.tsx`**

```tsx
"use client";

import { m } from "framer-motion";
import { HOT_LOCAL, META, TOP_SKILLS } from "@/lib/demoData";
import { fmtInt } from "@/lib/format";
import { EASE_OUT_EXPO, staggerContainer } from "@/lib/animation";
import { Parallax } from "@/components/ui/motion";

// H1 tách theo từ cho hiệu ứng "mask rise". LƯU Ý LCP: chữ nằm trong mask (overflow-hidden)
// nên chỉ paint khi trượt vào — giữ stagger 0.03 + duration 0.45 để tổng chuỗi ≤ ~0.9s.
// Dấu phẩy dính vào "thật," (teal) để flex gap không chèn khoảng trắng thừa trước dấu.
const HEADLINE: { text: string; brand?: boolean }[] = [
  { text: "Chọn" }, { text: "nghề" }, { text: "bằng" },
  { text: "dữ", brand: true }, { text: "liệu", brand: true }, { text: "thật,", brand: true },
  { text: "không" }, { text: "còn" }, { text: "cảm" }, { text: "tính" },
];

const wordMask = staggerContainer(0.03, 0.1);
const wordRise = {
  hidden: { y: "110%" },
  visible: { y: 0, transition: { duration: 0.45, ease: EASE_OUT_EXPO } },
};

// fadeUp phát khi LOAD (không chờ scroll), delay truyền qua `custom`.
const fadeUpLoad = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT_EXPO, delay },
  }),
};

export function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section id="tong-quan" aria-labelledby="hero-heading" className="relative overflow-hidden">
      {/* blob nền trôi chậm */}
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-8 h-72 w-72 rounded-full bg-brand-light opacity-70 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-28 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Thẻ glass nổi — parallax bọc ngoài + float CSS bên trong (chỉ màn rộng) */}
      <Parallax offset={40} className="absolute left-[5%] top-28 hidden xl:block">
        <m.div
          aria-hidden="true"
          className="glass animate-floaty rounded-2xl px-4 py-3 text-sm"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.9 }}
        >
          <p className="font-semibold text-ink">Phân tích Dữ liệu</p>
          <p className="font-bold text-accent-dark">{META.avgMatch}% phù hợp với bạn</p>
        </m.div>
      </Parallax>
      <Parallax offset={70} className="absolute right-[5%] top-24 hidden xl:block">
        <m.div
          aria-hidden="true"
          className="glass animate-floaty rounded-2xl px-4 py-3 text-sm"
          style={{ animationDelay: "1.4s" }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 1.05 }}
        >
          <p className="font-semibold text-ink">
            <span className="text-accent">●</span> Nhu cầu tăng {HOT_LOCAL[0].growth}
          </p>
          <p className="text-ink-soft">
            {TOP_SKILLS[0].name} {TOP_SKILLS[0].pct}% · SQL đang tăng
          </p>
        </m.div>
      </Parallax>

      <div className="relative mx-auto max-w-3xl px-6 pb-12 pt-14 text-center md:pt-20">
        <m.p
          className="inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-1.5 text-sm font-semibold text-brand"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.05 }}
        >
          ✦ Định hướng nghề bằng dữ liệu thật
        </m.p>

        <m.h1
          id="hero-heading"
          className="mt-5 flex flex-wrap justify-center gap-x-[0.28em] gap-y-1 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink md:text-[3.3rem]"
          variants={wordMask}
          initial="hidden"
          animate="visible"
        >
          {HEADLINE.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.15em] -mb-[0.15em]">
              <m.span variants={wordRise} className={`inline-block ${w.brand ? "text-brand" : ""}`}>
                {w.text}
              </m.span>
            </span>
          ))}
        </m.h1>

        <m.p
          className="mx-auto mt-5 max-w-xl text-base text-ink-soft md:text-lg"
          variants={fadeUpLoad}
          custom={0.5}
          initial="hidden"
          animate="visible"
        >
          La Bàn Nghề phân tích hồ sơ năng lực của bạn và đối chiếu với {fmtInt(META.totalJobs)} tin
          tuyển dụng thật để đưa ra lộ trình nghề cụ thể — có giải thích, có tuyến học.
        </m.p>

        <m.div
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          variants={fadeUpLoad}
          custom={0.62}
          initial="hidden"
          animate="visible"
        >
          <m.button
            type="button"
            onClick={onStart}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl bg-accent px-6 py-3.5 font-semibold text-white shadow-lg shadow-accent/25 transition-colors hover:bg-accent-dark"
          >
            Làm bài đánh giá →
          </m.button>
          <a
            href="#cach-hoat-dong"
            className="rounded-xl border border-gray-300 bg-white px-6 py-3.5 font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
          >
            Xem cách hoạt động
          </a>
        </m.div>

        <m.p
          className="mt-5 text-sm text-ink-soft"
          variants={fadeUpLoad}
          custom={0.72}
          initial="hidden"
          animate="visible"
        >
          ✓ Miễn phí cho học sinh · Dữ liệu từ {fmtInt(META.totalJobs)} tin tuyển dụng thật
        </m.p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS, 0 error.

- [ ] **Step 3: Kiểm tra thị giác**

Reload `http://localhost:3000`:
- Khi load: badge → **H1 hiện từng chữ trượt lên từ dưới mask** (span teal "dữ liệu thật," đúng màu) → mô tả → 2 nút → dòng tin cậy, theo nhịp, xong trong ~1s.
- Không thấy chữ H1 bị cắt mất chân (descender 'g', 'y') ở trạng thái cuối.
- Thẻ glass 2 bên (màn ≥1280px): pop vào sau text, và **trôi lệch tốc độ** khi cuộn.
- Nút "Làm bài đánh giá" phóng nhẹ khi hover, thụt khi bấm.
- Không tràn ngang.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/Hero.tsx
git commit -m "feat(landing): hero entrance choreography + parallax glass cards"
```

---

### Task 5: TrustStat — count-up + stagger

**Files:**
- Modify: `src/components/landing/TrustStat.tsx`

**Interfaces:**
- Consumes: `Reveal`, `CountUp` từ `@/components/ui/motion`; `scaleIn`, `fadeUp` từ `@/lib/animation`.

- [ ] **Step 1: Ghi đè `src/components/landing/TrustStat.tsx`**

```tsx
"use client";

import { META } from "@/lib/demoData";
import { Reveal, CountUp } from "@/components/ui/motion";
import { scaleIn, fadeUp } from "@/lib/animation";

// Mang số THÔ để CountUp đếm (fmtInt sẽ format vi-VN: 12480 -> 12.480).
const STATS = [
  { to: META.totalJobs, suffix: "", label: "Tin tuyển dụng" },
  { to: META.careerGroups, suffix: "", label: "Nhóm nghề" },
  { to: META.provinces, suffix: "", label: "Tỉnh thành" },
  { to: META.avgMatch, suffix: "%", label: "Độ phù hợp trung bình" },
];

export function TrustStat() {
  return (
    <section aria-label="Số liệu tổng quan" className="px-6 pb-20">
      <Reveal
        as="span"
        className="mx-auto block max-w-4xl pb-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft/70 md:text-sm"
      >
        Được xây dựng tại VAIC 2026 · Dữ liệu tổng hợp từ tin tuyển dụng công khai
      </Reveal>
      <Reveal
        variant={scaleIn}
        className="mx-auto grid max-w-5xl grid-cols-2 gap-y-8 rounded-2xl bg-gradient-to-r from-brand-dark to-brand-deep px-6 py-10 text-center text-white shadow-xl shadow-brand-deep/20 md:grid-cols-4"
      >
        {STATS.map((s, i) => (
          <Reveal key={s.label} variant={fadeUp} delay={0.15 + i * 0.1}>
            <p className="text-3xl font-extrabold md:text-4xl">
              <CountUp to={s.to} suffix={s.suffix} />
            </p>
            <p className="mt-1.5 text-sm text-white/70">{s.label}</p>
          </Reveal>
        ))}
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS, 0 error.

- [ ] **Step 3: Kiểm tra thị giác**

Cuộn tới dải số tối: bar **scale-in**, 4 ô hiện lần lượt, và **các số đếm tăng dần** tới 12.480 · 63 · 34 · 92%. Số cuối có hậu tố `%`. Format dấu chấm ngăn cách nghìn (12.480) đúng kiểu vi-VN.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/TrustStat.tsx
git commit -m "feat(landing): trust-stat count-up + stagger"
```

---

### Task 6: Problem + HowItWorks — stagger cards & self-drawing connector

**Files:**
- Modify: `src/components/landing/Problem.tsx`
- Modify: `src/components/landing/HowItWorks.tsx`

**Interfaces:**
- Consumes: `Reveal`, `StaggerGroup`, `StaggerItem` từ `@/components/ui/motion`; `m` từ framer-motion; `EASE_OUT_EXPO`, `REVEAL_VIEWPORT` từ `@/lib/animation`.

- [ ] **Step 1: Ghi đè `src/components/landing/Problem.tsx`**

```tsx
"use client";

import { SectionHead } from "@/components/ui/SectionHead";
import { IconGradCap, IconUnlink, IconWrench } from "@/components/ui/icons";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";

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
      <Reveal>
        <SectionHead
          kicker="Vấn đề"
          title="Chọn nghề theo cảm tính — cái giá quá đắt"
          sub="Ba khoảng trống khiến hàng loạt quyết định nghề nghiệp bắt đầu sai từ vạch xuất phát."
        />
      </Reveal>
      <StaggerGroup className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3" stagger={0.14}>
        {PROBLEMS.map((p) => (
          <StaggerItem
            key={p.title}
            as="article"
            whileHover={{ y: -6 }}
            className="rounded-2xl border border-gray-200 bg-white p-7 transition-shadow hover:shadow-lg"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-light text-2xl text-brand">
              <p.icon />
            </span>
            <h3 className="mt-5 text-lg font-bold text-ink">{p.title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{p.desc}</p>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
```

- [ ] **Step 2: Ghi đè `src/components/landing/HowItWorks.tsx`**

```tsx
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
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS, 0 error.

- [ ] **Step 4: Kiểm tra thị giác**

- Section "Vấn đề": tiêu đề reveal, 3 card hiện **lần lượt**, hover **nâng nhẹ** lên.
- Section "Cách hoạt động": **đường kẻ đứt nối tự vẽ dài ra** từ trái, 3 bước hiện lần lượt, icon **bật spring**.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/Problem.tsx src/components/landing/HowItWorks.tsx
git commit -m "feat(landing): problem stagger + howitworks self-drawing connector"
```

---

### Task 7: Features + Testimonial — slide-in, spring pops

**Files:**
- Modify: `src/components/landing/Features.tsx`
- Modify: `src/components/landing/Testimonial.tsx`

**Interfaces:**
- Consumes: `Reveal` từ `@/components/ui/motion`; `m` từ framer-motion; `REVEAL_VIEWPORT`, `slideLeft`, `slideRight`, `scaleIn`, `staggerContainer` từ `@/lib/animation`.

- [ ] **Step 1: Ghi đè `src/components/landing/Features.tsx`**

```tsx
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
```

- [ ] **Step 2: Ghi đè `src/components/landing/Testimonial.tsx`**

```tsx
"use client";

import { SectionHead } from "@/components/ui/SectionHead";
import { IconStar } from "@/components/ui/icons";
import { m } from "framer-motion";
import { REVEAL_VIEWPORT, scaleIn, staggerContainer } from "@/lib/animation";
import { Reveal } from "@/components/ui/motion";

const starGroup = staggerContainer(0.09, 0.2);
const starPop = {
  hidden: { opacity: 0, scale: 0, rotate: -30 },
  visible: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 500, damping: 15 } },
};

export function Testimonial() {
  return (
    <section aria-labelledby="testimonial-heading" className="px-6 py-20">
      <Reveal>
        <SectionHead kicker="Học sinh nói gì" title="Một lộ trình đủ rõ để tự tin nói về tương lai" />
      </Reveal>
      <m.figure
        className="relative mx-auto mt-12 max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm md:p-10"
        variants={scaleIn}
        initial="hidden"
        whileInView="visible"
        viewport={REVEAL_VIEWPORT}
      >
        <span className="absolute right-5 top-5 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-ink-soft/60">
          Kịch bản minh hoạ
        </span>
        <m.div
          className="flex gap-1 text-lg text-amber-400"
          aria-label="Đánh giá 5 trên 5 sao"
          variants={starGroup}
          initial="hidden"
          whileInView="visible"
          viewport={REVEAL_VIEWPORT}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <m.span key={i} variants={starPop} className="inline-block">
              <IconStar />
            </m.span>
          ))}
        </m.div>
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
      </m.figure>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS, 0 error.

- [ ] **Step 4: Kiểm tra thị giác**

- "Tính năng": ô lớn vào **từ trái**, 2 ô phải vào **từ phải** lần lượt; badge **89% bật spring**; 4 chip Java/React/SQL/Docker **pop lần lượt**; hover 2 ô phải nâng nhẹ.
- "Học sinh nói gì": card **scale-in**, **5 sao pop từng cái** (có xoay nhẹ).

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/Features.tsx src/components/landing/Testimonial.tsx
git commit -m "feat(landing): features slide-in + testimonial star pops"
```

---

### Task 8: Audience + Faq — stagger & hover

**Files:**
- Modify: `src/components/landing/Audience.tsx`
- Modify: `src/components/landing/Faq.tsx`

**Interfaces:**
- Consumes: `Reveal`, `StaggerGroup`, `StaggerItem` từ `@/components/ui/motion`; `m` từ framer-motion.

- [ ] **Step 1: Ghi đè `src/components/landing/Audience.tsx`**

```tsx
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
```

- [ ] **Step 2: Ghi đè `src/components/landing/Faq.tsx`**

```tsx
"use client";

import { SectionHead } from "@/components/ui/SectionHead";
import { IconChevronDown } from "@/components/ui/icons";
import { META } from "@/lib/demoData";
import { fmtInt } from "@/lib/format";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";

const FAQS = [
  {
    q: "Dữ liệu lấy từ đâu?",
    a: `Tổng hợp và làm sạch từ ${fmtInt(META.totalJobs)}+ tin tuyển dụng công khai. Bản demo chạy trên snapshot dữ liệu; pipeline được thiết kế để cập nhật theo quý.`,
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

export function Faq() {
  return (
    <section aria-labelledby="faq-heading" className="px-6 py-20">
      <Reveal>
        <SectionHead kicker="Câu hỏi thường gặp" title="Bạn có thể thắc mắc" />
      </Reveal>
      <StaggerGroup className="mx-auto mt-10 max-w-3xl space-y-3" stagger={0.1}>
        {FAQS.map((f) => (
          <StaggerItem key={f.q}>
            <details className="faq group rounded-2xl border border-gray-200 bg-white px-6 py-5">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-ink">
                {f.q}
                <span className="shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180">
                  <IconChevronDown />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS, 0 error.

- [ ] **Step 4: Kiểm tra thị giác**

- "Đối tượng sử dụng": 3 card hiện lần lượt, hover **nâng lên**; card "Phổ biến" viền teal vẫn nổi bật.
- FAQ: 4 accordion hiện lần lượt; bấm mở/đóng vẫn hoạt động, chevron xoay như cũ.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/Audience.tsx src/components/landing/Faq.tsx
git commit -m "feat(landing): audience + faq stagger and hover"
```

---

### Task 9: CtaBand + Footer — parallax, CTA micro-interaction, final build & reduced-motion

**Files:**
- Modify: `src/components/landing/CtaBand.tsx`
- Modify: `src/components/landing/Footer.tsx`

**Interfaces:**
- Consumes: `Parallax` từ `@/components/ui/motion`; `m` từ framer-motion; `REVEAL_VIEWPORT`, `staggerContainer`, `fadeUp`, `fadeIn` từ `@/lib/animation`.

- [ ] **Step 1: Ghi đè `src/components/landing/CtaBand.tsx`**

```tsx
"use client";

import { m } from "framer-motion";
import { Compass } from "@/components/ui/Compass";
import { REVEAL_VIEWPORT, staggerContainer, fadeUp } from "@/lib/animation";
import { Parallax } from "@/components/ui/motion";

const band = staggerContainer(0.12, 0.1);

export function CtaBand({ onStart }: { onStart: () => void }) {
  return (
    <section aria-labelledby="cta-heading" className="px-6 pb-20">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-deep px-8 py-16 text-center text-white">
        {/* Vòng tròn trang trí — parallax ngược chiều nhau */}
        <Parallax offset={50} className="pointer-events-none absolute -right-20 -top-20 h-64 w-64">
          <div aria-hidden="true" className="h-full w-full rounded-full bg-white/5" />
        </Parallax>
        <Parallax offset={-50} className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64">
          <div aria-hidden="true" className="h-full w-full rounded-full bg-white/5" />
        </Parallax>

        <m.div
          variants={band}
          initial="hidden"
          whileInView="visible"
          viewport={REVEAL_VIEWPORT}
          className="relative"
        >
          <m.div variants={fadeUp} className="mx-auto w-fit">
            {/* La bàn xoay chậm — element riêng để không đè lên hiệu ứng fadeUp kế thừa */}
            <m.div
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            >
              <Compass className="mx-auto h-16 w-16" />
            </m.div>
          </m.div>
          <m.h2 variants={fadeUp} id="cta-heading" className="mt-6 text-3xl font-extrabold md:text-4xl">
            Sẵn sàng tìm hướng đi của bạn?
          </m.h2>
          <m.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-white/85">
            Được xây dựng tại VAIC 2026 — bạn chỉ cần 10 phút để có lộ trình đầu tiên.
          </m.p>
          <m.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <m.button
              type="button"
              onClick={onStart}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-xl bg-accent px-6 py-3.5 font-semibold text-white shadow-lg shadow-black/10 transition-colors hover:bg-accent-dark"
            >
              Làm bài đánh giá miễn phí →
            </m.button>
            <a
              href="#dashboard"
              className="rounded-xl border border-white/50 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
            >
              Xem demo →
            </a>
          </m.div>
          <m.p variants={fadeUp} className="mt-5 text-sm text-white/70">
            Miễn phí cho học sinh · Không cần thẻ tín dụng
          </m.p>
        </m.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Ghi đè `src/components/landing/Footer.tsx`**

```tsx
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
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS, 0 error.

- [ ] **Step 4: Kiểm tra thị giác + reduced-motion**

Browser ≥1280px:
- CTA band: 2 vòng tròn trắng **trôi ngược chiều** khi cuộn; nội dung hiện lần lượt; la bàn **lắc/xoay chậm**; nút CTA phóng/thụt khi hover/bấm.
- Footer fade-in.
- **Reduced-motion:** DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce" → reload → cuộn hết trang: **mọi nội dung hiển thị đầy đủ** (không kẹt ở opacity 0), số TrustStat hiện thẳng giá trị cuối, không có chuyển động lắc/parallax gây khó chịu.

- [ ] **Step 5: Build cuối**

Run: `npm run build`
Expected: PASS, không lỗi. Kiểm tra output route `/` không cảnh báo bất thường.

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/CtaBand.tsx src/components/landing/Footer.tsx
git commit -m "feat(landing): cta parallax + compass spin + footer reveal"
```

---

## Self-Review

**1. Spec coverage** (đối chiếu spec §3–4):
- §3.1 tokens → Task 1 ✓ · §3.2 primitives (7 cái) → Task 2 ✓ · §3.3 LazyMotion strict → Task 2 (MotionProvider) ✓
- §4 biên đạo: Navbar+ScrollProgress → Task 3 ✓ · Hero → Task 4 ✓ · Dashboard preview → Task 3 ✓ · TrustStat/CountUp → Task 5 ✓ · Problem+HowItWorks → Task 6 ✓ · Features+Testimonial → Task 7 ✓ · Audience+Faq → Task 8 ✓ · CtaBand+Footer → Task 9 ✓
- §5 guardrails: transform/opacity only, once:true, reducedMotion, overflow-hidden (Hero/CtaBand có sẵn), "use client" thêm cho TrustStat/Problem/HowItWorks/Features/Testimonial/Faq/Footer ✓
- §7 verify: typecheck+build+browser+reduced-motion → rải trong các task, chốt ở Task 9 ✓

**2. Placeholder scan:** không có TBD/TODO; mọi step có code hoặc lệnh cụ thể ✓

**3. Type consistency:** API primitives (`Reveal`/`StaggerGroup`/`StaggerItem`/`Parallax`/`CountUp`/`ScrollProgress`/`MotionProvider`) định nghĩa ở Task 2, dùng đúng tên+prop ở Task 3–9. `MotionTag` union đủ thẻ dùng (`article`/`span`/`li`/`div`/`footer`/`figure`/`section`). `CountUp.to` nhận số thô — TrustStat đổi STATS sang số thô (Task 5) khớp ✓

**Điểm rủi ro đã ghi chú trong code:** LCP của Hero word-mask (Task 4, giữ stagger/duration ngắn) · dấu phẩy teal trong "thật," (chấp nhận, cosmetic).

---

## Execution Handoff

Plan hoàn tất, lưu ở `docs/superpowers/plans/2026-07-18-landing-animations.md`. Hai cách thực thi:

**1. Subagent-Driven (khuyến nghị)** — mỗi task một subagent mới, review giữa các task, lặp nhanh.

**2. Inline Execution** — thực thi trong phiên này qua executing-plans, chạy theo lô với checkpoint.

Chọn cách nào?
