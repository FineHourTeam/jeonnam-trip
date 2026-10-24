import { describe, expect, test } from "vitest";
import type { CreatorCourse, Festival, Place } from "@/shared/domain";
import { buildStartDraft, type StartTripInput } from "./start-trip";

const OPEN = [{ open: "09:00", close: "21:00" }];
function place(id: string, over: Partial<Place> = {}): Place {
  return {
    id,
    name: id,
    sigun: "suncheon",
    category: "attraction",
    moods: [],
    purposes: [],
    location: { lat: 34.95, lng: 127.49 },
    hours: { weekly: { 0: OPEN, 1: OPEN, 2: OPEN, 3: OPEN, 4: OPEN, 5: OPEN, 6: OPEN }, exceptions: [] },
    facts: { parking: null, reservation: null, pets: null },
    photos: [],
    sources: [],
    checks: { location: { state: "verified" }, hours: { state: "verified" }, info: { state: "unverified" } },
    status: "published",
    updatedAt: "2026-10-16T00:00:00Z",
    ...over,
  };
}

const base: StartTripInput = {
  startDate: "2026-10-23",
  endDate: "2026-10-24",
  siguns: ["suncheon"],
  pace: null,
  startMode: "direct",
  dayStart: "10:00",
  dayEnd: "20:00",
  picked: [],
  suggestions: [],
};

const festival: Festival = {
  id: "fes",
  name: "[샘플] 강변 가을축제",
  sigun: "suncheon",
  startDate: "2026-10-23",
  endDate: "2026-10-25",
  days: [{ date: "2026-10-24", ranges: [{ open: "10:00", close: "21:00" }] }],
  programs: [{ id: "p1", name: "등불 행진", date: "2026-10-24", start: "18:30", end: "19:30" }],
  location: { lat: 34.94, lng: 127.5 },
  photos: [],
  state: "scheduled",
  checks: { schedule: { state: "verified" }, location: { state: "verified" }, info: { state: "unverified" } },
  status: "published",
  updatedAt: "2026-10-16T00:00:00Z",
};

describe("buildStartDraft", () => {
  test("일차별 시작·종료 시각을 적용하고, 축제는 방문일 일차에 프로그램 시간을 고정해 넣는다", () => {
    const d = buildStartDraft({ ...base, festival: { festival, date: "2026-10-24", programId: "p1" } });
    expect(d.days.map((x) => x.startTime)).toEqual(["10:00", "10:00"]);
    expect(d.days[1]?.items[0]?.fixedStart).toBe("18:30");
    expect(d.title).toBe("강변 가을축제 여행");
    expect(d.origin).toEqual({ kind: "festival", festivalId: "fes" });
  });

  test("직접 만들기 + 여러 날이면 고른 장소를 미배치로 두고 일차를 고르게 한다", () => {
    const d = buildStartDraft({ ...base, picked: [place("a"), place("b")] });
    expect(d.days.every((x) => x.items.length === 0)).toBe(true);
    expect(d.unplaced.map((u) => u.snapshot.name)).toEqual(["a", "b"]);
  });

  test("하루 여행 직접 만들기는 고른 순서대로 1일차에 넣는다", () => {
    const d = buildStartDraft({ ...base, endDate: "2026-10-23", picked: [place("b"), place("a")] });
    expect(d.days[0]?.items.map((x) => x.snapshot.name)).toEqual(["b", "a"]);
  });

  test("크리에이터 코스를 짧은 기간에 복사하면 넘치는 일차를 이유와 함께 미배치로 보존한다", () => {
    const course: CreatorCourse = {
      id: "c",
      title: "[샘플] 순천 2박 3일",
      creator: { name: "샘플" },
      sourceUrl: "https://example.com",
      siguns: ["suncheon"],
      tags: [],
      orderBasis: "video_order",
      days: [
        { day: 1, items: [{ placeId: "a" }, { placeId: "b" }] },
        { day: 2, items: [{ placeId: "c" }] },
        { day: 3, items: [{ placeId: "d" }, { placeId: "gone" }] },
      ],
      status: "published",
      updatedAt: "2026-10-16T00:00:00Z",
    };
    const d = buildStartDraft({
      ...base,
      course: { course, places: [place("a"), place("b"), place("c"), place("d")] },
    });
    expect(d.days[0]?.items.map((x) => x.snapshot.name)).toEqual(["a", "b"]);
    expect(d.days[1]?.items.map((x) => x.snapshot.name)).toEqual(["c"]);
    expect(d.unplaced.map((x) => x.snapshot.name)).toEqual(["d"]);
    expect(d.unplaced[0]?.reason).toContain("원본 3일차");
    expect(d.origin).toEqual({ kind: "creator", courseId: "c" });
  });

  test("추천 시작은 고른 장소와 지역 후보로 일차를 채운다", () => {
    const d = buildStartDraft({
      ...base,
      startMode: "recommend",
      picked: [place("꼭 갈 곳")],
      suggestions: [place("후보1"), place("후보2")],
    });
    const names = d.days.flatMap((x) => x.items.map((i) => i.snapshot.name));
    expect(names).toContain("꼭 갈 곳");
    expect(d.unplaced).toEqual([]);
  });

  test("제목을 비우면 지역 이름으로 정한다", () => {
    expect(buildStartDraft(base).title).toBe("순천시 여행");
    expect(buildStartDraft({ ...base, siguns: ["suncheon", "yeosu"] }).title).toBe("순천시·여수시 여행");
    expect(buildStartDraft({ ...base, siguns: ["suncheon", "yeosu", "mokpo"] }).title).toBe("순천시 외 2곳 여행");
    expect(buildStartDraft({ ...base, siguns: [] }).title).toBe("새 여행");
    expect(buildStartDraft({ ...base, title: "  가을 여행 " }).title).toBe("가을 여행");
  });
});
