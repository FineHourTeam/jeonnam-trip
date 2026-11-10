// @vitest-environment node
// 토큰 명도 대비 검사 — tokens.css의 배경/글자 쌍이 WCAG AA(본문 4.5:1)를 넘는지 라이트·다크 모두 확인한다.
// 브랜드색을 바꾸면(설치 H단계·디자인 변경) 이 테스트가 먼저 알려준다. 끝내기 전 검사(Stop 훅)가 test를 돌리므로 자동으로 걸린다.
// 쌍을 추가하면 PAIRS에 한 줄. 색 형식은 #hex 또는 oklch(L C H)만 지원한다.
/// <reference types="node" />
// (vitest는 CSS import를 빈 문자열로 바꾸므로 파일을 직접 읽는다)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./tokens.css", import.meta.url)), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`${selector} 블록 없음`);
  const body = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? "", (m[2] ?? "").trim()]),
  );
}

function toRgb(value: string): number[] {
  if (value.startsWith("#")) {
    const h = value.slice(1);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  }
  const [L = 0, C = 0, H = 0] = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((x) =>
    Math.min(1, Math.max(0, x > 0.0031308 ? 1.055 * x ** (1 / 2.4) - 0.055 : 12.92 * x)),
  );
}

const luminance = (rgb: number[]) =>
  rgb
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * ([0.2126, 0.7152, 0.0722][i] ?? 0), 0);

function contrast(a: string, b: string) {
  const [hi = 0, lo = 0] = [luminance(toRgb(a)), luminance(toRgb(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [배경, 글자] — 화면에서 실제로 겹치는 조합
const PAIRS: [string, string][] = [
  ["background", "foreground"],
  ["background-subtle", "foreground"],
  ["background", "muted-foreground"],
  ["background-subtle", "muted-foreground"],
  ["muted", "muted-foreground"],
  ["card", "card-foreground"],
  ["primary", "primary-foreground"],
  ["secondary", "secondary-foreground"],
  ["accent", "accent-foreground"],
  ["destructive", "destructive-foreground"],
  ["success", "success-foreground"],
  ["warning", "warning-foreground"],
  ["kakao", "kakao-foreground"],
  ["google", "google-foreground"],
];

describe.each([
  ["라이트", ":root"],
  ["다크", ".dark"],
])("토큰 명도 대비 (%s)", (_, selector) => {
  const t = block(selector);
  test.each(PAIRS.filter(([bg, fg]) => bg in t && fg in t))("%s 위 %s ≥ 4.5:1", (bg, fg) => {
    expect(contrast(t[bg] ?? "", t[fg] ?? "")).toBeGreaterThanOrEqual(4.5);
  });
});
