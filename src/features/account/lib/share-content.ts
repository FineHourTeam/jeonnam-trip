// 공유본 내용 만들기·되돌리기 — 순수 함수.
// 공개 대상: 제목·날짜·지역·일차별 방문 장소·시간·위치. 제외: 개인 메모, 출발/종료 위치(숙소 등 개인 주소) (SHR-01).
import type { DaySchedule } from "@/features/planner";
import type { SharedTrip, Trip, TripDraft, VisitItem } from "@/shared/domain";
import { formatClock } from "@/shared/lib/format";
import type { ShareContent } from "../api/account-api";

const clock = (m: number | null) => (m === null ? null : formatClock(m));

export function buildShareContent(trip: Pick<Trip, "title" | "startDate" | "endDate" | "mode" | "siguns" | "days">, schedules: DaySchedule[]): ShareContent {
  return {
    title: trip.title,
    startDate: trip.startDate,
    endDate: trip.endDate,
    mode: trip.mode,
    siguns: trip.siguns,
    days: trip.days.map((d, di) => ({
      date: d.date,
      startTime: d.startTime,
      endTime: d.endTime,
      items: d.items.map((it, ii) => {
        const { memo: _memo, ...pub } = it;
        const s = schedules[di]?.items[ii];
        const leg = s?.legBefore;
        return {
          ...pub,
          times: {
            arrive: clock(s?.arrive ?? null),
            start: clock(s?.start ?? null),
            end: clock(s?.end ?? null),
            // 출발 위치에서 오는 구간은 개인 주소가 드러나므로 뺀다
            legBefore: leg?.status === "ok" && ii > 0 ? { durationMin: leg.durationMin, distanceM: leg.distanceM } : null,
          },
        };
      }),
    })),
  };
}

/** 공개 범위 요약 — 미리보기에서 "빠지는 정보"로 보여준다 */
export function excludedSummary(trip: Pick<Trip, "days" | "unplaced">) {
  const items = trip.days.flatMap((d) => d.items);
  return {
    memos: items.filter((i) => i.memo).length,
    points: trip.days.filter((d) => Boolean(d.startPoint) || Boolean(d.endPoint)).length,
    unplaced: trip.unplaced.length,
    customs: items.filter((i) => i.ref.kind === "custom").length,
  };
}

/** 받은 공유본 → 내 코스 초안. 방문 항목은 새 id로 (원본·공유 해제와 독립) (SHR-03) */
export function draftFromShare(share: SharedTrip): TripDraft {
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
      items: d.items.map(({ times: _times, ...it }): VisitItem => ({ ...it, id: crypto.randomUUID() })),
    })),
    unplaced: [],
    origin: { kind: "share", shareId: share.id },
  };
}
