import { describe, expect, it } from "vitest";
import type { Trip, VisitItem } from "@/shared/domain";
import { customPlaceCount, draftFromShare, draftFromTrip, toSharedTrip } from "./share-copy";

const item = (id: string, kind: "place" | "custom", memo?: string): VisitItem => ({
  id,
  ref: kind === "place" ? { kind, placeId: id } : { kind, customPlaceId: id },
  snapshot: { name: id, category: "cafe", location: null, capturedAt: "" },
  stayMin: 45,
  stayLocked: false,
  ...(memo ? { memo } : {}),
});

const trip: Trip = {
  id: "t1",
  ownerUid: "u1",
  title: "목포 여행",
  startDate: "2026-10-17",
  endDate: "2026-10-17",
  mode: "car",
  pace: "relaxed",
  siguns: ["mokpo"],
  days: [
    {
      date: "2026-10-17",
      startTime: "09:00",
      endTime: "21:00",
      startPoint: { label: "우리집", location: { lat: 34.8, lng: 126.4 } },
      endPoint: null,
      items: [item("a", "place", "비밀 메모"), item("b", "custom")],
    },
  ],
  unplaced: [],
  origin: { kind: "blank" },
  shareId: null,
  version: 3,
  createdAt: "",
  updatedAt: "",
};

describe("share-copy", () => {
  it("공유본에는 개인 메모와 출발·종료 위치가 없다", () => {
    const s = toSharedTrip(trip, { id: "s1", publishedVersion: 1, publishedAt: "2026-10-20" });
    const day = s.days[0];
    expect(day && "startPoint" in day).toBe(false);
    expect(day?.items.some((x) => "memo" in x)).toBe(false);
    expect(s.ownerUid).toBe("u1");
    expect(s.tripId).toBe("t1");
  });

  it("받은 공유본을 복사하면 새 방문 항목 id와 공유 출처를 갖는다", () => {
    const s = toSharedTrip(trip, { id: "s1", publishedVersion: 1, publishedAt: "" });
    let n = 0;
    const d = draftFromShare(s, () => `new-${String(++n)}`);
    expect(d.days[0]?.items.map((x) => x.id)).toEqual(["new-1", "new-2"]);
    expect(d.origin).toEqual({ kind: "share", shareId: "s1" });
  });

  it("내 코스 복사는 메모를 유지하고 제목에 사본을 붙인다", () => {
    const d = draftFromTrip(trip, () => "x");
    expect(d.title).toBe("목포 여행 (사본)");
    expect(d.days[0]?.items[0]?.memo).toBe("비밀 메모");
  });

  it("직접 입력한 장소 수를 센다", () => {
    expect(customPlaceCount(trip)).toBe(1);
  });
});
