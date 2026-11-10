import { describe, expect, it } from "vitest";
import type { TripDraft, VisitItem } from "@/shared/domain";
import {
  addDay,
  insertItem,
  moveItem,
  moveItemToDay,
  nudgeArrive,
  nudgeDepart,
  placeUnplaced,
  removeItem,
  setItemMemo,
  shiftStartDate,
  unpinArrive,
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

describe("일차 늘리기·시작일 옮기기", () => {
  const dated = () => ({ ...trip(), startDate: "2026-10-17", endDate: "2026-10-18" });

  it("마지막 날 다음 날을 빈 일차로 붙이고 종료일을 늘린다", () => {
    const t = addDay(dated());
    expect(t.endDate).toBe("2026-10-19");
    expect(t.days.map((d) => d.date)).toEqual(["2026-10-17", "2026-10-18", "2026-10-19"]);
    expect(t.days[2]?.items).toEqual([]);
  });

  it("최대 일수(4일)면 더 늘리지 않는다", () => {
    const t = addDay(addDay(addDay(dated())));
    expect(t.days).toHaveLength(4);
  });

  it("시작일을 옮기면 일차 날짜가 함께 옮겨지고 담은 장소는 그대로다", () => {
    const t = shiftStartDate(dated(), "2026-10-20");
    expect([t.startDate, t.endDate]).toEqual(["2026-10-20", "2026-10-21"]);
    expect(t.days.map((d) => d.date)).toEqual(["2026-10-20", "2026-10-21"]);
    expect(t.days[0]?.items.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("개인 메모", () => {
  it("앞뒤 공백을 지워 저장하고, 비우면 memo 필드를 없앤다", () => {
    const t = setItemMemo(trip(), 0, "b", "  주차는 뒤편  \n");
    expect(t.days[0]?.items[1]?.memo).toBe("주차는 뒤편");
    expect(t.days[0]?.items[0]).not.toHaveProperty("memo");
    const cleared = setItemMemo(t, 0, "b", "   ");
    expect(cleared.days[0]?.items[1]).not.toHaveProperty("memo");
  });
});

describe("도착·출발 ±10분", () => {
  it("첫 장소 도착은 하루 시작을 옮기고 00:00~23:50 안에 둔다", () => {
    const t = nudgeArrive(trip(), 0, "a", 540, 10);
    expect(t.days[0]?.startTime).toBe("09:10");
    expect(t.days[0]?.items[0]).not.toHaveProperty("fixedStart");
    const early = { ...trip(), days: [{ ...trip().days[0]!, startTime: "00:00" }] };
    expect(nudgeArrive(early, 0, "a", 0, -10).days[0]?.startTime).toBe("00:00");
  });

  it("두 번째 장소부터는 지금 도착 ±10분을 고정 시작 시각으로 두고, 해제하면 지운다", () => {
    const t = nudgeArrive(trip(), 0, "b", 11 * 60 + 5, -10);
    expect(t.days[0]?.items[1]?.fixedStart).toBe("10:55");
    expect(t.days[0]?.startTime).toBe("09:00");
    expect(nudgeArrive(t, 0, "b", 23 * 60 + 50, 10).days[0]?.items[1]?.fixedStart).toBe("23:50");
    expect(unpinArrive(t, 0, "b").days[0]?.items[1]).not.toHaveProperty("fixedStart");
  });

  it("고정된 첫 장소는 하루 시작 대신 고정 시각을 옮긴다", () => {
    const pinned = nudgeArrive(trip(), 0, "b", 600, 0);
    const first = moveItem(pinned, 0, "b", -1);
    const t = nudgeArrive(first, 0, "b", 600, 10);
    expect(t.days[0]?.items[0]?.fixedStart).toBe("10:10");
    expect(t.days[0]?.startTime).toBe("09:00");
  });

  it("출발은 지금 체류를 ±10분 하고 고정하며, 10분보다 줄이지 않는다", () => {
    expect(nudgeDepart(trip(), 0, "a", 60, 10).days[0]?.items[0]).toMatchObject({
      stayMin: 70,
      stayLocked: true,
    });
    expect(nudgeDepart(trip(), 0, "a", 10, -10).days[0]?.items[0]?.stayMin).toBe(10);
  });
});
