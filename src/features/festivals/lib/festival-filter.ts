// 축제 목록 필터 — 달력과 목록이 같은 결과를 쓰도록 판정을 한 곳에 둔다 (기능명세 §2). 날짜는 KST 달력 날짜.
import type { Festival } from "@/shared/domain";
import { dateRange, overlaps } from "@/shared/lib/date";

export type FestivalPhase = "ongoing" | "upcoming" | "ended";

export function phaseOf(f: Pick<Festival, "startDate" | "endDate">, today: string): FestivalPhase {
  if (f.endDate < today) return "ended";
  return f.startDate <= today ? "ongoing" : "upcoming";
}

export interface FestivalFilter {
  /** null = 진행·예정 전체 */
  phase: "ongoing" | "upcoming" | null;
  /** 이 날 열리는 축제만 (null = 날짜 무관) */
  date: string | null;
}

export function filterFestivals(list: Festival[], filter: FestivalFilter, today: string) {
  return list.filter(
    (f) =>
      (filter.phase === null || phaseOf(f, today) === filter.phase) &&
      (filter.date === null || overlaps(f.startDate, f.endDate, filter.date, filter.date)),
  );
}

/** 축제가 열리는 날짜 — 달력 표시용 */
export function festivalDates(list: Festival[]): Set<string> {
  return new Set(list.flatMap((f) => dateRange(f.startDate, f.endDate)));
}

/** 일정에 담을 수 있는 방문일 — 오늘 이후 개최일 */
export function visitableDates(f: Pick<Festival, "days">, today: string): string[] {
  return f.days.map((d) => d.date).filter((d) => d >= today);
}
