// 장소 영업시간 표기 — null = 미확인, [] = 휴무 (기능명세 §1: 미확인과 휴무를 구분한다).
import type { OpeningHours, TimeRange } from "@/shared/domain";

const WEEK = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function formatPlaceRanges(ranges: TimeRange[] | null): string {
  if (ranges === null) return "확인 필요";
  if (ranges.length === 0) return "휴무";
  return ranges
    .map((r) => `${r.open}~${r.close}${r.lastOrder ? ` (마감 ${r.lastOrder})` : ""}`)
    .join(", ");
}

export function hoursUnknown(hours: OpeningHours): boolean {
  return WEEK.every((d) => hours.weekly[d] === null);
}

/** 월요일부터 요일별 한 줄 */
export function weeklyRows(hours: OpeningHours): { day: string; text: string; known: boolean }[] {
  return WEEK.map((d) => ({
    day: DAY_LABEL[d],
    text: formatPlaceRanges(hours.weekly[d]),
    known: hours.weekly[d] !== null,
  }));
}
