import { describe, expect, it } from "vitest";
import type { CreatorCourse, Festival, Place } from "@/shared/domain";
import {
  courseSchema,
  courseToValues,
  festivalSchema,
  festivalToValues,
  fromRanges,
  placeSchema,
  placeToValues,
  toRanges,
  valuesToCourse,
  valuesToFestival,
  valuesToPlace,
} from "./content-form";

const check = { state: "verified" as const, source: "공식 홈페이지", checkedAt: "2026-10-01" };

const festival: Festival = {
  id: "f1",
  name: "항구 축제",
  sigun: "mokpo",
  summary: "소개",
  startDate: "2026-10-16",
  endDate: "2026-10-18",
  days: [
    { date: "2026-10-16", ranges: [{ open: "10:00", close: "22:00" }] },
    { date: "2026-10-17", ranges: null },
    { date: "2026-10-18", ranges: [] },
  ],
  programs: [{ id: "p1", name: "불꽃놀이", date: "2026-10-17", start: "20:00", end: "20:30" }],
  location: { lat: 34.78, lng: 126.38 },
  photos: ["https://example.com/a.jpg"],
  state: "scheduled",
  checks: { schedule: check, location: { state: "unverified" }, info: { state: "conflict" } },
  status: "published",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const place: Place = {
  id: "p1",
  name: "항구 식당",
  sigun: "mokpo",
  category: "restaurant",
  subcategory: "한식",
  moods: ["오션뷰"],
  purposes: [],
  address: "목포시 어딘가",
  location: null,
  hours: {
    weekly: {
      0: [],
      1: [
        { open: "11:00", close: "15:00", lastOrder: "14:30" },
        { open: "17:00", close: "21:00" },
      ],
      2: null,
      3: null,
      4: null,
      5: null,
      6: null,
    },
    exceptions: [{ date: "2026-10-03", ranges: [], note: "개천절 휴무" }],
  },
  facts: { parking: true, reservation: null, pets: false },
  photos: [],
  sources: [{ platform: "official", url: "https://example.com", label: "공식" }],
  checks: { location: check, hours: check, info: check },
  status: "draft",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const course: CreatorCourse = {
  id: "c1",
  title: "목포 1박2일",
  creator: { name: "여행가", channelUrl: "https://youtube.com/@x" },
  sourceUrl: "https://youtube.com/watch?v=1",
  siguns: ["mokpo"],
  tags: ["바다"],
  orderBasis: "video_order",
  days: [
    { day: 2, items: [{ placeId: "b" }] },
    { day: 1, items: [{ placeId: "a", note: "점심" }] },
  ],
  status: "published",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("content-form 변환", () => {
  it("영업 미확인(null)·휴무([])·구간을 구분해 오간다", () => {
    expect(toRanges(fromRanges(null))).toBeNull();
    expect(toRanges(fromRanges([]))).toEqual([]);
    const r = [{ open: "11:00", close: "15:00", lastOrder: "14:30" }];
    expect(toRanges(fromRanges(r))).toEqual(r);
    expect(toRanges({ mode: "open", ranges: [] })).toBeNull();
  });

  it("축제는 폼을 거쳐도 같은 내용으로 돌아온다", () => {
    const values = festivalSchema.parse(festivalToValues(festival));
    expect(valuesToFestival("f1", values, festival)).toEqual(festival);
  });

  it("축제 기간을 줄이면 기간 밖 날짜 운영은 버리고, 늘린 날짜는 미확인으로 둔다", () => {
    const values = festivalToValues(festival);
    const f = valuesToFestival(
      "f1",
      { ...values, startDate: "2026-10-17", endDate: "2026-10-19" },
      festival,
    );
    expect(f.days).toEqual([
      { date: "2026-10-17", ranges: null },
      { date: "2026-10-18", ranges: [] },
      { date: "2026-10-19", ranges: null },
    ]);
  });

  it("프로그램 날짜가 기간 밖이면 막는다", () => {
    const values = festivalToValues(festival);
    const r = festivalSchema.safeParse({
      ...values,
      programs: [{ ...values.programs[0], date: "2026-11-01" }],
    });
    expect(r.success).toBe(false);
  });

  it("장소는 요일별 영업·예외일·사실·출처가 그대로 돌아온다", () => {
    const values = placeSchema.parse(placeToValues(place));
    expect(valuesToPlace("p1", values, place)).toEqual(place);
  });

  it("좌표는 둘 다 넣거나 둘 다 비워야 한다", () => {
    const values = placeToValues(place);
    expect(placeSchema.safeParse({ ...values, location: { lat: "34.8", lng: "" } }).success).toBe(
      false,
    );
    expect(
      placeSchema.safeParse({ ...values, location: { lat: "37.5", lng: "127" } }).success,
    ).toBe(false);
  });

  it("코스는 일차 순서대로 다시 번호를 매긴다", () => {
    const values = courseSchema.parse(courseToValues(course));
    const c = valuesToCourse("c1", values, course);
    expect(c.days).toEqual([
      { day: 1, items: [{ placeId: "a", note: "점심" }] },
      { day: 2, items: [{ placeId: "b" }] },
    ]);
    expect(c.creator).toEqual(course.creator);
  });

  it("지역을 고르지 않으면 저장할 수 없다", () => {
    const r = placeSchema.safeParse({ ...placeToValues(place), sigun: "" });
    expect(r.success).toBe(false);
  });
});
