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

/** 순천 · 직접 만들기로 빈 하루 여행을 연다 */
async function startDirect(page: Page, day: string) {
  await page.goto("/trips/new");
  await page.locator(`[data-day="${day}"]`).click();
  await page.getByRole("button", { name: "순천시" }).click();
  await page.getByRole("radio", { name: /직접 만들기/ }).click();
  await page.getByRole("button", { name: "여행 만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/trips\/draft/);
  await expect(page.getByText("아직 이 일차에 장소가 없어요")).toBeVisible();
}

/** 로그인 화면에 온 상태에서 새 테스트 계정으로 로그인 */
async function loginHere(page: Page, email = `e2e-${String(Date.now())}-${String(seq++)}@test.local`) {
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel(/test\.local 이메일/).fill(email);
  await page.getByRole("button", { name: "테스트 계정으로 로그인" }).click();
}

async function saveAndGetId(page: Page): Promise<string> {
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page).toHaveURL(/\/trips\/(?!draft)[\w-]+$/);
  await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible();
  return page.url().split("/").pop() ?? "";
}

test("축제에서 여행 만들기 → 고정 프로그램·경로 계산 → 비회원 저장은 로그인 뒤 바로 저장된다", async ({ page }) => {
  await prepare(page);
  await startFromFestival(page);
  await expect(page.getByText("18:30~19:30 고정")).toBeVisible();
  await expect(page.locator('[aria-label="이동 구간"]').first()).toContainText("20분");
  await expect(page.getByText("아직 저장 전이에요")).toBeVisible();

  await page.getByRole("button", { name: "로그인하고 저장" }).click();
  await expect(page.getByText("작성 중인 여행이 이 기기에 있어요")).toBeVisible();
  await expect(page.getByText("로그인하면 바로 이어서 저장해요.")).toBeVisible();
  await loginHere(page);
  // 저장 버튼을 다시 누르지 않아도 저장까지 끝난다
  await expect(page).toHaveURL(/\/trips\/(?!draft)[\w-]+$/);
  await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible();
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
  await guest.getByRole("button", { name: "로그인하고 복사하기" }).click();
  await loginHere(guest);
  await expect(guest).toHaveURL(/\/s\/[\w-]+$/);
  await guest.getByRole("button", { name: "내 코스로 복사하기" }).click();
  await expect(guest).toHaveURL(/\/trips\/(?!draft)[\w-]+$/);
  await expect(guest.getByRole("button", { name: "저장됨" })).toBeVisible();
  const copyUrl = guest.url();

  await page.getByRole("button", { name: "공유 중지" }).click();
  await page.getByRole("button", { name: "중지하기" }).click();
  await expect(page.getByText("아직 공유하지 않았어요")).toBeVisible();
  await guest.goto(url);
  await expect(guest.getByText("공유가 중지됐거나 없는 링크예요")).toBeVisible();
  // 이미 복사한 코스는 공유 중지와 상관없이 남는다 (SHR-03)
  await guest.goto(copyUrl);
  await expect(guest.getByRole("heading", { name: "강변 가을축제 여행" })).toBeVisible();
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

test("비회원 보관함은 로그인을 안내하고, 내 여행은 로그인 뒤 원래 화면으로 돌아온다", async ({ page }) => {
  await prepare(page);
  await page.goto("/library");
  await expect(page.getByText("로그인하면 저장한 장소를 모아 볼 수 있어요")).toBeVisible();
  await page.goto("/my-trips");
  await loginHere(page);
  await expect(page).toHaveURL(/\/my-trips$/);
  await expect(page.getByText("아직 저장한 여행이 없어요")).toBeVisible();
});

test("여행 시작: 빈 칸은 오류 위치로 데려가고, 4일을 넘기는 날짜는 그 날부터 다시 고른다 → 지역 이름 제목의 추천 일정", async ({ page }) => {
  await prepare(page);
  await page.goto("/trips/new");
  await page.getByRole("button", { name: "여행 만들기", exact: true }).click();
  await expect(page.getByText("여행 날짜를 골라 주세요.")).toBeInViewport();
  await expect(page.getByText("여행할 지역을 하나 이상 골라 주세요.")).toBeVisible();

  await page.locator('[data-day="2026. 10. 21."]').click();
  await expect(page.getByText("10.21 (수) ~ 10.21 (수) · 당일")).toBeVisible();
  await page.locator('[data-day="2026. 10. 22."]').click();
  await expect(page.getByText("10.21 (수) ~ 10.22 (목) · 1박 2일")).toBeVisible();
  await page.locator('[data-day="2026. 10. 30."]').click();
  await expect(page.getByText("10.30 (금) ~ 10.30 (금) · 당일")).toBeVisible();
  await expect(page.getByText(/최대 4일까지/)).toHaveCount(0);
  await page.locator('[data-day="2026. 10. 31."]').click();
  await expect(page.getByText("10.30 (금) ~ 10.31 (토) · 1박 2일")).toBeVisible();

  await page.getByRole("button", { name: "순천시" }).click();
  await page.getByRole("button", { name: "여행 만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/trips\/draft/);
  await expect(page.getByRole("heading", { name: "순천시 여행" })).toBeVisible();
  await expect(page.getByRole("article").first()).toBeVisible();
});

test("코스 편집: 이미 넣은 곳은 담음으로 보이고, 순서 바꾸기·지우기·후보로 빼기를 되돌릴 수 있다", async ({ page }) => {
  await prepare(page);
  await startDirect(page, "2026. 10. 24.");
  const sheet = page.getByRole("dialog");
  const order = () => page.getByRole("article").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));

  await page.getByRole("button", { name: "장소 넣기" }).click();
  await sheet.getByRole("button", { name: "순천만국가정원 담기" }).click();
  await expect(page.getByText("1일차에 1곳을 넣었어요.")).toBeVisible();
  await page.getByRole("button", { name: "장소 넣기" }).click();
  await expect(sheet.getByRole("button", { name: "순천만국가정원 이 일차에 있어요" })).toBeDisabled();
  await sheet.getByRole("button", { name: "순천만습지 담기" }).click();
  await expect.poll(order).toEqual(["1번째 방문 순천만국가정원", "2번째 방문 순천만습지"]);

  await page.getByRole("button", { name: "순천만습지 더보기" }).click();
  await page.getByRole("menuitem", { name: "위로" }).click();
  await expect.poll(order).toEqual(["1번째 방문 순천만습지", "2번째 방문 순천만국가정원"]);

  await page.getByRole("button", { name: "순천만습지 더보기" }).click();
  await page.getByRole("menuitem", { name: "삭제" }).click();
  await expect.poll(order).toEqual(["1번째 방문 순천만국가정원"]);
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect.poll(order).toEqual(["1번째 방문 순천만습지", "2번째 방문 순천만국가정원"]);

  await page.getByRole("button", { name: "순천만국가정원 더보기" }).click();
  await page.getByRole("menuitem", { name: /일정에서 빼기/ }).click();
  await expect(page.getByText("미배치 후보 1곳")).toBeVisible();
  await page.getByRole("button", { name: "순천만국가정원 후보에서 지우기" }).click();
  await expect(page.getByText("미배치 후보 1곳")).toHaveCount(0);
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(page.getByText("미배치 후보 1곳")).toBeVisible();

  await page.getByRole("button", { name: "지도 보기" }).click();
  await expect(page).toHaveURL(/view=map/);
  await expect(page.getByRole("region", { name: "코스 지도" })).toBeVisible();
  await page.getByRole("button", { name: "일정 보기" }).click();
  await expect(page.getByText("미배치 후보 1곳")).toBeVisible();
});

test("내 여행: 수정일은 한국 날짜로 보이고, 복사·삭제가 목록에 바로 반영된다", async ({ page }) => {
  await prepare(page);
  // 한국 0시 30분 = UTC로는 전날 — 수정일이 하루 밀리지 않아야 한다
  await page.clock.setFixedTime(new Date("2026-10-20T00:30:00+09:00"));
  await login(page);
  await startDirect(page, "2026. 10. 24.");
  await saveAndGetId(page);

  await page.goto("/my-trips");
  await expect(page.getByText("2026. 10. 20. 수정")).toBeVisible();
  await page.getByRole("button", { name: "순천시 여행 더보기" }).click();
  await page.getByRole("menuitem", { name: "복사" }).click();
  await expect(page.getByText("순천시 여행 사본")).toBeVisible();

  await page.getByRole("button", { name: "순천시 여행 사본 더보기" }).click();
  await page.getByRole("menuitem", { name: "삭제" }).click();
  await page.getByRole("button", { name: "삭제하기" }).click();
  await expect(page.getByText("순천시 여행 사본")).toHaveCount(0);
  await expect(page.getByText("순천시 여행", { exact: true })).toBeVisible();
});

test("비회원이 일정에 담으려 하면 로그인으로 안내하고 보던 장소로 돌아온다 → 빈 보관함에서 장소 목록으로", async ({ page }) => {
  await prepare(page);
  await page.goto("/places/suncheon-national-garden");
  await page.getByRole("button", { name: "일정에 추가" }).click();
  await expect(page.getByText("로그인하면 저장한 여행에도 담을 수 있어요.")).toBeVisible();
  await page.getByRole("link", { name: "로그인하기" }).click();
  await loginHere(page);
  await expect(page).toHaveURL(/\/places\/suncheon-national-garden$/);

  await page.goto("/library");
  await page.getByRole("link", { name: "장소 둘러보기" }).click();
  await expect(page).toHaveURL(/\/places$/);
  // 가로 칩 줄에서 필터 버튼이 찌그러져 글자가 넘치지 않는다
  const filter = page.getByRole("button", { name: /^상세 필터/ });
  await expect.poll(() => filter.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

  await page.getByRole("radio", { name: "카페" }).click();
  await expect(page.getByText("[샘플] 정원 카페")).toBeVisible();
  await expect(page.getByText("순천 낙안읍성")).toHaveCount(0);
  await page.getByRole("searchbox", { name: "장소 검색" }).fill("없는 장소 이름");
  await expect(page.getByText(/맞는 장소가 없어요/)).toBeVisible();
  await page.getByRole("button", { name: "조건 초기화" }).click();
  await expect(page.getByRole("radio", { name: "전체" })).toBeChecked();
  await expect(page.getByRole("searchbox", { name: "장소 검색" })).toHaveValue("");
});

test("PC에서는 일정과 지도를 함께 보여 주고, 지도를 못 불러와도 일정은 그대로다 @desktop", async ({ page }) => {
  await prepare(page);
  await startFromFestival(page);
  await expect(page.getByRole("region", { name: "코스 지도" })).toBeAttached();
  await expect(page.getByText("지도를 불러오지 못했어요")).toBeVisible();
  await expect(page.getByText("18:30~19:30 고정")).toBeVisible();
});
