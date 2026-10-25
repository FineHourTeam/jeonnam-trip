// 코스 편집 연산 — 순수 함수. 사용자의 순서·고정 시각은 이 연산이 요청받은 것만 바꾼다 (자동 재배치 없음).
// 방문 항목 id는 순서·일차가 바뀌어도 유지하고, 장소 교체·삭제 후 재추가는 새 항목이다 (기능명세 §10 식별자 원칙).
import { dateRange, diffDays } from "@/shared/lib/date";
import { MAX_TRIP_DAYS, type TripDraft, type VisitItem, type VisitSnapshot } from "@/shared/domain";

export type EditableTrip = Pick<
  TripDraft,
  "title" | "startDate" | "endDate" | "mode" | "pace" | "siguns" | "days" | "unplaced" | "origin"
>;

function mapDay<T extends EditableTrip>(
  trip: T,
  dayIndex: number,
  fn: (items: VisitItem[]) => VisitItem[],
): T {
  return {
    ...trip,
    days: trip.days.map((d, i) => (i === dayIndex ? { ...d, items: fn(d.items) } : d)),
  };
}

export function moveItem<T extends EditableTrip>(
  trip: T,
  dayIndex: number,
  itemIndex: number,
  delta: -1 | 1,
): T {
  return mapDay(trip, dayIndex, (items) => {
    const to = itemIndex + delta;
    if (to < 0 || to >= items.length) return items;
    const next = [...items];
    const [moved] = next.splice(itemIndex, 1);
    if (moved) next.splice(to, 0, moved);
    return next;
  });
}

function sameTarget(a: VisitItem, b: VisitItem): boolean {
  return JSON.stringify(a.ref) === JSON.stringify(b.ref);
}

export class DuplicateInDayError extends Error {
  constructor() {
    super("그 일차에 이미 있는 장소예요.");
    this.name = "DuplicateInDayError";
  }
}

/** 다른 일차 끝으로 옮긴다 — 항목 id·체류·고정 설정 유지 */
export function moveItemToDay<T extends EditableTrip>(
  trip: T,
  fromDay: number,
  itemIndex: number,
  toDay: number,
): T {
  const item = trip.days[fromDay]?.items[itemIndex];
  const target = trip.days[toDay];
  if (!item || !target || fromDay === toDay) return trip;
  if (target.items.some((x) => sameTarget(x, item))) throw new DuplicateInDayError();
  const removed = mapDay(trip, fromDay, (items) => items.filter((_, i) => i !== itemIndex));
  return mapDay(removed, toDay, (items) => [...items, item]);
}

export function removeItem<T extends EditableTrip>(
  trip: T,
  dayIndex: number,
  itemIndex: number,
): T {
  return mapDay(trip, dayIndex, (items) => items.filter((_, i) => i !== itemIndex));
}

export function insertItem<T extends EditableTrip>(
  trip: T,
  dayIndex: number,
  itemIndex: number,
  item: VisitItem,
): T {
  return mapDay(trip, dayIndex, (items) => {
    const next = [...items];
    next.splice(Math.min(itemIndex, next.length), 0, item);
    return next;
  });
}

/** 장소 교체 — 같은 자리에 새 방문 항목 (새 id) */
export function replaceItem<T extends EditableTrip>(
  trip: T,
  dayIndex: number,
  itemIndex: number,
  next: VisitItem,
): T {
  return mapDay(trip, dayIndex, (items) => items.map((x, i) => (i === itemIndex ? next : x)));
}

export function updateItem<T extends EditableTrip>(
  trip: T,
  dayIndex: number,
  itemId: string,
  patch: Partial<
    Pick<VisitItem, "stayMin" | "stayLocked" | "fixedStart" | "fixedEnd" | "memo" | "snapshot">
  >,
): T {
  return mapDay(trip, dayIndex, (items) =>
    items.map((x) => {
      if (x.id !== itemId) return x;
      const merged: VisitItem = { ...x, ...patch };
      // undefined로 지운 고정 시각은 필드째 없앤다 (Firestore에 undefined를 남기지 않게)
      if (patch.fixedStart === undefined && "fixedStart" in patch) delete merged.fixedStart;
      if (patch.fixedEnd === undefined && "fixedEnd" in patch) delete merged.fixedEnd;
      return merged;
    }),
  );
}

export function setDayTimes<T extends EditableTrip>(
  trip: T,
  dayIndex: number,
  startTime: string,
  endTime: string,
): T {
  return {
    ...trip,
    days: trip.days.map((d, i) => (i === dayIndex ? { ...d, startTime, endTime } : d)),
  };
}

/** 미배치 후보를 일차 끝에 넣는다 */
export function placeUnplaced<T extends EditableTrip>(
  trip: T,
  unplacedIndex: number,
  dayIndex: number,
): T {
  const cand = trip.unplaced[unplacedIndex];
  const target = trip.days[dayIndex];
  if (!cand || !target) return trip;
  const { reason: _reason, ...item } = cand;
  if (target.items.some((x) => sameTarget(x, item))) throw new DuplicateInDayError();
  const next = mapDay(trip, dayIndex, (items) => [...items, item]);
  return { ...next, unplaced: trip.unplaced.filter((_, i) => i !== unplacedIndex) };
}

/** 일정에서 빼되 버리지 않고 미배치 후보로 남긴다 */
export function unplaceItem<T extends EditableTrip>(
  trip: T,
  dayIndex: number,
  itemIndex: number,
  reason: string,
): T {
  const item = trip.days[dayIndex]?.items[itemIndex];
  if (!item) return trip;
  const next = removeItem(trip, dayIndex, itemIndex);
  return { ...next, unplaced: [...next.unplaced, { ...item, reason }] };
}

export function removeUnplaced<T extends EditableTrip>(trip: T, unplacedIndex: number): T {
  return { ...trip, unplaced: trip.unplaced.filter((_, i) => i !== unplacedIndex) };
}

export class InvalidPeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPeriodError";
  }
}

/**
 * 여행 날짜 바꾸기 — 일차 순서대로 날짜만 옮긴다(각 일차의 장소·시간 설정 유지).
 * 기간이 줄면 넘치는 일차의 장소는 미배치 후보로 보존한다 (기능명세 §5 기간 축소 정책 제안).
 */
export function changeDates<T extends EditableTrip>(
  trip: T,
  startDate: string,
  endDate: string,
): T {
  const n = diffDays(startDate, endDate) + 1;
  if (n < 1) throw new InvalidPeriodError("끝나는 날이 시작하는 날보다 빨라요.");
  if (n > MAX_TRIP_DAYS)
    throw new InvalidPeriodError(`여행 기간은 최대 ${String(MAX_TRIP_DAYS)}일까지 만들 수 있어요.`);
  const dates = dateRange(startDate, endDate);
  const kept = dates.map((date, i) => {
    const old = trip.days[i];
    return old
      ? { ...old, date }
      : {
          date,
          startTime: trip.days[0]?.startTime ?? "09:00",
          endTime: trip.days[0]?.endTime ?? "21:00",
          items: [],
        };
  });
  const overflow = trip.days.slice(n).flatMap((d, k) =>
    d.items.map((item) => ({
      ...item,
      reason: `원래 ${String(n + k + 1)}일차였어요. 기간을 줄여 배치하지 않았어요.`,
    })),
  );
  return { ...trip, startDate, endDate, days: kept, unplaced: [...trip.unplaced, ...overflow] };
}

/** 담은 뒤 바뀐 운영 정보를 최신으로 반영 (사용자가 고른 경우만) */
export function refreshSnapshot<T extends EditableTrip>(
  trip: T,
  dayIndex: number,
  itemId: string,
  snapshot: VisitSnapshot,
): T {
  return updateItem(trip, dayIndex, itemId, { snapshot });
}
