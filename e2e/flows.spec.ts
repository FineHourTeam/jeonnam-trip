// 핵심 흐름 E2E — 에뮬레이터 + dev 서버 (playwright.e2e.config.ts). 데이터는 global-setup이 매번 새로 넣는다.
// 외부 의존: 경로 API(/api/directions)는 응답을 가로채 고정하고, 네이버 지도 스크립트는 막아 "지도를 못 불러온" 상태로 둔다.
import { expect, test, type Browser, type Page } from "@playwright/test";

const TODAY = new Date("2026-10-20T10:00:00+09:00");

async function prepare(page: Page, legMinutes = 20) {
  await page.clock.setFixedTime(TODAY);
  await page.route("https://oapi.map.naver.com/**", (r) => r.abort());
  await page.route("**/api/directions", async (route) => {
    const body = route.request().postDataJSON() as { legs: { from: unknown; to: unknown }[] };
    await route.fulfill({
      json: {
        legs: body.legs.map((l) => ({
          status: "ok",
          durationMin: legMinutes,
          distanceM: legMinutes * 600,
          path: [l.from, l.to],
          fetchedAt: TODAY.toISOString(),
        })),
      },
    });
  });
}

let seq = 0;
async function login(page: Page, email = `e2e-${String(Date.now())}-${String(seq++)}@test.local`) {
  await page.goto("/login");
  await page.getByLabel(/test\.local 이메일/).fill(email);
  await page.getByRole("button", { name: "테스트 계정으로 로그인" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  return email;
}

async function startFromFestival(page: Page) {
  await page.goto("/festivals/sample-fes-river");
  await page.getByRole("button", { name: "이 축제로 여행 만들기" }).click();
  await page.getByRole("radio", { name: "10.24 (토)" }).click();
  await page.getByLabel(/등불 행진/).click();
  await page.getByRole("button", { name: "이 날짜로 여행 만들기" }).click();
  await expect(page).toHaveURL(/\/trips\/new\?festival=sample-fes-river/);
  await page.getByRole("button", { name: "여행 만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/trips\/draft/);
  await expect(page.getByRole("heading", { name: "강변 가을축제 여행" })).toBeVisible();
}

async function saveAndGetId(page: Page): Promise<string> {
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page).toHaveURL(/\/trips\/(?!draft)[\w-]+$/);
  await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible();
  return page.url().split("/").pop() ?? "";
}

test("축제에서 여행 만들기 → 고정 프로그램·경로 계산 → 비회원 저장은 로그인으로 이어서", async ({ page }) => {
  await prepare(page);
  await startFromFestival(page);
  await expect(page.getByText("18:30~19:30 고정")).toBeVisible();
  await expect(page.locator('[aria-label="이동 구간"]').first()).toContainText("20분");
  await expect(page.getByText("아직 저장 전이에요")).toBeVisible();

  await page.getByRole("button", { name: "로그인하고 저장" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("작성 중인 여행이 이 기기에 있어요")).toBeVisible();
  await page.getByLabel(/test\.local 이메일/).fill(`e2e-save-${String(Date.now())}@test.local`);
  await page.getByRole("button", { name: "테스트 계정으로 로그인" }).click();
  await expect(page).toHaveURL(/\/trips\/draft/);

  await saveAndGetId(page);
  await page.goto("/my-trips");
  await expect(page.getByText("강변 가을축제 여행")).toBeVisible();
});

test("경로가 길어 영업 종료 뒤 도착하면 충돌 이유와 고칠 동작을 보여 준다", async ({ page }) => {
  await prepare(page, 300);
  await page.goto("/trips/new?festival=sample-fes-river&date=2026-10-23&program=opening&places=suncheon-national-garden");
  await page.getByRole("button", { name: "여행 만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/trips\/draft/);
  await expect(page.getByText("충돌 있음")).toBeVisible();
  const alert = page.getByRole("alert").filter({ hasText: "마감" }).first();
  await expect(alert).toBeVisible();
  await expect(alert.getByRole("button", { name: "다른 일차로" }).or(alert.getByRole("button", { name: "일정에서 빼기" })).first()).toBeVisible();
});

test("장소 저장 → 보관함에서 골라 새 여행 → 미배치 후보를 일차에 넣기", async ({ page }) => {
  await prepare(page);
  await login(page);
  await page.goto("/places/suncheon-national-garden");
  await expect(page.getByRole("heading", { name: "순천만국가정원" })).toBeVisible();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("보관함에 저장했어요.")).toBeVisible();

  await page.goto("/library");
  await page.getByRole("checkbox", { name: "순천만국가정원 선택" }).click();
  await page.getByRole("button", { name: "1곳 일정에 담기" }).click();
  await page.getByRole("link", { name: "새 여행으로" }).click();
  await expect(page).toHaveURL(/places=suncheon-national-garden/);
  await page.locator('[data-day="2026. 10. 24."]').click();
  await page.locator('[data-day="2026. 10. 25."]').click();
  await page.getByRole("button", { name: "여행 만들기", exact: true }).click();

  await expect(page.getByText("미배치 후보 1곳")).toBeVisible();
  await expect(page.getByText("넣을 일차를 골라 주세요.")).toBeVisible();
  await page.getByRole("button", { name: "일차에 넣기" }).click();
  await page.getByRole("button", { name: /1일차 · 10\.24/ }).click();
  await expect(page.getByRole("article", { name: /순천만국가정원/ })).toBeVisible();
});

test("SNS 링크를 장소와 연결해 저장하고, 장소 없이도 보관한다", async ({ page }) => {
  await prepare(page);
  await login(page);
  await page.goto("/library/sns/new");
  await page.getByLabel("링크").fill("instagram.com/p/e2e-bamboo");
  await page.getByPlaceholder("등록된 장소 이름으로 찾기").fill("죽녹원");
  await page.getByRole("button", { name: /죽녹원/ }).click();
  await page.getByRole("button", { name: "보관함에 저장하기" }).click();
  await expect(page).toHaveURL(/\/library\?tab=links/);
  await expect(page.getByText("죽녹원").first()).toBeVisible();

  await page.goto("/library/sns/new");
  await page.getByLabel("링크").fill("https://youtu.be/e2e-unknown");
  await page.getByRole("button", { name: "보관함에 저장하기" }).click();
  await expect(page.getByText("장소 연결 전이에요. 일정 자동 배치에서는 빠져요.")).toBeVisible();
});

async function guestPage(browser: Browser) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await prepare(p);
  return p;
}

test("공유 링크 만들기 → 받은 사람은 보기 전용 → 공유 중지하면 열 수 없다", async ({ page, browser }) => {
  await prepare(page);
  await login(page);
  await startFromFestival(page);
  const id = await saveAndGetId(page);

  await page.goto(`/trips/${id}/share`);
  await page.getByRole("button", { name: "공유 링크 만들기" }).click();
  await expect(page.getByText("공유 중이에요")).toBeVisible();
  const url = await page.getByLabel("공유 링크").inputValue();
  expect(url).toMatch(/\/s\/[\w-]+$/);

  const guest = await guestPage(browser);
  await guest.goto(url);
  await expect(guest.getByText("보기 전용 코스예요")).toBeVisible();
  await expect(guest.getByRole("heading", { name: "강변 가을축제 여행" })).toBeVisible();
  await expect(guest.getByRole("button", { name: "로그인하고 복사하기" })).toBeVisible();

  await page.getByRole("button", { name: "공유 중지" }).click();
  await page.getByRole("button", { name: "중지하기" }).click();
  await expect(page.getByText("아직 공유하지 않았어요")).toBeVisible();
  await guest.reload();
  await expect(guest.getByText("공유가 중지됐거나 없는 링크예요")).toBeVisible();
});

test("관리자: 새 장소 임시저장 → 공개하면 사용자 화면에 보인다, 일반 사용자는 막힌다", async ({ page, browser }) => {
  const user = await guestPage(browser);
  await login(user);
  await user.goto("/admin");
  await expect(user.getByText("관리자 권한이 없어요")).toBeVisible();

  await prepare(page);
  await login(page, "admin@test.local");
  await page.goto("/admin/places/new");
  await page.getByLabel("이름", { exact: true }).fill("E2E 테스트 정원");
  await page.getByRole("button", { name: "임시저장하고 시작" }).click();
  await expect(page).toHaveURL(/\/admin\/places\/(?!new)[\w-]+$/);
  const id = page.url().split("/").pop() ?? "";
  await page.getByRole("button", { name: "공개하기" }).click();
  await expect(page.getByText("공개했어요.")).toBeVisible();

  await page.goto(`/places/${id}`);
  await expect(page.getByRole("heading", { name: "E2E 테스트 정원" })).toBeVisible();
  await expect(page.getByText("영업시간 확인 필요").first()).toBeVisible();
});

test("비회원 보관함은 로그인을 안내한다", async ({ page }) => {
  await prepare(page);
  await page.goto("/library");
  await expect(page.getByText("로그인하면 저장한 장소를 모아 볼 수 있어요")).toBeVisible();
});

test("PC에서는 일정과 지도를 함께 보여 주고, 지도를 못 불러와도 일정은 그대로다 @desktop", async ({ page }) => {
  await prepare(page);
  await startFromFestival(page);
  await expect(page.getByRole("region", { name: "코스 지도" })).toBeAttached();
  await expect(page.getByText("지도를 불러오지 못했어요")).toBeVisible();
  await expect(page.getByText("18:30~19:30 고정")).toBeVisible();
});
