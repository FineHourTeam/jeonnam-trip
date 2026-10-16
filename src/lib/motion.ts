// Motion(구 Framer Motion) 표준 프리셋 — 애니메이션 일관성의 단일 출처.
// 화면마다 즉석 duration/easing 값을 쓰지 말고 여기 프리셋만 재사용 (디자인 토큰과 같은 원리).
// 과한 애니메이션은 "AI 티"의 신호다 (rules.md § 디자인 금지 비주얼) — 프리셋은 짧고 절제돼 있다.
// 접근성: prefers-reduced-motion 존중은 useReducedMotion()으로 (rules.md § 모션).
//
// 패키지: `motion`(구 framer-motion 개명, `import { motion, useReducedMotion } from "motion/react"`).
// `framer-motion`도 re-export로 동작하나 신규 코드는 `motion/react`를 쓴다.
import type { Transition, Variants } from "motion/react";

// 큐빅 베지어 — Material 계열 (읽기 쉬운 표준값). mutable 튜플이라 motion ease에 그대로 들어감.
export const easing: Record<
  "standard" | "decelerate" | "accelerate",
  [number, number, number, number]
> = {
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
};

export const duration = { fast: 0.15, base: 0.25, slow: 0.4 } as const;

export const transitions = {
  base: { duration: duration.base, ease: easing.standard },
  fast: { duration: duration.fast, ease: easing.standard },
  spring: { type: "spring", stiffness: 300, damping: 30 },
} satisfies Record<string, Transition>;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.base },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: transitions.base },
};

// 목록 stagger — 부모 컨테이너에 적용, 자식에 slideUp/fadeIn.
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
