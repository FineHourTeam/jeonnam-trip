import { describe, expect, test } from "vitest";
import type { OpeningHours, PlaceCategory, TimeRange, VisitItem } from "@/shared/domain";
import { estimateDriveMin, recommendTrip } from "./recommend";

const allWeek = (ranges: TimeRange[] | null): OpeningHours => ({
  weekly: { 0: ranges, 1: ranges, 2: ranges, 3: ranges, 4: ranges, 5: ranges, 6: ranges },
  exceptions: [],
});

let seq = 0;
function item(
  name: string,
  category: PlaceCategory,
  hours: OpeningHours | undefined,
  stayMin = 60,
  location: { lat: number; lng: number } | null = { lat: 34.95 + seq * 0.002, lng: 127.49 },
): VisitItem {
  seq += 1;
  return {
    id: `id-${name}`,
    ref: { kind: "place", placeId: name },
    snapshot: { name, category, location, hours, capturedAt: "2026-10-16T00:00:00Z" },
    stayMin,
    stayLocked: false,
  };
}

const OPEN = allWeek([{ open: "09:00", close: "21:00" }]);

describe("recommendTrip", () => {
  test("사용자가 고른 장소를 우선 배치하고, 넣지 못한 것은 이유와 함께 남긴다", () => {
    const picked = [
      item("정원", "attraction", OPEN, 90),
      item("식당", "restaurant", allWeek([{ open: "11:00", close: "15:00", lastOrder: "14:00" }])),
      item("미확인 상점", "shop", allWeek(null), 40),
      item("위치 없음", "attraction", OPEN, 60, null),
    ];
    const r = recommendTrip({
      dates: ["2026-10-23"],
      dayStart: "09:00",
      dayEnd: "21:00",
      pace: null,
      picked,
      suggestions: [],
      fixed: [],
    });
    const names = r.days[0]?.map((x) => x.snapshot.name);
    expect(names).toContain("정원");
    expect(names).toContain("식당");
    expect(r.unplaced.map((u) => u.snapshot.name).sort()).toEqual(["미확인 상점", "위치 없음"]);
    expect(r.unplaced.every((u) => u.reason.length > 0)).toBe(true);
  });

  test("식당은 점심 시간대로 배치한다", () => {
    const r = recommendTrip({
      dates: ["2026-10-23"],
      dayStart: "09:00",
      dayEnd: "21:00",
      pace: null,
      picked: [item("식당", "restaurant", OPEN), item("관광지", "attraction", OPEN, 120)],
      suggestions: [],
      fixed: [],
    });
    expect(r.days[0]?.map((x) => x.snapshot.name)).toEqual(["관광지", "식당"]);
  });

  test("고정 프로그램 앞에는 시간 안에 끝나는 후보만 둔다", () => {
    const program: VisitItem = {
      ...item("개막 공연", "attraction", OPEN, 60),
      ref: { kind: "festival", festivalId: "f", programId: "p" },
      snapshot: {
        name: "축제 · 개막 공연",
        category: "festival",
        location: { lat: 34.95, lng: 127.49 },
        dayRanges: [{ open: "10:00", close: "21:00" }],
        capturedAt: "2026-10-16T00:00:00Z",
      },
      fixedStart: "10:30",
      fixedEnd: "11:30",
    };
    const long = item("긴 관광", "attraction", OPEN, 180);
    const r = recommendTrip({
      dates: ["2026-10-23"],
      dayStart: "09:00",
      dayEnd: "12:00",
      pace: null,
      picked: [long],
      suggestions: [],
      fixed: [{ date: "2026-10-23", item: program }],
    });
    expect(r.days[0]?.map((x) => x.snapshot.name)).toEqual(["축제 · 개막 공연"]);
    expect(r.unplaced.map((u) => u.snapshot.name)).toEqual(["긴 관광"]);
  });

  test("여유롭게는 하루 장소 수를 줄이고 체류를 늘린다, 추천 후보는 미배치로 남기지 않는다", () => {
    const suggestions = Array.from({ length: 8 }, (_, i) =>
      item(`후보${String(i)}`, "attraction", OPEN, 40),
    );
    const relaxed = recommendTrip({
      dates: ["2026-10-23"],
      dayStart: "09:00",
      dayEnd: "21:00",
      pace: "relaxed",
      picked: [],
      suggestions,
      fixed: [],
    });
    const packed = recommendTrip({
      dates: ["2026-10-23"],
      dayStart: "09:00",
      dayEnd: "21:00",
      pace: "packed",
      picked: [],
      suggestions,
      fixed: [],
    });
    expect(relaxed.days[0]?.length).toBe(3);
    expect(relaxed.days[0]?.[0]?.stayMin).toBe(60);
    expect(packed.days[0]?.length).toBeGreaterThan(3);
    expect(relaxed.unplaced).toEqual([]);
  });

  test("휴무인 날은 피해 다른 날에 넣는다", () => {
    const closedFri: OpeningHours = { ...OPEN, exceptions: [{ date: "2026-10-23", ranges: [] }] };
    const r = recommendTrip({
      dates: ["2026-10-23", "2026-10-24"],
      dayStart: "09:00",
      dayEnd: "21:00",
      pace: null,
      picked: [item("금요일 휴무", "cafe", closedFri, 45)],
      suggestions: [],
      fixed: [],
    });
    expect(r.days[0]).toEqual([]);
    expect(r.days[1]?.[0]?.snapshot.name).toBe("금요일 휴무");
  });

  test("추정 이동시간은 최소 5분", () => {
    expect(estimateDriveMin({ lat: 34.9, lng: 127.5 }, { lat: 34.9, lng: 127.5 })).toBe(5);
  });
});
