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
// live: Firestore·네이버 지도 등 외부 서비스에 붙는 화면 — 연결 채널이 열려 있어 networkidle이 오지 않으므로 load 후 문구로 확인한다
// needsData: 문구가 실제 데이터가 있어야 보이는 화면 — CI 스텁 백엔드에서는 문구 대신 마운트·페이지 에러만 본다
const ROUTES: { path: string; expectText?: RegExp; live?: boolean; needsData?: boolean }[] = [
  { path: "/", expectText: /열리는 축제/, live: true },
  { path: "/login", expectText: /Google 계정으로 로그인/ },
  { path: "/festivals", expectText: /축제 \d+개/, live: true, needsData: true },
  { path: "/places", expectText: /장소 [\d,]+곳/, live: true, needsData: true },
  { path: "/creators", expectText: /코스 \d+개/, live: true, needsData: true },
  // 설정 화면 없이 바로 초안 편집기로 넘어간다 (편집기의 지도가 네이버 지도를 부른다)
  { path: "/trips/new", expectText: /이 브라우저에 자동으로 남아요/, live: true },
  { path: "/trips/draft", expectText: /작성 중인 코스가 없어요/ },
  {
    path: "/s/not-a-real-share",
    expectText: /열 수 없는 코스예요|불러오지 못했어요/,
    live: true,
    needsData: true,
  },
  // 비회원: 보관함은 로그인 안내, SNS 링크는 폼을 쓰고 저장할 때 로그인
  { path: "/library", expectText: /로그인하면 보관함을 쓸 수 있어요/ },
  { path: "/library/sns/new", expectText: /로그인하고 저장하기/ },
  { path: "/library/sns/new?link=abc", expectText: /로그인하면 보관한 링크를 고칠 수 있어요/ },
  // { path: "/notices", expectText: /공지/ },   // 예시 — 기능 추가 시 등록
];

// 콘솔 에러가 하나라도 있으면 실패로 취급할 때 무시할 알려진 소음(브라우저 확장 등)
const IGNORED_CONSOLE = [/favicon/i, /Download the React DevTools/i, /\[vite\]/i];

// CI 스모크는 가짜 Firebase·네이버 키로 빌드한다(react-ci.yml) — 외부 서비스가 401·404를 돌려주는 건 예상된 일이다
const STUB_BACKEND = process.env.VITE_FIREBASE_PROJECT_ID === "smoke";

for (const route of ROUTES) {
  test(`${route.path} — 콘솔 에러 없이 렌더`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
      if (STUB_BACKEND && route.live && text.startsWith("Failed to load resource")) return;
      errors.push(text);
    });
    page.on("pageerror", (err) => errors.push(err.message));

    const res = await page.goto(route.path, {
      waitUntil: route.live ? "load" : "networkidle",
    });
    expect(res?.ok(), `${route.path} HTTP 응답`).toBeTruthy();

    // #root가 비어있지 않아야 함 — 마운트 실패(흰 화면)를 잡는다
    await expect(page.locator("#root")).not.toBeEmpty();
    if (route.expectText && !(STUB_BACKEND && route.needsData)) {
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
