import { describe, expect, it, test } from "vitest";
import {
  addDays,
  formatDay,
  kstDateOf,
  kstDateTimeOf,
  dateRange,
  dayOfWeek,
  diffDays,
  fromMinutes,
  overlaps,
  todayKst,
  toMinutes,
  withStringDates,
} from "./date";

describe("withStringDates", () => {
  const ts = (iso: string) => ({ toDate: () => new Date(iso) });
  it("Timestamp는 문자열로 바꾼다 (updatedAt=ISO, reviewedAt=KST 날짜)", () => {
    expect(
      withStringDates({
        id: "a",
        updatedAt: ts("2026-10-19T16:30:00.000Z"),
        reviewedAt: ts("2026-10-19T16:30:00.000Z"),
      }),
    ).toEqual({ id: "a", updatedAt: "2026-10-19T16:30:00.000Z", reviewedAt: "2026-10-20" });
  });
  it("문자열은 그대로 둔다", () => {
    const doc = { updatedAt: "2026-10-19T00:00:00.000Z", reviewedAt: "2026-10-18" };
    expect(withStringDates(doc)).toEqual(doc);
  });
  it("누락·못 읽는 값은 updatedAt은 빈 문자열, reviewedAt은 뺀다", () => {
    const noDate: { name: string; updatedAt?: string } = { name: "x" };
    expect(withStringDates(noDate)).toEqual({ name: "x", updatedAt: "" });
    expect(withStringDates({ updatedAt: null, reviewedAt: 3 })).toEqual({
      updatedAt: "",
      reviewedAt: undefined,
    });
  });
});

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

describe("formatDay", () => {
  it("언어별로 요일까지 표기한다", () => {
    expect(formatDay("2026-10-16", "ko")).toBe("10월 16일 (금)");
    expect(formatDay("2026-10-16", "en")).toBe("Fri, Oct 16");
    expect(formatDay("2026-10-16", "ja")).toBe("10月16日(金)");
  });
});
