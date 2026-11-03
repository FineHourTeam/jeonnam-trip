// 코스 편집 순수 함수 — 사용자가 고른 동작만 반영한다. 순서·시각을 자동으로 바꾸지 않는다 (기능명세 §7).
// Trip·TripDraft 모두 받도록 days·unplaced만 요구한다.
import { emptyDay } from "@/features/trips";
import { MAX_TRIP_DAYS, type TripDraft, type VisitItem } from "@/shared/domain";
import { addDays, diffDays } from "@/shared/lib/date";

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

/** 미배치 후보를 일차 끝에 배치한다 (미배치 이유는 지운다) */
export function placeUnplaced<T extends Editable>(trip: T, itemId: string, dayIndex: number): T {
  const found = trip.unplaced.find((x) => x.id === itemId);
  if (!found || !trip.days[dayIndex]) return trip;
  const { reason: _reason, ...item } = found;
  const next = { ...trip, unplaced: trip.unplaced.filter((x) => x.id !== itemId) };
  return mapDay(next, dayIndex, (items) => [...items, item]);
}

export function setDayTimes<T extends Editable>(
  trip: T,
  dayIndex: number,
  times: { startTime: string; endTime: string },
): T {
  return { ...trip, days: trip.days.map((d, i) => (i === dayIndex ? { ...d, ...times } : d)) };
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
