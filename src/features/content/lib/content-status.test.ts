import { describe, expect, test } from "vitest";
import type { Place } from "@/shared/domain";
import {
  EMPTY_PLACE_FILTER,
  festivalPhase,
  matchesPlace,
  openStateAt,
  sortPlacesByTagMatch,
} from "./content-status";

const lunchDinner = [
  { open: "11:00", close: "15:00", lastOrder: "14:20" },
  { open: "17:00", close: "21:00" },
];

function place(over: Partial<Place> = {}): Place {
  return {
    id: "p",
    name: "골목 식당",
    sigun: "suncheon",
    category: "restaurant",
    subcategory: "한식",
    moods: ["한옥"],
    purposes: ["가족 식사"],
    location: { lat: 34.9, lng: 127.5 },
    hours: {
      weekly: {
        0: [],
        1: lunchDinner,
        2: lunchDinner,
        3: lunchDinner,
        4: lunchDinner,
        5: lunchDinner,
        6: null,
      },
      exceptions: [],
    },
    facts: { parking: true, reservation: null, pets: false },
    photos: [],
    sources: [],
    checks: {
      location: { state: "verified" },
      hours: { state: "verified" },
      info: { state: "unverified" },
    },
    status: "published",
    updatedAt: "2026-10-16T00:00:00Z",
    ...over,
  };
}

describe("festivalPhase", () => {
  test("기간 안·전·후를 KST 날짜로 판정한다", () => {
    const f = { startDate: "2026-10-23", endDate: "2026-10-25" };
    expect(festivalPhase(f, "2026-10-22")).toBe("upcoming");
    expect(festivalPhase(f, "2026-10-25")).toBe("ongoing");
    expect(festivalPhase(f, "2026-10-26")).toBe("ended");
  });
});

describe("openStateAt", () => {
  const p = place();
  test("브레이크타임·영업 전·휴무·미확인을 구분한다", () => {
    expect(openStateAt(p, "2026-10-23", "15:30")).toEqual({ kind: "break", reopen: "17:00" });
    expect(openStateAt(p, "2026-10-23", "10:00")).toEqual({ kind: "before", opens: "11:00" });
    expect(openStateAt(p, "2026-10-23", "12:00").kind).toBe("open");
    expect(openStateAt(p, "2026-10-25", "12:00").kind).toBe("closed-day");
    expect(openStateAt(p, "2026-10-24", "12:00").kind).toBe("unknown");
  });
});

describe("matchesPlace", () => {
  test("같은 묶음 OR, 다른 축 AND, 미확인 이용 조건은 통과시키지 않는다", () => {
    const p = place();
    expect(matchesPlace(p, { ...EMPTY_PLACE_FILTER, moods: ["한옥", "오션뷰"] })).toBe(true);
    expect(matchesPlace(p, { ...EMPTY_PLACE_FILTER, moods: ["오션뷰"] })).toBe(false);
    expect(matchesPlace(p, { ...EMPTY_PLACE_FILTER, moods: ["한옥"], purposes: ["데이트"] })).toBe(
      false,
    );
    expect(matchesPlace(p, { ...EMPTY_PLACE_FILTER, facts: ["parking"] })).toBe(true);
    expect(matchesPlace(p, { ...EMPTY_PLACE_FILTER, facts: ["reservation"] })).toBe(false);
    expect(matchesPlace(p, { ...EMPTY_PLACE_FILTER, keyword: "골목" })).toBe(true);
  });

  test("태그를 고르면 많이 맞는 순으로 정렬한다", () => {
    const a = place({ id: "a", name: "가", moods: ["정원"], purposes: [] });
    const b = place({ id: "b", name: "나", moods: ["정원"], purposes: ["사진"] });
    const sorted = sortPlacesByTagMatch([a, b], {
      ...EMPTY_PLACE_FILTER,
      moods: ["정원"],
      purposes: ["사진"],
    });
    expect(sorted.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
