import { describe, expect, test } from "vitest";
import { formatDateDot } from "./format";

describe("formatDateDot", () => {
  test("UTC 일시는 한국 날짜로 표기한다 (자정~오전 9시에 하루 전으로 보이던 버그)", () => {
    expect(formatDateDot("2026-10-24T15:30:00.000Z")).toBe("2026. 10. 25.");
    expect(formatDateDot("2026-10-24T14:59:00.000Z")).toBe("2026. 10. 24.");
  });
  test("날짜만 있으면 그대로", () => {
    expect(formatDateDot("2026-10-16")).toBe("2026. 10. 16.");
  });
});
