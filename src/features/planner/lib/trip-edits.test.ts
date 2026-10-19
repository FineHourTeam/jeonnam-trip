import { describe, expect, it } from "vitest";
import type { TripDraft, VisitItem } from "@/shared/domain";
import {
  insertItem,
  moveItem,
  moveItemToDay,
  placeUnplaced,
  removeItem,
  updateItem,
} from "./trip-edits";

function item(id: string): VisitItem {
  return {
    id,
    ref: { kind: "place", placeId: id },
    snapshot: { name: id, category: "cafe", location: null, capturedAt: "" },
    stayMin: 45,
    stayLocked: false,
  };
}

function trip(): Pick<TripDraft, "days" | "unplaced"> {
  return {
    days: [
      {
        date: "2026-10-17",
        startTime: "09:00",
        endTime: "21:00",
        items: [item("a"), item("b"), item("c")],
      },
      { date: "2026-10-18", startTime: "09:00", endTime: "21:00", items: [] },
    ],
    unplaced: [{ ...item("u"), reason: "영업시간 확인 필요" }],
  };
}

const ids = (t: ReturnType<typeof trip>, day: number) => t.days[day]?.items.map((x) => x.id);

describe("trip-edits", () => {
  it("한 칸 위·아래로 옮기고, 끝에서는 그대로 둔다", () => {
    expect(ids(moveItem(trip(), 0, "b", -1), 0)).toEqual(["b", "a", "c"]);
    expect(ids(moveItem(trip(), 0, "b", 1), 0)).toEqual(["a", "c", "b"]);
    expect(ids(moveItem(trip(), 0, "a", -1), 0)).toEqual(["a", "b", "c"]);
  });

  it("다른 일차로 옮겨도 방문 항목 id를 유지한다", () => {
    const t = moveItemToDay(trip(), 0, "b", 1);
    expect(ids(t, 0)).toEqual(["a", "c"]);
    expect(ids(t, 1)).toEqual(["b"]);
  });

  it("삭제 후 같은 자리에 되돌린다", () => {
    const original = trip();
    const removed = removeItem(original, 0, "b");
    expect(ids(removed, 0)).toEqual(["a", "c"]);
    const restored = insertItem(removed, 0, 1, original.days[0]?.items[1] ?? item("x"));
    expect(ids(restored, 0)).toEqual(["a", "b", "c"]);
  });

  it("체류시간을 바꾸고 고정한다", () => {
    const t = updateItem(trip(), 0, "a", { stayMin: 90, stayLocked: true });
    expect(t.days[0]?.items[0]).toMatchObject({ stayMin: 90, stayLocked: true });
  });

  it("미배치 후보를 고른 일차 끝에 넣고 이유를 지운다", () => {
    const t = placeUnplaced(trip(), "u", 1);
    expect(t.unplaced).toEqual([]);
    expect(t.days[1]?.items[0]).not.toHaveProperty("reason");
    expect(ids(t, 1)).toEqual(["u"]);
  });
});
