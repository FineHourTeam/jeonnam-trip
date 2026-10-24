// E2E — 에뮬레이터(firebase.e2e.json 포트) + dev 서버(테스트 로그인은 DEV + 에뮬레이터에서만 열린다).
// 스모크(playwright.config.ts)는 프로덕션 번들 렌더 확인용, 이 설정은 핵심 흐름(만들기·저장·보관함·공유·관리자) 확인용.
// 실행: npm run e2e   (사전: npx playwright install chromium, Java — Firestore 에뮬레이터)
import { defineConfig, devices } from "@playwright/test";

const PORT = 5173;
const EMU_ENV = {
  VITE_EMULATOR_AUTH_PORT: "19099",
  VITE_EMULATOR_FIRESTORE_PORT: "18080",
  VITE_EMULATOR_STORAGE_PORT: "19199",
};

export default defineConfig({
  testDir: "./e2e",
  testMatch: /flows\.spec\.ts/,
  // 개발 머신이 느려 병렬 실행은 오히려 흔들린다 — 한 줄로
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] }, grepInvert: /@desktop/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grep: /@desktop/ },
  ],
  webServer: [
    {
      command: "npx firebase emulators:start --project jeonnam-trip --config firebase.e2e.json",
      port: 18080,
      reuseExistingServer: true,
      timeout: 240_000,
    },
    {
      command: `npx vite --port ${String(PORT)} --strictPort`,
      port: PORT,
      env: EMU_ENV,
      reuseExistingServer: true,
      timeout: 240_000,
    },
  ],
});
