import { describe, expect, it } from "vitest";
import type { CreatorCourse, Festival, Place } from "@/shared/domain";
import {
  courseDraftSchema,
  courseSchema,
  emptyFestivalValues,
  festivalDraftSchema,
  courseToValues,
  festivalSchema,
  festivalToValues,
  fromRanges,
  placeDraftSchema,
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

  it("관리자 저장이 사진 출처를 잃지 않는다", () => {
    const credited = { ...festival, photoCredit: "사진: 목포시 · 공공누리 제4유형" };
    const values = festivalSchema.parse(festivalToValues(credited));
    expect(valuesToFestival("f1", values, credited).photoCredit).toBe(credited.photoCredit);
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

  it("화면에 떴지만 고르지 않은 날짜 칸(undefined)이 있어도 새 축제를 저장할 수 있다", () => {
    const values = {
      ...emptyFestivalValues("2026-10-20"),
      name: "새 축제",
      sigun: "mokpo",
      days: { "2026-10-20": undefined },
    };
    const parsed = festivalSchema.parse(values);
    expect(valuesToFestival("new", parsed).days).toEqual([{ date: "2026-10-20", ranges: null }]);
  });

  it("초안은 지역·원문 주소 없이도 저장되고, 공개는 막는다", () => {
    const f = { ...emptyFestivalValues("2026-10-20"), name: "이름만" };
    expect(festivalDraftSchema.safeParse(f).success).toBe(true);
    expect(festivalSchema.safeParse(f).success).toBe(false);
    const p = { ...placeToValues(place), sigun: "" };
    expect(placeDraftSchema.safeParse(p).success).toBe(true);
    const c = { ...courseToValues(course), sourceUrl: "", siguns: [] };
    expect(courseDraftSchema.safeParse(c).success).toBe(true);
    expect(courseSchema.safeParse(c).success).toBe(false);
  });

  it("휴무가 아닌 예외일에 영업 구간이 없으면 막는다", () => {
    const values = placeToValues(place);
    const r = placeSchema.safeParse({
      ...values,
      exceptions: [{ date: "2026-10-03", closed: false, ranges: [], note: "" }],
    });
    expect(r.success).toBe(false);
  });

  it("초안은 이름·프로그램 행·기간이 덜 채워져도 저장되고, 공개는 막는다", () => {
    const values = {
      ...emptyFestivalValues("2026-10-20"),
      startDate: "",
      endDate: "",
      programs: [{ id: "p", name: "", date: "", start: "", end: "", place: "" }],
    };
    expect(festivalDraftSchema.safeParse(values).success).toBe(true);
    expect(festivalSchema.safeParse(values).success).toBe(false);
    const draft = festivalDraftSchema.parse(values);
    expect(valuesToFestival("d", draft).days).toEqual([]);
  });

  it("초안은 기간이 뒤집혀도 저장되고, 입력해 둔 날짜별 운영은 보관한다", () => {
    const values = {
      ...festivalToValues(festival),
      startDate: "2026-10-20",
      endDate: "2026-10-18",
    };
    expect(festivalDraftSchema.safeParse(values).success).toBe(true);
    expect(festivalSchema.safeParse(values).success).toBe(false);
    expect(valuesToFestival("f1", festivalDraftSchema.parse(values)).days).toEqual(festival.days);
  });

  it("초안 장소·코스는 이름 없이도 저장된다", () => {
    expect(placeDraftSchema.safeParse({ ...placeToValues(place), name: "" }).success).toBe(true);
    expect(
      courseDraftSchema.safeParse({ ...courseToValues(course), title: "", days: [] }).success,
    ).toBe(true);
  });

  it("휴무·미확인으로 바꿔 숨긴 구간의 빈 시각은 공개를 막지 않는다", () => {
    const values = placeToValues(place);
    const weekly = values.weekly.map((d, i) =>
      i === 2 ? { mode: "closed" as const, ranges: [{ open: "", close: "", lastOrder: "" }] } : d,
    );
    expect(placeSchema.safeParse({ ...values, weekly }).success).toBe(true);
    const shown = values.weekly.map((d, i) =>
      i === 2 ? { mode: "open" as const, ranges: [{ open: "", close: "", lastOrder: "" }] } : d,
    );
    expect(placeSchema.safeParse({ ...values, weekly: shown }).success).toBe(false);
  });

  it("휴무가 아닌 예외일에 구간이 없으면 초안에서도 막는다 (저장하면 휴무로 읽히므로)", () => {
    const values = placeToValues(place);
    const r = placeDraftSchema.safeParse({
      ...values,
      exceptions: [{ date: "2026-10-03", closed: false, ranges: [], note: "" }],
    });
    expect(r.success).toBe(false);
  });

  it("기간을 비운 초안은 입력해 둔 날짜별 운영을 그대로 보관한다", () => {
    const values = { ...festivalToValues(festival), endDate: "" };
    const saved = valuesToFestival("f1", festivalDraftSchema.parse(values), festival);
    expect(saved.days).toEqual(festival.days);
    expect(festivalToValues(saved).days).toEqual(festivalToValues(festival).days);
  });
});
