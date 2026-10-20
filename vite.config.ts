// ⚠️ React Compiler 배선 주의 (pitfalls.md 참조): @vitejs/plugin-react v6부터 내부가
// Babel → Oxc로 바뀌어 구식 babel 옵션 예제가 동작하지 않을 수 있다.
// 도입 시 사용하는 plugin-react 버전의 공식 문서 경로를 먼저 확인할 것.
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
// import { sentryVitePlugin } from "@sentry/vite-plugin"; // Sentry 도입 시 주석 해제

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Sentry 소스맵 업로드 — 없으면 프로덕션 에러가 minified 스택으로만 온다
    // (unknown-unknowns #50). SENTRY_AUTH_TOKEN은 CI 시크릿 (VITE_ 접두사 금지!).
    // sentryVitePlugin({
    //   org: "[SENTRY_ORG]",
    //   project: "[SENTRY_PROJECT]",
    //   authToken: process.env.SENTRY_AUTH_TOKEN,
    // }),
  ],
  resolve: {
    alias: {
      // ESM 환경이라 __dirname 없음 — URL API 사용
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // 로컬 dev CORS 회피 — /api 호출을 에뮬레이터 함수로 프록시 (docs/CORS.md § 4).
  // 함수 이름이 `api`라 접두사를 지우지 않는다: /api/directions → …/asia-northeast3/api/directions.
  server: {
    proxy: {
      // 더 구체적인 경로가 먼저 — 카카오 로그인은 별도 함수 authKakao
      "/api/auth/kakao": {
        target: "http://127.0.0.1:5001/jeonnam-trip/asia-northeast3",
        changeOrigin: true,
        rewrite: () => "/authKakao",
      },
      "/api": {
        target: "http://127.0.0.1:5001/jeonnam-trip/asia-northeast3",
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: "hidden", // Sentry 업로드용 생성, dist에서 참조 주석은 제거
    rollupOptions: {
      output: {
        // 초기 번들에서 무거운 vendor 분리 — 성능 예산(rules.md § 빌드/배포) 준수 장치.
        // Vite 8(Rolldown)은 객체형 manualChunks 미지원 — 함수형만 사용 (Vite 7 이하도 호환).
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) return "firebase";
          if (/node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(id)) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
  test: {
    // Vitest — vite config 공유 (vitest.config 별도 파일 불필요)
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"], // e2e/*.spec.ts는 Playwright 몫

    coverage: { provider: "v8" },
  },
});
