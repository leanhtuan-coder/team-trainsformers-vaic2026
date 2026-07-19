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
