import { describe, expect, test } from "vitest";
import { readHomeFilter, withQuery } from "./home-filter";

const TODAY = "2026-10-20";
const read = (q: string) => readHomeFilter(new URLSearchParams(q), TODAY);

describe("readHomeFilter", () => {
  test("조건이 없으면 전체 지역 · 오늘", () => {
    expect(read("")).toEqual({ sigun: null, date: TODAY });
  });
  test("시군 코드와 오늘 이후 날짜를 그대로 읽는다", () => {
    expect(read("sigun=mokpo&date=2026-10-24")).toEqual({ sigun: "mokpo", date: "2026-10-24" });
  });
  test("모르는 시군·지난 날짜·없는 날짜·모양이 틀린 날짜는 버린다", () => {
    expect(read("sigun=seoul").sigun).toBeNull();
    expect(read("date=2026-10-19").date).toBe(TODAY);
    expect(read("date=2027-02-30").date).toBe(TODAY);
    expect(read("date=tomorrow").date).toBe(TODAY);
  });
});

describe("withQuery", () => {
  test("값이 있는 것만 붙이고, 없으면 경로만", () => {
    expect(withQuery("/places", { sigun: "mokpo", date: null })).toBe("/places?sigun=mokpo");
    expect(withQuery("/places", { sigun: null })).toBe("/places");
  });
});
