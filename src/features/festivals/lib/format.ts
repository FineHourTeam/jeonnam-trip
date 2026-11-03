// 축제 화면 표기 — 날짜는 "10월 16일 (금)" (rules.md § 한국어 카피 — 숫자·날짜). 언어는 부르는 쪽이 넘긴다.
import i18n from "@/lib/i18n";
import type { TimeRange } from "@/shared/domain";
import { formatDay } from "@/shared/lib/date";

export function formatPeriod(start: string, end: string, lng: string): string {
  return start === end
    ? formatDay(start, lng)
    : `${formatDay(start, lng)} ~ ${formatDay(end, lng)}`;
}

/** null = 미확인, [] = 휴무 */
export function formatRanges(ranges: TimeRange[] | null): string {
  if (ranges === null) return i18n.t("hours.unknown", { ns: "festivals" });
  if (ranges.length === 0) return i18n.t("hours.closed", { ns: "festivals" });
  return ranges.map((r) => `${r.open}~${r.close}`).join(", ");
}
