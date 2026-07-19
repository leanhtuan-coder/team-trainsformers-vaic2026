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
