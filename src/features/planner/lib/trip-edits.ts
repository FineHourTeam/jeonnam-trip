// 코스 편집 순수 함수 — 사용자가 고른 동작만 반영한다. 순서·시각을 자동으로 바꾸지 않는다 (기능명세 §7).
// Trip·TripDraft 모두 받도록 days·unplaced만 요구한다.
import { emptyDay } from "@/features/trips";
import { MAX_TRIP_DAYS, type TripDraft, type VisitItem } from "@/shared/domain";
import { addDays, diffDays, fromMinutes, toMinutes } from "@/shared/lib/date";

type Editable = Pick<TripDraft, "days" | "unplaced">;

function mapDay<T extends Editable>(
  trip: T,
  dayIndex: number,
  fn: (items: VisitItem[]) => VisitItem[],
): T {
  return {
    ...trip,
    days: trip.days.map((d, i) => (i === dayIndex ? { ...d, items: fn(d.items) } : d)),
  };
}

/** 한 칸 위(-1)·아래(+1)로. 끝에서는 그대로 */
export function moveItem<T extends Editable>(
  trip: T,
  dayIndex: number,
  itemId: string,
  dir: -1 | 1,
): T {
  return mapDay(trip, dayIndex, (items) => {
    const from = items.findIndex((x) => x.id === itemId);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= items.length) return items;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    return next;
  });
}

/** 다른 일차 끝으로 옮긴다. 같은 방문 항목 id를 유지한다 */
export function moveItemToDay<T extends Editable>(
  trip: T,
  fromDay: number,
  itemId: string,
  toDay: number,
): T {
  const item = trip.days[fromDay]?.items.find((x) => x.id === itemId);
  if (!item || fromDay === toDay || !trip.days[toDay]) return trip;
  const removed = mapDay(trip, fromDay, (items) => items.filter((x) => x.id !== itemId));
  return mapDay(removed, toDay, (items) => [...items, item]);
}

export function removeItem<T extends Editable>(trip: T, dayIndex: number, itemId: string): T {
  return mapDay(trip, dayIndex, (items) => items.filter((x) => x.id !== itemId));
}

/** 삭제 되돌리기용 — 원래 자리(index)에 다시 넣는다 */
export function insertItem<T extends Editable>(
  trip: T,
  dayIndex: number,
  index: number,
  item: VisitItem,
): T {
  return mapDay(trip, dayIndex, (items) => [...items.slice(0, index), item, ...items.slice(index)]);
}

export function updateItem<T extends Editable>(
  trip: T,
  dayIndex: number,
  itemId: string,
  patch: Partial<Pick<VisitItem, "stayMin" | "stayLocked">>,
): T {
  return mapDay(trip, dayIndex, (items) =>
    items.map((x) => (x.id === itemId ? { ...x, ...patch } : x)),
  );
}

/** 개인 메모 — 앞뒤 공백을 지우고, 비면 memo 필드를 없앤다 */
export function setItemMemo<T extends Editable>(
  trip: T,
  dayIndex: number,
  itemId: string,
  memo: string,
): T {
  const text = memo.trim();
  return mapDay(trip, dayIndex, (items) =>
    items.map((x) => {
      if (x.id !== itemId) return x;
      const { memo: _memo, ...rest } = x;
      return text ? { ...rest, memo: text } : rest;
    }),
  );
}

/** 미배치 후보를 일차 끝에 배치한다 (미배치 이유는 지운다) */
export function placeUnplaced<T extends Editable>(trip: T, itemId: string, dayIndex: number): T {
  const found = trip.unplaced.find((x) => x.id === itemId);
  if (!found || !trip.days[dayIndex]) return trip;
  const { reason: _reason, ...item } = found;
  const next = { ...trip, unplaced: trip.unplaced.filter((x) => x.id !== itemId) };
  return mapDay(next, dayIndex, (items) => [...items, item]);
}

/** 카드에서 도착·출발을 옮기는 단위(분) — 출발을 줄일 때 체류도 이만큼은 남긴다 */
export const TIME_STEP_MIN = 10;
/** 도착을 옮길 수 있는 마지막 시각 — 계산의 하루 끝(OPEN_DAY_END 23:59)보다 앞이라 하루 시작이 끝을 넘지 않는다 */
export const LAST_CLOCK_MIN = 23 * 60 + 50;
const MAX_STAY_MIN = 600;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * 도착을 delta분 옮긴다. arriveMin은 지금 카드에 보이는 도착.
 * 고정되지 않은 첫 장소는 하루 시작을, 그 밖은 고정 시작 시각(fixedStart)을 옮긴다 — 재계산이 이 시각을 옮기지 않는다.
 */
export function nudgeArrive<T extends Editable>(
  trip: T,
  dayIndex: number,
  itemId: string,
  arriveMin: number,
  delta: number,
): T {
  const day = trip.days[dayIndex];
  const index = day ? day.items.findIndex((x) => x.id === itemId) : -1;
  const item = day?.items[index];
  if (!day || !item) return trip;
  if (index === 0 && item.fixedStart === undefined) {
    const startTime = fromMinutes(clamp(toMinutes(day.startTime) + delta, 0, LAST_CLOCK_MIN));
    return { ...trip, days: trip.days.map((d, i) => (i === dayIndex ? { ...d, startTime } : d)) };
  }
  const fixedStart = fromMinutes(clamp(arriveMin + delta, 0, LAST_CLOCK_MIN));
  return mapDay(trip, dayIndex, (items) =>
    items.map((x) => (x.id === itemId ? { ...x, fixedStart } : x)),
  );
}

/** 사용자가 고정한 도착을 풀어 다시 이동시간대로 계산되게 한다 */
export function unpinArrive<T extends Editable>(trip: T, dayIndex: number, itemId: string): T {
  return mapDay(trip, dayIndex, (items) =>
    items.map((x) => {
      if (x.id !== itemId) return x;
      const { fixedStart: _fixedStart, ...rest } = x;
      return rest;
    }),
  );
}

/** 출발을 delta분 옮긴다 = 지금 보이는 체류(stayMin)를 delta만큼 바꾸고 고정한다 */
export function nudgeDepart<T extends Editable>(
  trip: T,
  dayIndex: number,
  itemId: string,
  stayMin: number,
  delta: number,
): T {
  return updateItem(trip, dayIndex, itemId, {
    stayMin: clamp(stayMin + delta, TIME_STEP_MIN, MAX_STAY_MIN),
    stayLocked: true,
  });
}

type Dated = Editable & Pick<TripDraft, "startDate" | "endDate">;

/** 마지막 날 다음 날을 빈 일차로 붙인다. 최대 일수면 그대로 */
export function addDay<T extends Dated>(trip: T): T {
  if (trip.days.length >= MAX_TRIP_DAYS) return trip;
  const date = addDays(trip.endDate, 1);
  return { ...trip, endDate: date, days: [...trip.days, emptyDay(date)] };
}

/** 시작일을 옮기면 일수·담은 장소는 그대로 두고 모든 일차 날짜를 함께 옮긴다 */
export function shiftStartDate<T extends Dated>(trip: T, startDate: string): T {
  const offset = diffDays(trip.startDate, startDate);
  if (offset === 0) return trip;
  return {
    ...trip,
    startDate,
    endDate: addDays(trip.endDate, offset),
    days: trip.days.map((d) => ({ ...d, date: addDays(d.date, offset) })),
  };
}
