// 코스 전체 일차의 시간 계산 — 구간 경로를 한 번에 조회(useDrivingLegs)하고 일차마다 computeDaySchedule.
// 좌표가 같은 구간은 캐시를 재사용하므로 순서를 바꿔도 바뀐 구간만 다시 조회한다 (MAP-03).
import { useMemo } from "react";
import { useDrivingLegs, type LegState } from "@/features/map";
import type { LatLng, LegRequest, TripDay } from "@/shared/domain";
import { computeDaySchedule, type DaySchedule, type LegInput } from "../lib/schedule";

interface Slot {
  day: number;
  /** 들어가는 장소 index. items.length = 종료 위치로 가는 구간 */
  into: number;
  request: LegRequest | null;
}

function legRequest(
  from: LatLng | null | undefined,
  to: LatLng | null | undefined,
): LegRequest | null {
  return from && to ? { from, to } : null;
}

export function planLegs(days: TripDay[]): Slot[] {
  const slots: Slot[] = [];
  days.forEach((d, day) => {
    const n = d.items.length;
    if (n === 0) return;
    if (d.startPoint) {
      slots.push({
        day,
        into: 0,
        request: legRequest(d.startPoint.location, d.items[0]?.snapshot.location),
      });
    }
    for (let i = 1; i < n; i++) {
      slots.push({
        day,
        into: i,
        request: legRequest(d.items[i - 1]?.snapshot.location, d.items[i]?.snapshot.location),
      });
    }
    if (d.endPoint) {
      slots.push({
        day,
        into: n,
        request: legRequest(d.items[n - 1]?.snapshot.location, d.endPoint.location),
      });
    }
  });
  return slots;
}

export interface DayLegView {
  into: number;
  state: LegState;
  from: LatLng | null;
  to: LatLng | null;
}

export function useTripSchedule(days: TripDay[]) {
  const slots = useMemo(() => planLegs(days), [days]);
  const requests = useMemo(() => slots.map((s) => s.request), [slots]);
  const { legs, isFetching, retryFailed } = useDrivingLegs(requests);

  const result = useMemo(() => {
    const perDay: DaySchedule[] = [];
    const legViews: DayLegView[][] = days.map(() => []);
    days.forEach((d, dayIndex) => {
      const legsBefore: (LegInput | null)[] = d.items.map(() => null);
      let legToEnd: LegInput | null = null;
      slots.forEach((s, k) => {
        if (s.day !== dayIndex) return;
        const state = legs[k] ?? { status: "pending" as const };
        legViews[dayIndex]?.push({
          into: s.into,
          state,
          from: s.request?.from ?? null,
          to: s.request?.to ?? null,
        });
        if (s.into >= d.items.length) legToEnd = state;
        else legsBefore[s.into] = state;
      });
      perDay.push(computeDaySchedule(d, { legsBefore, legToEnd }));
    });
    return { perDay, legViews };
  }, [days, slots, legs]);

  return { schedules: result.perDay, legViews: result.legViews, isFetching, retryFailed };
}
