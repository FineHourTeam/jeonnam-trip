import { describe, expect, test } from "vitest";
import {
  addDays,
  kstDateOf,
  kstDateTimeOf,
  dateRange,
  dayOfWeek,
  diffDays,
  fromMinutes,
  overlaps,
  todayKst,
  toMinutes,
} from "./date";

describe("date utils (KST)", () => {
  test("todayKst는 UTC 15시 이후를 다음 날로 본다", () => {
    expect(todayKst(new Date("2026-10-16T14:59:00Z"))).toBe("2026-10-16");
    expect(todayKst(new Date("2026-10-16T15:00:00Z"))).toBe("2026-10-17");
  });
  test("날짜 계산", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(diffDays("2026-10-16", "2026-10-19")).toBe(3);
    expect(dateRange("2026-10-16", "2026-10-18")).toEqual([
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
    expect(dayOfWeek("2026-10-16")).toBe(5);
  });
  test("기간 겹침은 양 끝 포함", () => {
    expect(overlaps("2026-10-01", "2026-10-10", "2026-10-10", "2026-10-12")).toBe(true);
    expect(overlaps("2026-10-01", "2026-10-09", "2026-10-10", "2026-10-12")).toBe(false);
  });
  test("시각 변환", () => {
    expect(toMinutes("13:30")).toBe(810);
    expect(fromMinutes(810)).toBe("13:30");
  });
});

describe("kstDateOf / kstDateTimeOf", () => {
  test("UTC 자정 전후를 KST 날짜로 바꾼다", () => {
    expect(kstDateOf("2026-10-19T16:30:00.000Z")).toBe("2026-10-20");
    expect(kstDateOf("2026-10-19T14:59:00.000Z")).toBe("2026-10-19");
    expect(kstDateTimeOf("2026-10-19T16:30:00.000Z")).toBe("2026-10-20 01:30");
  });
});
