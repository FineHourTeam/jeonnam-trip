// 코스 조립 순수 함수 — 축제·장소·크리에이터·보관함 화면이 "일정에 추가"할 때 같은 규칙을 쓴다.
// 담는 순간 이름·위치·영업정보 사본(snapshot)을 함께 저장한다 (기능명세 §1).
import { dateRange, diffDays } from "@/shared/lib/date";
import {
  DEFAULT_STAY_MIN,
  MAX_TRIP_DAYS,
  type CustomPlace,
  type Festival,
  type Place,
  type SigunCode,
  type TripDay,
  type TripDraft,
  type TripOrigin,
  type TripPace,
  type VisitItem,
  type VisitRef,
} from "@/shared/domain";

/** 일일 기본 시작·종료 시각 — 계약 전 확정 대상이라 한 곳에서만 정한다 (기능명세 §6) */
export const DEFAULT_DAY_START = "09:00";
export const DEFAULT_DAY_END = "21:00";

function newId(): string {
  return crypto.randomUUID();
}

export function visitFromPlace(place: Place): VisitItem {
  return {
    id: newId(),
    ref: { kind: "place", placeId: place.id },
    snapshot: {
      name: place.name,
      category: place.category,
      location: place.location,
      hours: place.hours,
      sourceUpdatedAt: place.updatedAt,
      capturedAt: new Date().toISOString(),
    },
    stayMin: DEFAULT_STAY_MIN[place.category],
    stayLocked: false,
  };
}

/** 축제 방문 항목. programId가 있으면 프로그램 구간을 고정한다 (개최 기간 전체를 체류로 쓰지 않는다) */
export function visitFromFestival(festival: Festival, date: string, programId?: string): VisitItem {
  const day = festival.days.find((d) => d.date === date);
  const program = programId ? festival.programs.find((p) => p.id === programId) : undefined;
  return {
    id: newId(),
    ref: { kind: "festival", festivalId: festival.id, programId: program?.id },
    snapshot: {
      name: program ? `${festival.name} · ${program.name}` : festival.name,
      category: "festival",
      location: festival.location,
      dayRanges: day ? day.ranges : null,
      festivalState: festival.state,
      sourceUpdatedAt: festival.updatedAt,
      capturedAt: new Date().toISOString(),
    },
    stayMin: DEFAULT_STAY_MIN.festival,
    stayLocked: false,
    fixedStart: program?.start,
    fixedEnd: program?.end,
  };
}

export function visitFromCustomPlace(place: CustomPlace): VisitItem {
  return {
    id: newId(),
    ref: { kind: "custom", customPlaceId: place.id },
    snapshot: {
      name: place.name,
      category: place.category ?? "attraction",
      location: place.location,
      capturedAt: new Date().toISOString(),
    },
    stayMin: DEFAULT_STAY_MIN[place.category ?? "attraction"],
    stayLocked: false,
  };
}

export function emptyDay(date: string): TripDay {
  return { date, startTime: DEFAULT_DAY_START, endTime: DEFAULT_DAY_END, items: [] };
}

export class TripTooLongError extends Error {
  constructor() {
    super(`여행 기간은 최대 ${String(MAX_TRIP_DAYS)}일까지 만들 수 있어요.`);
    this.name = "TripTooLongError";
  }
}

export function newTripDraft(input: {
  title?: string;
  startDate: string;
  endDate: string;
  siguns: SigunCode[];
  pace: TripPace;
  origin: TripOrigin;
}): TripDraft {
  const days = diffDays(input.startDate, input.endDate) + 1;
  if (days < 1 || days > MAX_TRIP_DAYS) throw new TripTooLongError();
  return {
    title: input.title ?? "새 여행",
    startDate: input.startDate,
    endDate: input.endDate,
    mode: "car",
    pace: input.pace,
    siguns: input.siguns,
    days: dateRange(input.startDate, input.endDate).map(emptyDay),
    unplaced: [],
    origin: input.origin,
  };
}

function sameRef(a: VisitRef, b: VisitRef): boolean {
  if (a.kind === "place" && b.kind === "place") return a.placeId === b.placeId;
  if (a.kind === "custom" && b.kind === "custom") return a.customPlaceId === b.customPlaceId;
  if (a.kind === "festival" && b.kind === "festival") {
    return a.festivalId === b.festivalId && a.programId === b.programId;
  }
  return false;
}

/**
 * 일차에 방문 항목을 덧붙인다 (순서 끝). 같은 일차에 이미 있는 대상은 넣지 않고 duplicates로 돌려준다
 * — 화면이 "이미 담긴 장소예요"를 안내한다. 반복 방문 허용 정책은 계약 전 확정 대상.
 */
export function addItemsToDay<T extends Pick<TripDraft, "days">>(
  trip: T,
  dayIndex: number,
  items: VisitItem[],
): { trip: T; added: VisitItem[]; duplicates: VisitItem[] } {
  const day = trip.days[dayIndex];
  if (!day) throw new RangeError(`일차 ${String(dayIndex + 1)}이(가) 없어요.`);
  const added: VisitItem[] = [];
  const duplicates: VisitItem[] = [];
  for (const item of items) {
    const exists = [...day.items, ...added].some((x) => sameRef(x.ref, item.ref));
    (exists ? duplicates : added).push(item);
  }
  const days = trip.days.map((d, i) =>
    i === dayIndex ? { ...d, items: [...d.items, ...added] } : d,
  );
  return { trip: { ...trip, days }, added, duplicates };
}

/** 날짜가 여행 기간 안이면 그 일차 index, 아니면 -1 */
export function dayIndexOf(trip: Pick<TripDraft, "startDate" | "endDate">, date: string): number {
  if (date < trip.startDate || date > trip.endDate) return -1;
  return diffDays(trip.startDate, date);
}
