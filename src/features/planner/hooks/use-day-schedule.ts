// 일차 하나의 경로 조회 + 시간 계산. 구간 요청은 좌표가 둘 다 있을 때만 만든다 (좌표 미확인 = 경로 계산 제외).
import { useMemo } from "react";
import { useDrivingLegs } from "@/features/map";
import type { LegRequest, TripDay } from "@/shared/domain";
import { computeDaySchedule } from "../lib/schedule";

export function useDaySchedule(day: TripDay) {
  const requests = useMemo(
    () =>
      day.items.slice(1).map((to, i): LegRequest | null => {
        const from = day.items[i]?.snapshot.location;
        const dest = to.snapshot.location;
        return from && dest ? { from, to: dest } : null;
      }),
    [day.items],
  );
  const { legs, retryFailed, isFetching } = useDrivingLegs(requests);
  const schedule = useMemo(() => computeDaySchedule({ day, legs }), [day, legs]);
  return { schedule, legs, retryFailed, isFetching };
}
