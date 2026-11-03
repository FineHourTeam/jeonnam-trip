// 장소 영업시간 표기 — null = 미확인, [] = 휴무 (기능명세 §1: 미확인과 휴무를 구분한다).
import i18n, { currentLanguage } from "@/lib/i18n";
import type { OpeningHours, TimeRange } from "@/shared/domain";

const WEEK = [1, 2, 3, 4, 5, 6, 0] as const;

/** 요일 짧은 이름 (0=일) — 화면 언어 기준. 2024-01-07은 일요일 */
function dayLabel(d: number): string {
  return new Intl.DateTimeFormat(currentLanguage(), { weekday: "short", timeZone: "UTC" }).format(
    Date.UTC(2024, 0, 7 + d),
  );
}

export function formatPlaceRanges(ranges: TimeRange[] | null): string {
  if (ranges === null) return i18n.t("needsCheck", { ns: "places" });
  if (ranges.length === 0) return i18n.t("hours.closed", { ns: "places" });
  return ranges
    .map(
      (r) =>
        `${r.open}~${r.close}${r.lastOrder ? ` (${i18n.t("hours.lastOrder", { ns: "places", time: r.lastOrder })})` : ""}`,
    )
    .join(", ");
}

export function hoursUnknown(hours: OpeningHours): boolean {
  return WEEK.every((d) => hours.weekly[d] === null);
}

/** 월요일부터 요일별 한 줄 */
export function weeklyRows(hours: OpeningHours): { day: string; text: string; known: boolean }[] {
  return WEEK.map((d) => ({
    day: dayLabel(d),
    text: formatPlaceRanges(hours.weekly[d]),
    known: hours.weekly[d] !== null,
  }));
}
