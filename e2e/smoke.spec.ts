// 스모크 자가 테스트 — "렌더는 되는데 아무것도 연결 안 된 UI"(Potemkin interface)를 잡는다.
// 정적 게이트(lint/typecheck/test/build)는 컴파일 성공만 보증할 뿐, 라우트가 실제로 뜨는지·
// 콘솔 에러가 없는지·핵심 인터랙션이 도는지는 못 잡는다 (unknown-unknowns #49, Replit Agent 3
// 문제 정의). Playwright로 프로덕션 프리뷰(npm run preview)를 실제 브라우저로 구동해 검증.
//
// 실행: npx playwright test e2e/  (사전: npx playwright install chromium)
// CI: templates/ci/react-ci.yml의 smoke 잡이 build → preview → 이 스펙 순으로 돌린다.
//
// ⚠️ 새 라우트를 추가하면 아래 ROUTES 배열에 등록한다 (rules.md § 테스트 — 스모크 스펙 등록).
import { expect, test } from "@playwright/test";

// src/app/paths.ts와 정합 유지 — 공개(비인증) 라우트만. 인증 필요 라우트는 별도 로그인 픽스처로.
const ROUTES: { path: string; expectText?: RegExp }[] = [
  { path: "/" },
  { path: "/login" },
  // { path: "/notices", expectText: /공지/ },   // 예시 — 기능 추가 시 등록
];

// 콘솔 에러가 하나라도 있으면 실패로 취급할 때 무시할 알려진 소음(브라우저 확장 등)
const IGNORED_CONSOLE = [/favicon/i, /Download the React DevTools/i, /\[vite\]/i];

for (const route of ROUTES) {
  test(`${route.path} — 콘솔 에러 없이 렌더`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
      errors.push(text);
    });
    page.on("pageerror", (err) => errors.push(err.message));

    const res = await page.goto(route.path, { waitUntil: "networkidle" });
    expect(res?.ok(), `${route.path} HTTP 응답`).toBeTruthy();

    // #root가 비어있지 않아야 함 — 마운트 실패(흰 화면)를 잡는다
    await expect(page.locator("#root")).not.toBeEmpty();
    if (route.expectText) {
      await expect(page.getByText(route.expectText).first()).toBeVisible();
    }
    expect(errors, `${route.path} 콘솔/페이지 에러`).toEqual([]);
  });
}

// 핵심 인터랙션 1개는 실동작까지 — 버튼이 "눌리는지"가 아니라 "무언가 일어나는지"를 본다.
// 프로젝트에 맞게 교체 (예: 로그인 폼 제출 → 에러 메시지 노출, 또는 홈의 CTA → 이동).
test.skip("핵심 인터랙션 스모크 (프로젝트에 맞게 활성화)", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/이메일/).fill("invalid");
  await page.getByRole("button", { name: /로그인/ }).click();
  // 잘못된 입력 → 검증 메시지가 떠야 한다 (아무 일도 안 일어나면 Potemkin)
  await expect(page.getByText(/이메일|형식|올바른/).first()).toBeVisible();
});
