// 일차 시간 계산 — 순방향 도착 계산 + 역방향 출발 한도 전파 (기능명세 §6, PLN-04~09). 순수 함수.
//
// 순방향: 도착 = 이전 출발 + 실제 경로 예상시간 + 접근 여유. 방문 시작 = max(도착, 이용 가능한 영업 구간 시작).
// 역방향: 다음 고정 일정(시작 − 준비 여유) 또는 일일 종료에서 출발해, 구간 이동·여유·필요 체류·영업조건을
//         차례로 빼며 앞 장소들의 "늦어도 출발/시작" 한도를 전파한다 (축제 바로 앞 장소만 보지 않는다).
// 원칙: 사용자가 고정한 체류·시각은 줄이거나 옮기지 않는다. 경로를 모르면 그 뒤 시각을 확정값으로 쓰지 않는다.
import {
  ACCESS_BUFFER_MIN,
  MIN_STAY_MIN,
  PREP_BUFFER_MIN,
  type PlaceCategory,
  type TimeRange,
  type TripDay,
  type VisitItem,
} from "@/shared/domain";
import { dayOfWeek, toMinutes } from "@/shared/lib/date";
import { formatClock, formatDuration } from "@/shared/lib/format";

export interface ScheduleConfig {
  accessBufferMin: number;
  prepBufferMin: number;
  minStay: Record<PlaceCategory | "festival", number>;
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  accessBufferMin: ACCESS_BUFFER_MIN,
  prepBufferMin: PREP_BUFFER_MIN,
  minStay: MIN_STAY_MIN,
};

/** 구간 상태 — map 기능의 LegState와 호환 (ok는 시간·거리만 쓴다) */
export type LegInput =
  | { status: "ok"; durationMin: number; distanceM: number }
  | { status: "pending" }
  | { status: "failed"; reason: string }
  | { status: "skipped" };

/** 하루 안의 영업 구간 (분 단위, 자정을 넘는 구간은 close가 1440 이상) */
export interface OpenWindow {
  open: number;
  close: number;
  lastOrder: number | null;
}

export type HoursState = "known" | "unknown" | "closed" | "not-needed";

export type IssueCode =
  | "festival-cancelled"
  | "closed"
  | "hours-unknown"
  | "location-unknown"
  | "route-failed"
  | "route-unknown"
  | "arrive-after-close"
  | "short-stay"
  | "stay-over-close"
  | "late-for-next"
  | "late-for-fixed"
  | "over-day-end";

export interface ScheduleIssue {
  code: IssueCode;
  severity: "error" | "warning";
  message: string;
}

export type LimitAnchor =
  { kind: "fixed"; itemId: string; name: string; at: number } | { kind: "dayEnd"; at: number };

export interface ItemSchedule {
  itemId: string;
  /** 도착(이동 + 접근 여유 포함). null = 앞 구간이 미확정 */
  arrive: number | null;
  start: number | null;
  end: number | null;
  waitMin: number;
  /** 실제 배정 체류 */
  stayMin: number;
  stayPlannedMin: number;
  /** 고정하지 않은 체류를 영업 종료·다음 일정에 맞춰 줄였는지 */
  stayReduced: boolean;
  fixed: boolean;
  hoursState: HoursState;
  hoursNote?: string;
  /** 그날 영업 구간 전체 (브레이크타임으로 나뉘면 여러 개) */
  windows: OpenWindow[];
  /** 방문에 사용한 영업 구간 */
  window: OpenWindow | null;
  /** 역산 한도: 늦어도 이 시각에 시작/출발해야 다음 고정 일정·일일 종료를 지킨다 */
  latestStart: number | null;
  latestDepart: number | null;
  limitBy: LimitAnchor | null;
  /** 이전 장소(또는 출발 위치) → 이 장소 구간. null = 첫 장소이고 출발 위치 없음 */
  legBefore: LegInput | null;
  bufferBeforeMin: number;
  issues: ScheduleIssue[];
}

export interface DaySchedule {
  items: ItemSchedule[];
  /** 마지막 장소 → 종료 위치 구간 */
  legToEnd: LegInput | null;
  /** 조회된 구간의 운전시간 합 (접근 여유 제외) */
  totalDriveMin: number;
  totalDistanceM: number;
  /** 합계에서 빠진 구간 수 (조회 실패·위치 미확인) — 0보다 크면 불완전 합계 */
  missingLegs: number;
  pendingLegs: number;
  /** 마지막 장소 출발(또는 종료 위치 도착) 시각 */
  end: number | null;
  errorCount: number;
  warningCount: number;
  status: "empty" | "calculating" | "ok" | "warning" | "conflict";
}

export interface DayLegs {
  /** items와 같은 길이. legsBefore[0]은 출발 위치 → 첫 장소 (출발 위치가 없으면 null) */
  legsBefore: (LegInput | null)[];
  /** 마지막 장소 → 종료 위치 (종료 위치가 없으면 null) */
  legToEnd: LegInput | null;
}

function toWindow(r: TimeRange): OpenWindow {
  const open = toMinutes(r.open);
  let close = toMinutes(r.close);
  if (close <= open) close += 1440;
  let lastOrder = r.lastOrder ? toMinutes(r.lastOrder) : null;
  if (lastOrder !== null && lastOrder < open) lastOrder += 1440;
  return { open, close, lastOrder };
}

/** 그날 영업 구간 — 예외일 우선, 없으면 요일표. null = 미확인, [] = 휴무 */
export function hoursForDate(
  item: Pick<VisitItem, "snapshot">,
  date: string,
): { state: HoursState; windows: OpenWindow[]; note?: string } {
  const s = item.snapshot;
  if (s.category === "lodging") return { state: "not-needed", windows: [] };
  let ranges: TimeRange[] | null = null;
  let note: string | undefined;
  if (s.category === "festival") {
    ranges = s.dayRanges ?? null;
  } else if (s.hours) {
    const ex = s.hours.exceptions.find((e) => e.date === date);
    if (ex) {
      ranges = ex.ranges;
      note = ex.note;
    } else {
      ranges = s.hours.weekly[dayOfWeek(date)] ?? null;
    }
  }
  if (ranges === null) return { state: "unknown", windows: [] };
  if (ranges.length === 0) return { state: "closed", windows: [], note };
  return { state: "known", windows: ranges.map(toWindow).sort((a, b) => a.open - b.open), note };
}

/** 이 항목이 꼭 확보해야 하는 체류 — 고정 체류는 그대로, 아니면 기본값과 최소 체류 중 작은 값 */
export function requiredStay(item: VisitItem, config: ScheduleConfig): number {
  if (item.stayLocked) return item.stayMin;
  return Math.min(item.stayMin, config.minStay[item.snapshot.category]);
}

function bufferFor(item: VisitItem, config: ScheduleConfig): number {
  // 고정 프로그램 앞: 접근 여유와 준비 여유를 중복 합산하지 않는다 (큰 값 하나)
  return item.fixedStart
    ? Math.max(config.accessBufferMin, config.prepBufferMin)
    : config.accessBufferMin;
}

/** 도착 시각에서 고를 수 있는 첫 영업 구간 (주문·입장 마감 전에 시작할 수 있고, 필요 체류를 채울 수 있는 구간) */
function pickWindow(
  windows: OpenWindow[],
  arrive: number,
  needStay: number,
): {
  window: OpenWindow | null;
  start: number;
  problem: "arrive-after-close" | "short-stay" | null;
} {
  let partial: { window: OpenWindow; start: number } | null = null;
  for (const w of windows) {
    const start = Math.max(arrive, w.open);
    if (start > (w.lastOrder ?? w.close)) continue;
    if (start + needStay <= w.close) return { window: w, start, problem: null };
    partial ??= { window: w, start };
  }
  if (partial) return { ...partial, problem: "short-stay" };
  return {
    window: windows[windows.length - 1] ?? null,
    start: arrive,
    problem: "arrive-after-close",
  };
}

/** 다음 한도(늦어도 출발)를 지키며 이 장소에서 시작할 수 있는 가장 늦은 시각 */
function latestStartWithin(
  windows: OpenWindow[],
  latestDepart: number,
  need: number,
): number | null {
  let best: number | null = null;
  for (const w of windows) {
    const cand = Math.min(latestDepart - need, w.lastOrder ?? w.close, w.close - need);
    if (cand >= w.open && (best === null || cand > best)) best = cand;
  }
  return best;
}

/**
 * 추천 배치용 — 도착 시각에 이 장소를 영업조건 안에서 방문할 수 있으면 시작·종료를, 아니면 null.
 * 영업시간 미확인·휴무는 자동 배치하지 않으므로 null (PLN-07).
 */
export function fitVisit(
  item: VisitItem,
  date: string,
  arrive: number,
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG,
): { start: number; end: number } | null {
  const h = hoursForDate(item, date);
  if (h.state === "not-needed") return { start: arrive, end: arrive + item.stayMin };
  if (h.state !== "known") return null;
  const need = requiredStay(item, config);
  const pick = pickWindow(h.windows, arrive, need);
  if (pick.problem || !pick.window) return null;
  const stay = Math.max(need, Math.min(item.stayMin, pick.window.close - pick.start));
  return { start: pick.start, end: pick.start + stay };
}

function anchorLabel(a: LimitAnchor): string {
  return a.kind === "fixed" ? `${a.name} ${formatClock(a.at)}` : `일일 종료 ${formatClock(a.at)}`;
}

export function computeDaySchedule(
  day: TripDay,
  legs: DayLegs,
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG,
): DaySchedule {
  const items = day.items;
  const n = items.length;
  const dayStart = toMinutes(day.startTime);
  const dayEnd =
    toMinutes(day.endTime) <= dayStart ? toMinutes(day.endTime) + 1440 : toMinutes(day.endTime);
  const hours = items.map((it) => hoursForDate(it, day.date));

  // ── 역방향: 늦어도 출발/시작 한도 ──
  const latestStart: (number | null)[] = new Array<number | null>(n).fill(null);
  const latestDepart: (number | null)[] = new Array<number | null>(n).fill(null);
  const limitBy: (LimitAnchor | null)[] = new Array<LimitAnchor | null>(n).fill(null);
  let nextDepartLimit: number | null = null;
  let nextAnchor: LimitAnchor | null = null;
  if (legs.legToEnd === null) {
    nextDepartLimit = dayEnd;
    nextAnchor = { kind: "dayEnd", at: dayEnd };
  } else if (legs.legToEnd.status === "ok") {
    nextDepartLimit = dayEnd - legs.legToEnd.durationMin - config.accessBufferMin;
    nextAnchor = { kind: "dayEnd", at: dayEnd };
  }
  for (let i = n - 1; i >= 0; i--) {
    const it = items[i];
    const h = hours[i];
    if (!it || !h) continue;
    latestDepart[i] = nextDepartLimit;
    limitBy[i] = nextAnchor;
    let ls: number | null;
    let anchor: LimitAnchor | null = nextAnchor;
    if (it.fixedStart) {
      ls = toMinutes(it.fixedStart);
      anchor = { kind: "fixed", itemId: it.id, name: it.snapshot.name, at: ls };
    } else if (nextDepartLimit === null) {
      ls = null;
    } else {
      const need = requiredStay(it, config);
      ls =
        h.state === "known"
          ? latestStartWithin(h.windows, nextDepartLimit, need)
          : nextDepartLimit - need;
    }
    latestStart[i] = ls;
    const leg = legs.legsBefore[i];
    if (ls !== null && leg?.status === "ok") {
      nextDepartLimit = ls - leg.durationMin - bufferFor(it, config);
      nextAnchor = anchor;
    } else {
      nextDepartLimit = null;
      nextAnchor = null;
    }
  }

  // ── 순방향: 도착·시작·체류·출발 ──
  const out: ItemSchedule[] = [];
  let prevEnd: number | null = dayStart;
  for (let i = 0; i < n; i++) {
    const it = items[i];
    const h = hours[i];
    if (!it || !h) continue;
    const leg = legs.legsBefore[i] ?? null;
    const buffer = bufferFor(it, config);
    const issues: ScheduleIssue[] = [];
    const add = (code: IssueCode, severity: ScheduleIssue["severity"], message: string) => {
      if (!issues.some((x) => x.code === code)) issues.push({ code, severity, message });
    };

    let arrive: number | null;
    if (leg === null) {
      arrive = i === 0 ? prevEnd : null;
    } else if (leg.status === "ok" && prevEnd !== null) {
      arrive = prevEnd + leg.durationMin + buffer;
    } else {
      arrive = null;
    }

    if (it.snapshot.festivalState === "cancelled") {
      add(
        "festival-cancelled",
        "error",
        "취소된 축제예요. 일정에서 빼거나 다른 장소로 바꿔 주세요.",
      );
    }
    if (it.snapshot.location === null) {
      add("location-unknown", "warning", "위치가 확인되지 않아 경로 계산에서 뺐어요.");
    }
    if (leg?.status === "failed") {
      add(
        "route-failed",
        "warning",
        "이전 장소에서 오는 경로를 불러오지 못했어요. 이후 시각은 확정되지 않았어요.",
      );
    } else if (leg?.status === "skipped" && it.snapshot.location !== null) {
      add("route-unknown", "warning", "앞 장소의 위치를 몰라 도착 시각을 계산하지 못했어요.");
    }

    const planned = it.stayMin;
    const need = requiredStay(it, config);
    let start: number | null = null;
    let end: number | null = null;
    let stay = planned;
    let window: OpenWindow | null = null;

    if (it.fixedStart) {
      start = toMinutes(it.fixedStart);
      end = it.fixedEnd ? toMinutes(it.fixedEnd) : start + planned;
      if (end < start) end += 1440;
      stay = end - start;
      if (arrive !== null && arrive > start) {
        add(
          "late-for-fixed",
          "error",
          `${formatClock(arrive)}에 도착해 시작 시각보다 ${formatDuration(arrive - start)} 늦어요. 앞 일정을 줄이거나 순서를 바꿔 주세요.`,
        );
      }
    } else if (arrive !== null) {
      let closeCap = Number.POSITIVE_INFINITY;
      if (h.state === "known") {
        const pick = pickWindow(h.windows, arrive, need);
        start = pick.start;
        window = pick.window;
        if (pick.problem === "arrive-after-close" && window) {
          const cut = window.lastOrder ?? window.close;
          add(
            "arrive-after-close",
            "error",
            `${formatClock(arrive)}에 도착하면 ${window.lastOrder !== null ? "주문·입장 마감" : "영업 종료"}(${formatClock(cut)})이 지나요.`,
          );
        }
        if (window && pick.problem !== "arrive-after-close") closeCap = window.close;
      } else {
        start = arrive;
      }

      const availClose = closeCap - start;
      const availNext = (latestDepart[i] ?? Number.POSITIVE_INFINITY) - start;
      if (it.stayLocked) {
        stay = planned;
        if (stay > availClose && window) {
          add(
            "stay-over-close",
            "error",
            `고정한 체류 시간(${formatDuration(planned)})이 영업 종료(${formatClock(window.close)})를 넘겨요. 휴게시간을 가로질러 머물 수 없어요.`,
          );
        }
      } else {
        stay = Math.min(planned, availClose, availNext);
        if (stay < need) {
          if (availClose < need && window) {
            add(
              "short-stay",
              "error",
              `영업 종료(${formatClock(window.close)})까지 ${formatDuration(Math.max(0, availClose))}뿐이라 최소 체류(${formatDuration(need)})를 채울 수 없어요.`,
            );
          }
          stay = need;
        }
      }
      end = start + stay;
    }

    if (h.state === "closed" && !it.fixedStart) {
      add("closed", "error", h.note ? `이날은 휴무예요 (${h.note}).` : "이날은 휴무예요.");
    } else if (h.state === "unknown" && !it.fixedStart) {
      add(
        "hours-unknown",
        "warning",
        "영업시간이 확인되지 않았어요. 방문 전에 직접 확인해 주세요.",
      );
    }

    const ls = latestStart[i] ?? null;
    const anchor = limitBy[i] ?? null;
    const departLimit = latestDepart[i] ?? null;
    // 다음 일정 기준 한도만 본다 — 영업 종료 때문에 못 맞추는 경우는 위의 마감·체류 사유가 설명한다
    const nextStartLimit = departLimit === null ? null : departLimit - need;
    if (
      !it.fixedStart &&
      start !== null &&
      nextStartLimit !== null &&
      start > nextStartLimit &&
      anchor
    ) {
      add(
        anchor.kind === "fixed" ? "late-for-next" : "over-day-end",
        anchor.kind === "fixed" ? "error" : "warning",
        `${anchorLabel(anchor)}에 맞추려면 늦어도 ${formatClock(nextStartLimit)}에 시작해야 해요.`,
      );
    }

    out.push({
      itemId: it.id,
      arrive,
      start,
      end,
      waitMin: arrive !== null && start !== null ? Math.max(0, start - arrive) : 0,
      stayMin: stay,
      stayPlannedMin: planned,
      stayReduced: !it.fixedStart && !it.stayLocked && stay < planned,
      fixed: Boolean(it.fixedStart),
      hoursState: h.state,
      hoursNote: h.note,
      windows: h.windows,
      window,
      latestStart: ls,
      latestDepart: latestDepart[i] ?? null,
      limitBy: anchor,
      legBefore: leg,
      bufferBeforeMin: leg ? buffer : 0,
      issues,
    });
    prevEnd = end;
  }

  // ── 일일 종료 ──
  let dayFinish: number | null = prevEnd;
  if (legs.legToEnd && prevEnd !== null) {
    dayFinish =
      legs.legToEnd.status === "ok"
        ? prevEnd + legs.legToEnd.durationMin + config.accessBufferMin
        : null;
  }
  const last = out[out.length - 1];
  if (
    last &&
    dayFinish !== null &&
    dayFinish > dayEnd &&
    !last.issues.some((x) => x.code === "over-day-end")
  ) {
    last.issues.push({
      code: "over-day-end",
      severity: "warning",
      message: `일일 종료 시각(${formatClock(dayEnd)})을 ${formatDuration(dayFinish - dayEnd)} 넘겨요.`,
    });
  }

  const allLegs = [...out.map((x) => x.legBefore), legs.legToEnd].filter(
    (l): l is LegInput => l !== null,
  );
  let totalDriveMin = 0;
  let totalDistanceM = 0;
  let missingLegs = 0;
  let pendingLegs = 0;
  for (const l of allLegs) {
    if (l.status === "ok") {
      totalDriveMin += l.durationMin;
      totalDistanceM += l.distanceM;
    } else if (l.status === "pending") {
      pendingLegs += 1;
    } else {
      missingLegs += 1;
    }
  }
  const errorCount = out.reduce(
    (s, x) => s + x.issues.filter((i) => i.severity === "error").length,
    0,
  );
  const warningCount = out.reduce(
    (s, x) => s + x.issues.filter((i) => i.severity === "warning").length,
    0,
  );
  const status: DaySchedule["status"] =
    n === 0
      ? "empty"
      : pendingLegs > 0
        ? "calculating"
        : errorCount > 0
          ? "conflict"
          : warningCount > 0
            ? "warning"
            : "ok";

  return {
    items: out,
    legToEnd: legs.legToEnd,
    totalDriveMin,
    totalDistanceM,
    missingLegs,
    pendingLegs,
    end: dayFinish,
    errorCount,
    warningCount,
    status,
  };
}
