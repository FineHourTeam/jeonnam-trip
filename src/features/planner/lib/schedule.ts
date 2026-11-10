// 일차 시간 계산 순수 함수 — 기능명세 §6 (순방향 도착·연쇄 역산·영업조건 충돌).
// 시각은 자정 기준 분(number)으로 계산하고, 화면은 fromMinutes()로 표시한다.
// 사용자 순서·고정 시각·고정 체류는 바꾸지 않는다. 충돌은 이유만 돌려주고 해결 동작은 화면이 제시한다.
import { dayOfWeek, toMinutes } from "@/shared/lib/date";
import type { PlaceCategory, TimeRange, TripDay, VisitItem } from "@/shared/domain";

/** 기본 여유(분) — 계약 전 확정 대상이라 한 곳에서만 정한다 */
export const DEFAULT_ACCESS_MIN = 10; // 주차·도보 접근 여유 (경로 시간과 별도)
export const DEFAULT_PREP_MIN = 10; // 고정 프로그램 준비 여유 — 이 구간에서는 접근 여유를 대신한다 (중복 합산 금지)

/** 최소 허용 체류(분) — 자동 배정 체류가 이보다 짧으면 방문 가능한 일정으로 확정하지 않는다. 계약 전 확정 대상 */
export const MIN_STAY_MIN: Record<PlaceCategory | "festival", number> = {
  festival: 60,
  restaurant: 60,
  cafe: 30,
  shop: 20,
  attraction: 45,
  lodging: 0,
};

/** 구간 경로 상태 — features/map의 LegState와 구조가 맞는다 */
export type LegInput =
  | { status: "ok"; durationMin: number; distanceM: number }
  | { status: "pending" }
  | { status: "failed" }
  | { status: "skipped" };

export type IssueKind =
  // 충돌 — 이대로는 방문할 수 없어요
  | "closed" // 휴무
  | "arrive_after_close" // 도착 시 마감
  | "last_order_passed" // 주문·입장 마감 뒤 도착
  | "stay_too_short" // 영업구간 안에 최소 체류가 안 들어감 (브레이크타임 등)
  | "late_for_next" // 다음 고정 일정·하루 종료에 늦음 (blockedBy)
  | "late_for_fixed" // 고정 프로그램 시작(준비 여유 포함)에 늦게 도착
  | "late_for_pinned" // 사용자가 고정한 도착 시각보다 이동이 늦음
  | "festival_cancelled"
  // 미확정 — 계산은 했지만 확인이 필요해요
  | "hours_unknown"
  | "no_location"
  | "route_failed"
  | "route_pending";

export const CONFLICT_KINDS: ReadonlySet<IssueKind> = new Set<IssueKind>([
  "closed",
  "arrive_after_close",
  "last_order_passed",
  "stay_too_short",
  "late_for_next",
  "late_for_fixed",
  "late_for_pinned",
  "festival_cancelled",
]);

export interface Issue {
  kind: IssueKind;
  /** late_for_next: 늦게 되는 고정 항목 id 또는 "day_end" */
  blockedBy?: string;
}

/** 영업 구간(분). close·lastOrder는 자정을 넘으면 1440을 더한 값 */
export interface Slot {
  open: number;
  close: number;
  lastOrder?: number;
}

export interface ScheduledItem {
  itemId: string;
  /** null = 앞 구간 경로를 몰라 계산하지 못함 (이전 값을 확정값으로 쓰지 않는다) */
  arrive: number | null;
  start: number | null;
  /** 영업 시작 전 대기 — 체류와 별도 표시 */
  waitMin: number;
  stayMin: number;
  depart: number | null;
  /** 이용 시작 한도 · 출발 한도 (후속 일정에서 역산). null = 후속 경로를 몰라 역산 불가 */
  latestStart: number | null;
  latestDepart: number | null;
  /** 배정에 쓴 영업 구간 */
  slot: Slot | null;
  /** 그날의 영업 구간 전체 (브레이크타임 표시용). null = 미확인, [] = 휴무 */
  slots: Slot[] | null;
  issues: Issue[];
}

export type DayStatus = "calculating" | "conflict" | "unconfirmed" | "ok";

export interface DaySchedule {
  items: ScheduledItem[];
  status: DayStatus;
  /** 조회된 구간만 더한 이동 합계 — routesComplete가 false면 완전한 값처럼 표시하지 않는다 */
  driveMin: number;
  distanceM: number;
  routesComplete: boolean;
}

export interface ScheduleInput {
  day: TripDay;
  /** legs[i] = items[i] → items[i+1] (길이 items.length - 1) */
  legs: LegInput[];
  /** 출발 위치 → 첫 장소. 출발 위치가 없으면 생략 (첫 장소부터 합산) */
  startLeg?: LegInput;
  /** 마지막 장소 → 종료 위치 */
  endLeg?: LegInput;
  accessMin?: number;
  prepMin?: number;
}

/** 그날의 영업 구간. null = 미확인, [] = 휴무 */
export function rangesOn(item: VisitItem, date: string): TimeRange[] | null {
  const s = item.snapshot;
  if (s.category === "festival") return s.dayRanges ?? null;
  if (!s.hours) return null;
  const exception = s.hours.exceptions.find((e) => e.date === date);
  if (exception) return exception.ranges;
  return s.hours.weekly[dayOfWeek(date)] ?? null;
}

// ponytail: 전날 밤에 시작해 자정을 넘긴 구간(토 18:00~02:00의 일요일 새벽분)은 반영하지 않는다 — 새벽 일정이 필요해지면 전날 구간도 합친다
export function toSlots(ranges: TimeRange[]): Slot[] {
  return ranges
    .map((r) => {
      const open = toMinutes(r.open);
      let close = toMinutes(r.close);
      if (close <= open) close += 1440;
      let lastOrder = r.lastOrder ? toMinutes(r.lastOrder) : undefined;
      if (lastOrder !== undefined && lastOrder < open) lastOrder += 1440;
      return { open, close, lastOrder };
    })
    .sort((a, b) => a.open - b.open);
}

const finiteOrNull = (n: number) => (Number.isFinite(n) ? n : null);

function legDuration(leg: LegInput | undefined): number | null {
  return leg?.status === "ok" ? leg.durationMin : null;
}

function legIssue(leg: LegInput): Issue | null {
  if (leg.status === "pending") return { kind: "route_pending" };
  // skipped(좌표 미확인)는 해당 장소의 no_location이 이유를 설명한다
  if (leg.status === "failed") return { kind: "route_failed" };
  return null;
}

/** 꼭 확보해야 하는 체류 — 고정 체류는 그대로, 자동 배정은 최소 허용 체류까지 줄일 수 있다 */
function requiredStay(item: VisitItem): number {
  if (item.stayLocked) return item.stayMin;
  return Math.min(item.stayMin, MIN_STAY_MIN[item.snapshot.category]);
}

/** 하루 종료는 화면에서 고르지 않으므로 계산에서는 자정 직전까지 연다 (저장된 endTime은 쓰지 않는다) */
export const OPEN_DAY_END = "23:59";

/** 사용자가 카드에서 고정한 도착 — 운영 시각이 정해진 축제 프로그램(fixedEnd·programId)이 아닌 fixedStart */
export function isPinnedArrive(item: VisitItem): item is VisitItem & { fixedStart: string } {
  return (
    item.fixedStart !== undefined &&
    item.fixedEnd === undefined &&
    !(item.ref.kind === "festival" && item.ref.programId)
  );
}

/** 시작 시각이 정해진 프로그램 — 영업 구간 배정 없이 그 시각에 시작한다 */
function isFixed(item: VisitItem): item is VisitItem & { fixedStart: string } {
  return item.fixedStart !== undefined && !isPinnedArrive(item);
}

function fixedStay(item: VisitItem & { fixedStart: string }): number {
  return item.fixedEnd ? toMinutes(item.fixedEnd) - toMinutes(item.fixedStart) : item.stayMin;
}

/** 출발 한도 latestDepart 안에서 가장 늦게 이용을 시작할 수 있는 시각. -Infinity = 불가 */
function latestStartWithin(slots: Slot[] | null, latestDepart: number, need: number): number {
  if (!slots) return latestDepart - need;
  let best = -Infinity;
  for (const s of slots) {
    const t = Math.min(s.lastOrder ?? Infinity, Math.min(s.close, latestDepart) - need);
    if (t >= s.open && t > best) best = t;
  }
  return best;
}

interface SlotChoice {
  slot: Slot | null;
  start: number;
  stay: number;
  issue: Issue | null;
}

/** 도착 시각 이후 이용 가능한 첫 영업 구간에 배정한다. 못 찾으면 가장 그럴듯한 구간과 충돌 이유를 돌려준다 */
function pickSlot(
  item: VisitItem,
  slots: Slot[] | null,
  arrive: number,
  latestDepart: number,
  blockedBy: string,
): SlotChoice {
  const need = requiredStay(item);
  const fit = (start: number, end: number) =>
    item.stayLocked ? item.stayMin : Math.max(need, Math.min(item.stayMin, end - start));

  if (!slots) {
    const ok = latestDepart - arrive >= need;
    return {
      slot: null,
      start: arrive,
      stay: fit(arrive, latestDepart),
      issue: ok ? null : { kind: "late_for_next", blockedBy },
    };
  }
  if (slots.length === 0) {
    return { slot: null, start: arrive, stay: item.stayMin, issue: { kind: "closed" } };
  }

  let fallback: SlotChoice | null = null;
  for (const slot of slots) {
    const start = Math.max(arrive, slot.open);
    if (start >= slot.close) continue;
    let issue: Issue | null = null;
    if (slot.lastOrder !== undefined && start > slot.lastOrder) {
      issue = { kind: "last_order_passed" };
    } else if (slot.close - start < need) {
      issue = { kind: "stay_too_short" };
    } else if (latestDepart - start < need) {
      issue = { kind: "late_for_next", blockedBy };
    }
    const pick = { slot, start, stay: fit(start, Math.min(slot.close, latestDepart)), issue };
    if (!issue) return pick;
    fallback ??= pick;
  }
  return (
    fallback ?? {
      slot: null,
      start: arrive,
      stay: item.stayMin,
      issue: { kind: "arrive_after_close" },
    }
  );
}

export function computeDaySchedule(input: ScheduleInput): DaySchedule {
  const { day, legs, startLeg, endLeg } = input;
  const access = input.accessMin ?? DEFAULT_ACCESS_MIN;
  const prep = input.prepMin ?? DEFAULT_PREP_MIN;
  const dayStart = toMinutes(day.startTime);
  const dayEnd = toMinutes(OPEN_DAY_END);

  const entries = day.items.map((item, i) => {
    const ranges = rangesOn(item, day.date);
    return {
      item,
      slots: ranges ? toSlots(ranges) : null,
      /** 이 항목으로 들어오는 구간. 첫 항목은 출발 위치가 있을 때만 */
      legIn: i === 0 ? startLeg : (legs[i - 1] ?? { status: "pending" as const }),
      /** 도착 시 더하는 접근 여유. 고정 항목은 준비 여유(시작 − prep까지 도착)가 대신하므로 0 */
      buffer: isFixed(item) ? 0 : access,
      latestDepart: Infinity,
      latestStart: Infinity,
      anchor: "day_end",
    };
  });

  // 역방향: 다음 고정 일정 또는 하루 종료에서 출발 한도를 앞 장소로 전파한다. Infinity = 후속 경로를 몰라 한도 없음
  const endDur = endLeg ? legDuration(endLeg) : 0;
  let limit = endDur === null ? Infinity : dayEnd - endDur - (endLeg ? access : 0);
  let anchor = "day_end";
  for (const e of [...entries].reverse()) {
    e.latestDepart = limit;
    e.anchor = anchor;
    e.latestStart = isFixed(e.item)
      ? toMinutes(e.item.fixedStart)
      : latestStartWithin(e.slots, limit, requiredStay(e.item));
    // 이 장소 자체가 불가능(휴무 등)하면 앞 장소까지 불가능으로 번지지 않게 출발 한도만 넘긴다
    const latestArrive = isFixed(e.item)
      ? e.latestStart - prep
      : isPinnedArrive(e.item)
        ? toMinutes(e.item.fixedStart)
        : e.latestStart === -Infinity
          ? limit
          : e.latestStart;
    const dur = legDuration(e.legIn);
    limit = dur === null ? Infinity : latestArrive - dur - e.buffer;
    if (e.item.fixedStart !== undefined) anchor = e.item.id;
  }

  // 순방향: 도착 = 이전 출발 + 경로 시간 + 여유. 경로를 모르면 그 뒤는 고정 항목이 나올 때까지 계산하지 않는다
  const out: ScheduledItem[] = [];
  let prevDepart: number | null = dayStart;
  for (const {
    item,
    slots,
    legIn,
    buffer,
    latestDepart,
    latestStart,
    anchor: blockedBy,
  } of entries) {
    const issues: Issue[] = [];
    let arrive: number | null = prevDepart;
    if (legIn) {
      const issue = legIssue(legIn);
      if (issue) issues.push(issue);
      const dur = legDuration(legIn);
      arrive = arrive === null || dur === null ? null : arrive + dur + buffer;
    }
    if (!item.snapshot.location) issues.push({ kind: "no_location" });
    if (item.snapshot.festivalState === "cancelled") issues.push({ kind: "festival_cancelled" });
    // 고정한 도착은 그 시각에 도착한 것으로 보고 아래에서 영업조건을 그대로 검사한다
    if (isPinnedArrive(item)) {
      const pin = toMinutes(item.fixedStart);
      if (arrive !== null && arrive > pin) issues.push({ kind: "late_for_pinned" });
      arrive = pin;
    }

    let start: number | null;
    let stay: number;
    let slot: Slot | null = null;
    if (isFixed(item)) {
      start = toMinutes(item.fixedStart);
      stay = fixedStay(item);
      if (arrive !== null && arrive > start - prep) issues.push({ kind: "late_for_fixed" });
      if (start + stay > latestDepart) issues.push({ kind: "late_for_next", blockedBy });
    } else if (arrive === null) {
      start = null;
      stay = item.stayMin;
      if (!slots) issues.push({ kind: "hours_unknown" });
    } else {
      const pick = pickSlot(item, slots, arrive, latestDepart, blockedBy);
      ({ start, stay, slot } = pick);
      if (pick.issue) issues.push(pick.issue);
      if (!slots) issues.push({ kind: "hours_unknown" });
    }

    const depart = start === null ? null : start + stay;
    out.push({
      itemId: item.id,
      arrive,
      start,
      waitMin: arrive !== null && start !== null ? Math.max(0, start - arrive) : 0,
      stayMin: stay,
      depart,
      latestStart: finiteOrNull(latestStart),
      latestDepart: finiteOrNull(latestDepart),
      slot,
      slots,
      issues,
    });
    prevDepart = depart;
  }

  const allLegs = [startLeg, ...legs, endLeg].filter((l): l is LegInput => l !== undefined);
  const okLegs = allLegs.filter((l) => l.status === "ok");
  const allIssues = out.flatMap((s) => s.issues);
  const status: DayStatus = allIssues.some((x) => x.kind === "route_pending")
    ? "calculating"
    : allIssues.some((x) => CONFLICT_KINDS.has(x.kind))
      ? "conflict"
      : allIssues.length > 0
        ? "unconfirmed"
        : "ok";

  return {
    items: out,
    status,
    driveMin: okLegs.reduce((sum, l) => sum + l.durationMin, 0),
    distanceM: okLegs.reduce((sum, l) => sum + l.distanceM, 0),
    routesComplete: okLegs.length === allLegs.length,
  };
}
