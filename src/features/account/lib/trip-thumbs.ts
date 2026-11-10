// 내 여행 카드 썸네일 줄 — 모든 일차의 방문 항목을 순서대로, 같은 곳 재방문은 한 번만.
import type { Trip, VisitItem } from "@/shared/domain";

export interface TripThumb {
  key: string;
  ref: VisitItem["ref"];
  name: string;
}

const refKey = (ref: VisitItem["ref"]) =>
  ref.kind === "place"
    ? `place:${ref.placeId}`
    : ref.kind === "festival"
      ? `festival:${ref.festivalId}`
      : `custom:${ref.customPlaceId}`;

export function tripThumbs(trip: Trip): TripThumb[] {
  const seen = new Set<string>();
  return trip.days.flatMap((d) =>
    d.items.flatMap((x) => {
      const key = refKey(x.ref);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ key, ref: x.ref, name: x.snapshot.name }];
    }),
  );
}

/** 목록 전체에서 등록 장소 id — 카드마다 따로 읽지 않도록 한 번에 (정렬해 쿼리 키를 고정) */
export function tripsPlaceIds(trips: Trip[]): string[] {
  return [
    ...new Set(
      trips.flatMap((t) =>
        t.days.flatMap((d) =>
          d.items.flatMap((x) => (x.ref.kind === "place" ? [x.ref.placeId] : [])),
        ),
      ),
    ),
  ].sort();
}
