// 크리에이터 코스 순수 함수 — 목록 필터와 개인 초안 복사(기능명세 §5).
import { addItemsToDay, visitFromPlace } from "@/features/trips";
import type { CreatorCourse, Place, SigunCode, TripDraft } from "@/shared/domain";

/** 코스 일수 = 가장 큰 일차 번호 */
export function courseDayCount(course: Pick<CreatorCourse, "days">): number {
  return Math.max(1, ...course.days.map((d) => d.day));
}

export function formatDays(n: number): string {
  return n === 1 ? "당일" : `${String(n - 1)}박 ${String(n)}일`;
}

export interface CourseFilter {
  sigun: SigunCode | null;
  days: number | null;
  tag: string | null;
}

export function filterCourses(list: CreatorCourse[], f: CourseFilter): CreatorCourse[] {
  return list.filter(
    (c) =>
      (f.sigun === null || c.siguns.includes(f.sigun)) &&
      (f.days === null || courseDayCount(c) === f.days) &&
      (f.tag === null || c.tags.includes(f.tag)),
  );
}

export function courseTags(list: CreatorCourse[]): string[] {
  return [...new Set(list.flatMap((c) => c.tags))].sort((a, b) => a.localeCompare(b, "ko"));
}

/** 요일별 영업시간이 하나도 확인되지 않은 장소 — 자동 시간 배정에서 빠진다 */
export function hoursUnknown(place: Pick<Place, "hours">): boolean {
  return Object.values(place.hours.weekly).every((r) => r === null);
}

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 정기 휴무 요일 표기 ("월·화 휴무"). 휴무 요일이 없으면 null — 미확인(null)은 휴무로 치지 않는다 */
export function closedWeekdaysLabel(place: Pick<Place, "hours">): string | null {
  const closed = WEEKDAY_LABEL.filter(
    (_, d) => place.hours.weekly[d as keyof Place["hours"]["weekly"]]?.length === 0,
  );
  return closed.length > 0 ? `${closed.join("·")} 휴무` : null;
}

/**
 * 원본 코스의 장소·순서를 빈 개인 초안에 옮긴다. 일차 번호가 여행 기간을 넘으면 미배치 후보로 보존한다.
 * places에 없는 장소(비공개·삭제)는 담지 않고 missing으로, 같은 일차에 두 번 나온 장소는 한 번만 담고
 * duplicates로 센다 (배치·미배치 모두 같은 정책 — 화면이 안내한다).
 */
export function copyCourseIntoDraft(
  draft: TripDraft,
  course: Pick<CreatorCourse, "days">,
  places: Record<string, Place>,
): { trip: TripDraft; missing: number; duplicates: number } {
  let trip = draft;
  let missing = 0;
  let duplicates = 0;
  for (const day of [...course.days].sort((a, b) => a.day - b.day)) {
    const seen = new Set<string>();
    const items = day.items.flatMap(({ placeId }) => {
      const place = places[placeId];
      if (!place) {
        missing += 1;
        return [];
      }
      if (seen.has(placeId)) {
        duplicates += 1;
        return [];
      }
      seen.add(placeId);
      return [visitFromPlace(place)];
    });
    const dayIndex = day.day - 1;
    if (dayIndex < trip.days.length) {
      trip = addItemsToDay(trip, dayIndex, items).trip;
    } else {
      const reason = `원본 코스 ${String(day.day)}일차 장소예요.`;
      trip = { ...trip, unplaced: [...trip.unplaced, ...items.map((i) => ({ ...i, reason }))] };
    }
  }
  return { trip, missing, duplicates };
}
