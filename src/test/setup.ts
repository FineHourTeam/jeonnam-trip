// Vitest 공통 셋업 — RTL matcher 확장 + i18n 초기화(기본 한국어) + 테스트 간 정리.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@/lib/i18n";

afterEach(() => {
  cleanup();
});
