import { describe, expect, test } from "vitest";
import type { TripDraft, VisitItem } from "@/shared/domain";
import {
  changeDates,
  DuplicateInDayError,
  moveItem,
  moveItemToDay,
  placeUnplaced,
  setDayPoints,
  unplaceItem,
  updateItem,
} from "./edit-ops";

const item = (id: string, placeId = id): VisitItem => ({
  id,
  ref: { kind: "place", placeId },
  snapshot: { name: id, category: "cafe", location: null, capturedAt: "2026-10-16T00:00:00Z" },
  stayMin: 45,
  stayLocked: false,
});

function trip(): TripDraft {
  return {
    title: "t",
    startDate: "2026-10-23",
    endDate: "2026-10-25",
    mode: "car",
    pace: null,
    siguns: ["suncheon"],
    origin: { kind: "blank" },
    unplaced: [],
    days: [
      { date: "2026-10-23", startTime: "09:00", endTime: "21:00", items: [item("a"), item("b")] },
      { date: "2026-10-24", startTime: "10:00", endTime: "20:00", items: [item("c")] },
      { date: "2026-10-25", startTime: "09:00", endTime: "21:00", items: [item("d")] },
    ],
  };
}

describe("edit ops", () => {
  test("순서 이동은 항목 id를 유지한다", () => {
    const t = moveItem(trip(), 0, 1, -1);
    expect(t.days[0]?.items.map((x) => x.id)).toEqual(["b", "a"]);
  });

  test("다른 일차로 옮기면 끝에 붙고, 같은 장소가 있으면 막는다", () => {
    const t = moveItemToDay(trip(), 0, 0, 1);
    expect(t.days[1]?.items.map((x) => x.id)).toEqual(["c", "a"]);
    const dup = trip();
    dup.days[1]?.items.push(item("x", "a"));
    expect(() => moveItemToDay(dup, 0, 0, 1)).toThrow(DuplicateInDayError);
  });

  test("일정에서 빼면 미배치로 남고, 다시 넣을 수 있다", () => {
    const t = unplaceItem(trip(), 0, 0, "직접 뺐어요");
    expect(t.unplaced.map((x) => x.id)).toEqual(["a"]);
    const back = placeUnplaced(t, 0, 2);
    expect(back.unplaced).toEqual([]);
    expect(back.days[2]?.items.map((x) => x.id)).toEqual(["d", "a"]);
    expect("reason" in (back.days[2]?.items[1] ?? {})).toBe(false);
  });

  test("기간을 줄이면 넘치는 일차 장소를 이유와 함께 미배치로 보존한다", () => {
    const t = changeDates(trip(), "2026-11-01", "2026-11-02");
    expect(t.days.map((d) => d.date)).toEqual(["2026-11-01", "2026-11-02"]);
    expect(t.days[1]?.startTime).toBe("10:00");
    expect(t.unplaced.map((x) => x.id)).toEqual(["d"]);
    expect(t.unplaced[0]?.reason).toContain("3일차");
    expect(() => changeDates(trip(), "2026-11-01", "2026-11-06")).toThrow();
  });

  test("고정 시각을 지우면 필드째 없앤다", () => {
    const fixed = updateItem(trip(), 0, "a", { fixedStart: "10:00" });
    expect(fixed.days[0]?.items[0]?.fixedStart).toBe("10:00");
    const cleared = updateItem(fixed, 0, "a", { fixedStart: undefined });
    expect("fixedStart" in (cleared.days[0]?.items[0] ?? {})).toBe(false);
  });

  test("출발·종료 위치는 고른 일차에만 넣고, null이면 뺀다", () => {
    const stay = { label: "숙소", location: { lat: 34.74, lng: 127.75 } };
    const set = setDayPoints(trip(), 1, stay, stay);
    expect(set.days[1]?.startPoint).toEqual(stay);
    expect(set.days[1]?.endPoint).toEqual(stay);
    expect(set.days[0]?.startPoint).toBeUndefined();
    expect(set.days[1]?.items.map((x) => x.id)).toEqual(trip().days[1]?.items.map((x) => x.id));
    const cleared = setDayPoints(set, 1, null, stay);
    expect(cleared.days[1]?.startPoint).toBeNull();
    expect(cleared.days[1]?.endPoint).toEqual(stay);
  });
});
