import { describe, expect, it } from "vitest";
import type { OpeningHours } from "@/shared/domain";
import { hoursUnknown, weeklyRows } from "./hours";
import { placeFilterParams, readPlaceFilter } from "./place-filter";

describe("readPlaceFilter", () => {
  it("모르는 값은 버리고 종류는 화면 순서로 맞춘다", () => {
    const f = readPlaceFilter(
      new URLSearchParams("sigun=nowhere&category=lodging,x,attraction&q= 유달 "),
    );
    expect(f).toEqual({ sigun: null, categories: ["attraction", "lodging"], q: "유달" });
  });

  it("URL 파라미터로 되돌리면 같은 조건이 나온다", () => {
    const f = readPlaceFilter(new URLSearchParams("sigun=mokpo&category=cafe"));
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(placeFilterParams(f))) if (v) p.set(k, v);
    expect(readPlaceFilter(p)).toEqual(f);
    expect(p.has("q")).toBe(false);
  });
});

describe("영업시간 표기", () => {
  const unknown: OpeningHours = {
    weekly: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
    exceptions: [],
  };

  it("전부 null이면 미확인, 휴무([])와 구분한다", () => {
    expect(hoursUnknown(unknown)).toBe(true);
    const mondayOff = { ...unknown, weekly: { ...unknown.weekly, 1: [] } };
    expect(hoursUnknown(mondayOff)).toBe(false);
    expect(weeklyRows(mondayOff)[0]).toEqual({ day: "월", text: "휴무", known: true });
    expect(weeklyRows(mondayOff)[6]).toEqual({ day: "일", text: "확인 필요", known: false });
  });

  it("주문 마감을 함께 적는다", () => {
    const h = {
      ...unknown,
      weekly: { ...unknown.weekly, 2: [{ open: "11:00", close: "15:00", lastOrder: "14:30" }] },
    };
    expect(weeklyRows(h)[1]?.text).toBe("11:00~15:00 (마감 14:30)");
  });
});
