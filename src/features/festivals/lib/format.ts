// 축제 화면 표기 — 날짜는 "10월 16일 (금)" (rules.md § 한국어 카피 — 숫자·날짜)
import type { TimeRange } from "@/shared/domain";
import { formatDateKo } from "@/shared/lib/date";

export function formatPeriod(start: string, end: string): string {
  return start === end ? formatDateKo(start) : `${formatDateKo(start)} ~ ${formatDateKo(end)}`;
}

/** null = 미확인, [] = 휴무 */
export function formatRanges(ranges: TimeRange[] | null): string {
  if (ranges === null) return "운영시간 확인 필요";
  if (ranges.length === 0) return "휴무";
  return ranges.map((r) => `${r.open}~${r.close}`).join(", ");
}
