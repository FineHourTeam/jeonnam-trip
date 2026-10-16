// Vitest 공통 셋업 — RTL matcher 확장 + 테스트 간 정리.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
