import { describe, expect, test } from "vitest";
import type { Place } from "@/shared/domain";
import {
  addItemsToDay,
  dayIndexOf,
  newTripDraft,
  TripTooLongError,
  visitFromPlace,
} from "./trip-builders";

const place: Place = {
  id: "p1",
  name: "샘플 카페",
  sigun: "suncheon",
  category: "cafe",
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
  updatedAt: "2026-10-16T00:00:00.000Z",
};

describe("trip builders", () => {
  test("최대 4일을 넘으면 만들지 않는다", () => {
    expect(() =>
      newTripDraft({
        startDate: "2026-10-16",
        endDate: "2026-10-20",
        siguns: [],
        pace: null,
        origin: { kind: "blank" },
      }),
    ).toThrow(TripTooLongError);
  });

  test("같은 일차에 같은 장소는 중복으로 돌려준다", () => {
    const draft = newTripDraft({
      startDate: "2026-10-16",
      endDate: "2026-10-17",
      siguns: [],
      pace: null,
      origin: { kind: "blank" },
    });
    const first = addItemsToDay(draft, 0, [visitFromPlace(place)]);
    const second = addItemsToDay(first.trip, 0, [visitFromPlace(place)]);
    expect(second.added).toHaveLength(0);
    expect(second.duplicates).toHaveLength(1);
    expect(second.trip.days[0]?.items).toHaveLength(1);
    // 다른 일차에는 담을 수 있다 (재방문은 별개 방문 항목)
    expect(addItemsToDay(second.trip, 1, [visitFromPlace(place)]).added).toHaveLength(1);
  });

  test("카페 기본 체류 45분, 담을 때 사본을 남긴다", () => {
    const item = visitFromPlace(place);
    expect(item.stayMin).toBe(45);
    expect(item.snapshot.name).toBe("샘플 카페");
    expect(item.snapshot.sourceUpdatedAt).toBe(place.updatedAt);
  });

  test("dayIndexOf는 기간 밖이면 -1", () => {
    const draft = newTripDraft({
      startDate: "2026-10-16",
      endDate: "2026-10-17",
      siguns: [],
      pace: null,
      origin: { kind: "blank" },
    });
    expect(dayIndexOf(draft, "2026-10-17")).toBe(1);
    expect(dayIndexOf(draft, "2026-10-18")).toBe(-1);
  });
});
