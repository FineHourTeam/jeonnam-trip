// 개인 코스 ↔ 공유본 변환 순수 함수.
// 공유본에는 개인 메모·출발/종료 위치를 넣지 않는다 (기능명세 §8). 받는 사람이 복사하면 새 방문 항목 id로 개인 초안을 만든다.
import i18n from "@/lib/i18n";
import type { SharedTrip, Trip, TripDraft } from "@/shared/domain";

export function toSharedTrip(
  trip: Trip,
  meta: { id: string; publishedVersion: number; publishedAt: string },
): SharedTrip {
  return {
    id: meta.id,
    ownerUid: trip.ownerUid,
    tripId: trip.id,
    active: true,
    title: trip.title,
    startDate: trip.startDate,
    endDate: trip.endDate,
    mode: trip.mode,
    siguns: trip.siguns,
    days: trip.days.map((d) => ({
      date: d.date,
      startTime: d.startTime,
      endTime: d.endTime,
      items: d.items.map(({ memo: _memo, ...item }) => item),
    })),
    publishedVersion: meta.publishedVersion,
    publishedAt: meta.publishedAt,
  };
}

/** 공유본을 내 코스로 복사할 초안 — 원본과 별개인 새 방문 항목 id */
export function draftFromShare(
  share: SharedTrip,
  newId: () => string = () => crypto.randomUUID(),
): TripDraft {
  return {
    title: share.title,
    startDate: share.startDate,
    endDate: share.endDate,
    mode: share.mode,
    pace: null,
    siguns: share.siguns,
    days: share.days.map((d) => ({
      date: d.date,
      startTime: d.startTime,
      endTime: d.endTime,
      items: d.items.map((item) => ({ ...item, id: newId() })),
    })),
    unplaced: [],
    origin: { kind: "share", shareId: share.id },
  };
}

/** 내 코스 복사 — 메모는 내 것이라 유지, 방문 항목 id만 새로 */
export function draftFromTrip(
  trip: Trip,
  newId: () => string = () => crypto.randomUUID(),
): TripDraft {
  return {
    title: i18n.t("myTrips.copySuffix", { ns: "account", title: trip.title }),
    startDate: trip.startDate,
    endDate: trip.endDate,
    mode: trip.mode,
    pace: trip.pace,
    siguns: trip.siguns,
    days: trip.days.map((d) => ({
      ...d,
      items: d.items.map((item) => ({ ...item, id: newId() })),
    })),
    unplaced: trip.unplaced.map((item) => ({ ...item, id: newId() })),
    origin: trip.origin,
  };
}

/** 공유 미리보기에 띄울 경고 — 직접 입력한 장소도 공개 대상이다 */
export function customPlaceCount(trip: Pick<Trip, "days">): number {
  return trip.days.reduce((n, d) => n + d.items.filter((x) => x.ref.kind === "custom").length, 0);
}
