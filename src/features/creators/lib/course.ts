// 크리에이터 코스 순수 함수 — 목록 필터와 개인 초안 복사(기능명세 §5).
import { addItemsToDay, visitFromPlace } from "@/features/trips";
import i18n from "@/lib/i18n";
import type {
  CreatorCourse,
  LatLng,
  LegRequest,
  Place,
  SigunCode,
  TripDraft,
} from "@/shared/domain";

/** 코스 일수 = 가장 큰 일차 번호 */
export function courseDayCount(course: Pick<CreatorCourse, "days">): number {
  return Math.max(1, ...course.days.map((d) => d.day));
}

/** 일차 번호 순으로 정렬한 일차 목록 (원본 배열은 그대로) */
export function sortedDays<T extends { day: number }>(days: T[]): T[] {
  return [...days].sort((a, b) => a.day - b.day);
}

/** 여러 코스에 든 장소 id — 중복 없이 정렬해 한 번에 읽는 쿼리의 키로 쓴다 */
export function coursePlaceIds(courses: { days: { items: { placeId: string }[] }[] }[]): string[] {
  return [
    ...new Set(courses.flatMap((c) => c.days.flatMap((d) => d.items.map((i) => i.placeId)))),
  ].sort();
}

/** 카드 대표 사진 = 코스 순서(일차 → 장소)상 처음 나오는 사진. 볼 수 없는 장소·사진 없는 장소는 건너뛴다 */
export function pickCoverPhoto(
  course: Pick<CreatorCourse, "days">,
  places: Record<string, Pick<Place, "photos">>,
): string | null {
  for (const day of sortedDays(course.days)) {
    for (const { placeId } of day.items) {
      const photo = places[placeId]?.photos[0];
      if (photo) return photo;
    }
  }
  return null;
}

/** 상세 목록 행과 지도 마커가 함께 쓰는 id — 같은 장소가 두 번 나와도 구분된다 */
export function courseItemId(day: number, index: number): string {
  return `${String(day)}-${String(index)}`;
}

/**
 * 지도 경로 구간 — 위치가 확인된 장소끼리 목록 순서대로 잇는다. 위치를 모르는 장소는 건너뛰고,
 * 구간은 실제 자동차 경로 조회로만 그린다 (기능명세 §7).
 */
export function courseDayLegs(points: { location: LatLng | null }[]): LegRequest[] {
  const located = points.flatMap((p) => (p.location ? [p.location] : []));
  return located.flatMap((to, i) => {
    const from = located[i - 1];
    return from ? [{ from, to }] : [];
  });
}

export function formatDays(n: number): string {
  return n === 1
    ? i18n.t("duration.dayTrip", { ns: "creators" })
    : i18n.t("duration.nights", { ns: "creators", count: n - 1, days: n });
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

/** 태그 표시명 — 저장값(한국어)은 그대로 두고 en·ja 화면에서만 바꿔 보인다. 목록에 없는 태그는 원문 그대로 */
const TAG_LABEL: Record<string, { en: string; ja: string }> = {
  맛집: { en: "Food spots", ja: "グルメ" },
  카페: { en: "Cafes", ja: "カフェ" },
  "1박2일": { en: "2 days, 1 night", ja: "1泊2日" },
  사찰: { en: "Temples", ja: "寺院" },
  정원: { en: "Gardens", ja: "庭園" },
  야경: { en: "Night views", ja: "夜景" },
  계절: { en: "Seasonal", ja: "季節" },
  뚜벅이: { en: "No car needed", ja: "車なし旅" },
  수학여행: { en: "School trips", ja: "修学旅行" },
};

export function tagLabel(tag: string, lng: string): string {
  return lng === "en" || lng === "ja" ? (TAG_LABEL[tag]?.[lng] ?? tag) : tag;
}

export function courseTags(list: CreatorCourse[]): string[] {
  return [...new Set(list.flatMap((c) => c.tags))].sort((a, b) => a.localeCompare(b, "ko"));
}

/** 요일별 영업시간이 하나도 확인되지 않은 장소 — 자동 시간 배정에서 빠진다 */
export function hoursUnknown(place: Pick<Place, "hours">): boolean {
  return Object.values(place.hours.weekly).every((r) => r === null);
}

/** 정기 휴무 요일 표기 ("월·화 휴무"). 휴무 요일이 없으면 null — 미확인(null)은 휴무로 치지 않는다 */
export function closedWeekdaysLabel(place: Pick<Place, "hours">): string | null {
  // 2023-01-01은 일요일 — 요일 번호 d(0=일)를 지금 언어의 짧은 요일 이름으로
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: "short", timeZone: "UTC" });
  const closed = [0, 1, 2, 3, 4, 5, 6]
    .filter((d) => place.hours.weekly[d as keyof Place["hours"]["weekly"]]?.length === 0)
    .map((d) => weekday.format(Date.UTC(2023, 0, 1 + d)));
  if (closed.length === 0) return null;
  const days = closed.join(i18n.t("weekdaySeparator", { ns: "creators" }));
  return i18n.t("closedOn", { ns: "creators", days });
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
  for (const day of sortedDays(course.days)) {
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
      const reason = i18n.t("unplacedReason", { ns: "creators", day: day.day });
      trip = { ...trip, unplaced: [...trip.unplaced, ...items.map((i) => ({ ...i, reason }))] };
    }
  }
  return { trip, missing, duplicates };
}
