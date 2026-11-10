import { describe, expect, it } from "vitest";
import type { Trip, VisitItem } from "@/shared/domain";
import { tripThumbs, tripsPlaceIds } from "./trip-thumbs";

const item = (ref: VisitItem["ref"], name: string): VisitItem => ({
  id: name,
  ref,
  snapshot: { name, category: "cafe", location: null, capturedAt: "" },
  stayMin: 45,
  stayLocked: false,
});

const day = (items: VisitItem[]) => ({
  date: "2026-10-17",
  startTime: "09:00",
  endTime: "21:00",
  startPoint: null,
  endPoint: null,
  items,
});

const trip = (days: VisitItem[][]) => ({ days: days.map(day) }) as unknown as Trip;

describe("tripThumbs", () => {
  it("모든 일차를 순서대로 모으고 같은 곳 재방문은 한 번만 둔다", () => {
    const t = trip([
      [
        item({ kind: "place", placeId: "b" }, "B"),
        item({ kind: "festival", festivalId: "f" }, "F"),
      ],
      [
        item({ kind: "place", placeId: "b" }, "B2"),
        item({ kind: "custom", customPlaceId: "c" }, "C"),
      ],
    ]);
    expect(tripThumbs(t).map((x) => x.key)).toEqual(["place:b", "festival:f", "custom:c"]);
  });

  it("장소가 없으면 빈 줄", () => {
    expect(tripThumbs(trip([[]]))).toEqual([]);
  });
});

describe("tripsPlaceIds", () => {
  it("여러 여행의 등록 장소 id만 중복 없이 정렬해 모은다", () => {
    const a = trip([
      [
        item({ kind: "place", placeId: "z" }, "Z"),
        item({ kind: "custom", customPlaceId: "c" }, "C"),
      ],
    ]);
    const b = trip([
      [item({ kind: "place", placeId: "a" }, "A"), item({ kind: "place", placeId: "z" }, "Z")],
    ]);
    expect(tripsPlaceIds([a, b])).toEqual(["a", "z"]);
  });
});
