import { describe, expect, test } from "vitest";
import { newTripDraft } from "@/features/trips";
import type { CreatorCourse, Place } from "@/shared/domain";
import {
  closedWeekdaysLabel,
  copyCourseIntoDraft,
  courseDayCount,
  filterCourses,
  hoursUnknown,
} from "./course";
import { safeHttpUrl } from "@/shared/lib/format";

function place(id: string): Place {
  return {
    id,
    name: `장소 ${id}`,
    sigun: "suncheon",
    category: "attraction",
    moods: [],
    purposes: [],
    location: { lat: 34.95, lng: 127.48 },
    hours: {
      weekly: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      exceptions: [],
    },
    facts: { parking: null, reservation: null, pets: null },
    photos: [],
    sources: [],
    checks: {
      location: { state: "verified" },
      hours: { state: "unverified" },
      info: { state: "unverified" },
    },
    status: "published",
    updatedAt: "2026-10-19T00:00:00.000Z",
  };
}

const course: CreatorCourse = {
  id: "c1",
  title: "샘플 코스",
  creator: { name: "남도여행길잡이" },
  sourceUrl: "https://example.com",
  siguns: ["suncheon", "yeosu"],
  tags: ["계절"],
  orderBasis: "editor_suggested",
  days: [
    { day: 2, items: [{ placeId: "c" }] },
    { day: 1, items: [{ placeId: "a" }, { placeId: "gone" }, { placeId: "b" }] },
    { day: 3, items: [{ placeId: "d" }] },
  ],
  status: "published",
  updatedAt: "2026-10-19T00:00:00.000Z",
};

const places = Object.fromEntries(["a", "b", "c", "d"].map((id) => [id, place(id)]));

function draft(endDate: string) {
  return newTripDraft({
    startDate: "2026-10-20",
    endDate,
    siguns: [],
    pace: null,
    origin: { kind: "creator", courseId: "c1" },
  });
}

describe("creator course", () => {
  test("일수는 가장 큰 일차 번호", () => {
    expect(courseDayCount(course)).toBe(3);
  });

  test("일차·순서를 그대로 옮기고 없는 장소는 센다", () => {
    const { trip, missing } = copyCourseIntoDraft(draft("2026-10-22"), course, places);
    expect(trip.days.map((d) => d.items.map((i) => i.snapshot.name))).toEqual([
      ["장소 a", "장소 b"],
      ["장소 c"],
      ["장소 d"],
    ]);
    expect(trip.unplaced).toEqual([]);
    expect(missing).toBe(1);
    expect(trip.origin).toEqual({ kind: "creator", courseId: "c1" });
  });

  test("짧은 기간을 고르면 넘치는 일차는 미배치 후보로 보존한다", () => {
    const { trip } = copyCourseIntoDraft(draft("2026-10-20"), course, places);
    expect(trip.days).toHaveLength(1);
    expect(trip.days[0]?.items.map((i) => i.snapshot.name)).toEqual(["장소 a", "장소 b"]);
    expect(trip.unplaced.map((i) => [i.snapshot.name, i.reason])).toEqual([
      ["장소 c", "원본 코스 2일차 장소예요."],
      ["장소 d", "원본 코스 3일차 장소예요."],
    ]);
  });

  test("지역·일수·태그로 거른다", () => {
    expect(filterCourses([course], { sigun: "yeosu", days: 3, tag: "계절" })).toHaveLength(1);
    expect(filterCourses([course], { sigun: "mokpo", days: null, tag: null })).toHaveLength(0);
    expect(filterCourses([course], { sigun: null, days: 2, tag: null })).toHaveLength(0);
    expect(filterCourses([course], { sigun: null, days: null, tag: "뚜벅이" })).toHaveLength(0);
  });

  test("요일별 영업시간이 하나라도 있으면 미확인이 아니다", () => {
    const p = place("x");
    expect(hoursUnknown(p)).toBe(true);
    p.hours.weekly[1] = [{ open: "09:00", close: "18:00" }];
    expect(hoursUnknown(p)).toBe(false);
  });

  test("같은 일차에 겹친 장소는 배치·미배치 모두 한 번만 담고 센다", () => {
    const dup: CreatorCourse = {
      ...course,
      days: [
        { day: 1, items: [{ placeId: "a" }, { placeId: "a" }] },
        { day: 2, items: [{ placeId: "c" }, { placeId: "c" }] },
      ],
    };
    const { trip, duplicates } = copyCourseIntoDraft(draft("2026-10-20"), dup, places);
    expect(trip.days[0]?.items).toHaveLength(1);
    expect(trip.unplaced).toHaveLength(1);
    expect(duplicates).toBe(2);
  });

  test("정기 휴무 요일만 표기하고 미확인은 휴무로 치지 않는다", () => {
    const p = place("x");
    expect(closedWeekdaysLabel(p)).toBeNull();
    p.hours.weekly[1] = [];
    p.hours.weekly[2] = [];
    expect(closedWeekdaysLabel(p)).toBe("월·화 휴무");
  });

  test("http(s) 주소만 링크로 쓴다", () => {
    expect(safeHttpUrl("https://www.namdokorea.com/a")).toBe("https://www.namdokorea.com/a");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });
});
