// Playwright 설정 표준 예시 — 프로젝트 루트 playwright.config.ts로 복사.
// build → preview를 자동 기동해 프로덕션 번들을 대상으로 스모크를 돌린다 (dev 서버 아님 —
// 배포될 코드 그대로 검증). CI에서도 동일 config 재사용.
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173; // vite preview 기본 포트

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // 스모크는 프로덕션 프리뷰 대상 — 로컬 4종 게이트가 통과한 build 산출물을 그대로 띄운다
  webServer: {
    command: "npm run build && npm run preview",
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
