import { describe, expect, test } from "vitest";
import type { SharedTrip, Trip } from "@/shared/domain";
import type { DaySchedule } from "@/features/planner";
import { buildShareContent, draftFromShare, excludedSummary } from "./share-content";

const trip: Trip = {
  id: "t",
  ownerUid: "u",
  title: "순천 여행",
  startDate: "2026-10-23",
  endDate: "2026-10-23",
  mode: "car",
  pace: null,
  siguns: ["suncheon"],
  days: [
    {
      date: "2026-10-23",
      startTime: "09:00",
      endTime: "21:00",
      startPoint: { label: "우리 집", location: { lat: 1, lng: 1 } },
      items: [
        {
          id: "a",
          ref: { kind: "place", placeId: "p" },
          snapshot: { name: "정원", category: "attraction", location: null, capturedAt: "x" },
          stayMin: 60,
          stayLocked: false,
          memo: "비밀 메모",
        },
      ],
    },
  ],
  unplaced: [],
  origin: { kind: "blank" },
  shareId: null,
  version: 1,
  createdAt: "x",
  updatedAt: "x",
};

describe("share content", () => {
  test("개인 메모·출발 위치를 빼고 시각 사본을 담는다", () => {
    const schedule = {
      items: [
        {
          arrive: 540,
          start: 540,
          end: 600,
          legBefore: { status: "ok", durationMin: 20, distanceM: 9000 },
        },
      ],
    } as unknown as DaySchedule;
    const c = buildShareContent(trip, [schedule]);
    const item = c.days[0]?.items[0];
    expect(item && "memo" in item).toBe(false);
    expect(JSON.stringify(c)).not.toContain("우리 집");
    expect(item?.times).toEqual({ arrive: "09:00", start: "09:00", end: "10:00", legBefore: null });
    expect(excludedSummary(trip)).toMatchObject({ memos: 1, points: 1 });
  });

  test("복사본은 새 방문 id를 받고 공유본을 출처로 남긴다", () => {
    const share = {
      ...buildShareContent(trip, []),
      id: "s1",
      ownerUid: "u",
      tripId: "t",
      active: true,
      publishedVersion: 1,
      publishedAt: "x",
    } as SharedTrip;
    const d = draftFromShare(share);
    expect(d.days[0]?.items[0]?.id).not.toBe("a");
    expect(d.origin).toEqual({ kind: "share", shareId: "s1" });
    expect(d.days[0]?.items[0] && "times" in d.days[0].items[0]).toBe(false);
  });
});
