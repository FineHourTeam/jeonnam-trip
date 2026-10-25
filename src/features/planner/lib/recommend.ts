// 추천 시작 — 고정 프로그램을 먼저 놓고, 적격 후보를 근접성·식사 시간대·영업 구간·이동시간으로 하루씩 채운다.
// 최단 동선·최적해를 보장하지 않는다 (기능명세 §6). 배치용 이동시간은 직선거리 기반 추정치로만 쓰고,
// 화면의 시각은 편집기에서 실제 경로 조회로 다시 계산한다 (직선거리를 도로거리로 표기하지 않는다).
// 사용자가 고른 후보는 버리지 않고 이유와 함께 미배치로 남긴다 (PLN-08).
import { PACE_RULES, type LatLng, type TripPace, type VisitItem } from "@/shared/domain";
import { toMinutes } from "@/shared/lib/date";
import { straightDistanceM } from "@/shared/lib/format";
import { DEFAULT_SCHEDULE_CONFIG, fitVisit, hoursForDate, type ScheduleConfig } from "./schedule";

export interface RecommendInput {
  dates: string[];
  dayStart: string;
  dayEnd: string;
  pace: TripPace;
  /** 사용자가 고른 후보 — 못 넣으면 미배치 이유와 함께 남긴다 */
  picked: VisitItem[];
  /** 지역 추천 후보 (취향순 정렬) — 못 넣으면 조용히 뺀다 */
  suggestions: VisitItem[];
  /** 날짜별 고정 일정 (축제 프로그램·사용자가 고정한 방문) */
  fixed: { date: string; item: VisitItem }[];
  /** 그 날짜에만 넣을 수 있는 후보 (시간 고정 없는 축제 방문 — 운영시간 안에서 배치) */
  dated?: { date: string; item: VisitItem }[];
  config?: ScheduleConfig;
}

export interface RecommendResult {
  days: VisitItem[][];
  unplaced: (VisitItem & { reason: string })[];
}

/** 배치 판단용 추정 이동시간(분) — 직선거리 × 우회 계수 1.35, 평균 40km/h, 최소 5분 */
export function estimateDriveMin(a: LatLng, b: LatLng): number {
  const km = (straightDistanceM(a, b) / 1000) * 1.35;
  return Math.max(5, Math.round((km / 40) * 60));
}

const LUNCH = [toMinutes("11:00"), toMinutes("13:30")] as const;
const DINNER = [toMinutes("17:30"), toMinutes("19:30")] as const;
const inRange = (t: number, r: readonly [number, number]) => t >= r[0] && t <= r[1];

function mealScore(item: VisitItem, start: number, prev: VisitItem | undefined): number {
  const meal = inRange(start, LUNCH) || inRange(start, DINNER);
  const cat = item.snapshot.category;
  const prevCat = prev?.snapshot.category;
  if (cat === "restaurant") return (meal ? -40 : 30) + (prevCat === "restaurant" ? 60 : 0);
  if (cat === "cafe") return (meal ? 15 : -5) + (prevCat === "cafe" ? 20 : 0);
  return 0;
}

function ineligibleReason(item: VisitItem, dates: string[]): string | null {
  if (item.snapshot.festivalState === "cancelled") return "취소된 축제라 일정에 넣지 않았어요.";
  if (item.snapshot.location === null) return "위치가 확인되지 않아 자동 배치에서 뺐어요.";
  const states = dates.map((d) => hoursForDate(item, d).state);
  if (states.some((s) => s === "known" || s === "not-needed")) return null;
  if (states.every((s) => s === "closed")) return "여행 기간 내내 휴무예요.";
  return "영업시간이 확인되지 않아 자동 배치에서 뺐어요. 원하는 일차에 직접 넣어 주세요.";
}

export function recommendTrip(input: RecommendInput): RecommendResult {
  const config = input.config ?? DEFAULT_SCHEDULE_CONFIG;
  const rule = PACE_RULES[input.pace ?? "default"];
  const dayStart = toMinutes(input.dayStart);
  const dayEnd = toMinutes(input.dayEnd);
  const pickedIds = new Set(input.picked.map((p) => p.id));
  const unplaced: RecommendResult["unplaced"] = [];

  const withPace = (item: VisitItem): VisitItem =>
    item.stayLocked || item.snapshot.category === "lodging"
      ? item
      : { ...item, stayMin: item.stayMin + rule.extraStayMin };

  // 후보 정리: 숙소는 따로, 부적격은 바로 미배치(사용자가 고른 것만)
  const lodgings: VisitItem[] = [];
  const pool: { item: VisitItem; priority: number; date?: string }[] = [];
  const seen = new Set<string>();
  const candidates = [...input.picked, ...input.suggestions];
  for (const d of input.dated ?? []) {
    const reason = ineligibleReason(d.item, [d.date]);
    if (reason) unplaced.push({ ...d.item, reason });
    else pool.push({ item: withPace(d.item), priority: 200, date: d.date });
    pickedIds.add(d.item.id);
  }
  candidates.forEach((raw, rank) => {
    const key = JSON.stringify(raw.ref);
    if (seen.has(key)) return;
    seen.add(key);
    const isPicked = pickedIds.has(raw.id);
    if (raw.snapshot.category === "lodging") {
      if (isPicked) lodgings.push(raw);
      return;
    }
    const reason = ineligibleReason(raw, input.dates);
    if (reason) {
      if (isPicked) unplaced.push({ ...raw, reason });
      return;
    }
    pool.push({ item: withPace(raw), priority: isPicked ? 120 : Math.max(0, 40 - rank * 2) });
  });

  const days: VisitItem[][] = input.dates.map((date) => {
    const fixedToday = input.fixed
      .filter((f) => f.date === date && f.item.fixedStart)
      .map((f) => f.item)
      .sort((a, b) => toMinutes(a.fixedStart ?? "00:00") - toMinutes(b.fixedStart ?? "00:00"));
    const chosen: VisitItem[] = [];
    let t = dayStart;
    let loc: LatLng | null = null;
    let stops = 0;
    let fi = 0;
    for (;;) {
      const next = fixedToday[fi];
      const deadline = next ? toMinutes(next.fixedStart ?? "00:00") : dayEnd;
      let best: { idx: number; end: number; score: number } | null = null;
      if (stops < rule.maxStops) {
        pool.forEach((cand, idx) => {
          const cLoc = cand.item.snapshot.location;
          if (!cLoc || (cand.date !== undefined && cand.date !== date)) return;
          const drive = loc ? estimateDriveMin(loc, cLoc) : 0;
          const arrive = t + drive + (loc ? config.accessBufferMin : 0);
          const fit = fitVisit(cand.item, date, arrive, config);
          if (!fit) return;
          const nextLoc = next?.snapshot.location;
          const toNext = next
            ? (nextLoc ? estimateDriveMin(cLoc, nextLoc) : 0) +
              Math.max(config.accessBufferMin, config.prepBufferMin)
            : 0;
          if (fit.end + toNext > deadline) return;
          const score =
            drive +
            (fit.start - arrive) * 0.5 +
            mealScore(cand.item, fit.start, chosen.at(-1)) -
            cand.priority;
          if (!best || score < best.score) best = { idx, end: fit.end, score };
        });
      }
      const found = best as { idx: number; end: number; score: number } | null;
      if (found) {
        const [taken] = pool.splice(found.idx, 1);
        if (taken) {
          chosen.push(taken.item);
          t = found.end;
          loc = taken.item.snapshot.location;
          stops += 1;
        }
        continue;
      }
      if (next) {
        chosen.push(next);
        t = toMinutes(next.fixedEnd ?? next.fixedStart ?? "00:00");
        loc = next.snapshot.location ?? loc;
        fi += 1;
        continue;
      }
      break;
    }
    return chosen;
  });

  // 숙소: 마지막 날을 뺀 날의 끝(일차 사이 기준점). 당일 여행이면 미배치
  lodgings.forEach((item, k) => {
    const target = input.dates.length >= 2 ? Math.min(k, input.dates.length - 2) : -1;
    const day = days[target];
    if (day) day.push(item);
    else unplaced.push({ ...item, reason: "하루 여행이라 숙소는 일정에 넣지 않았어요." });
  });

  for (const left of pool) {
    if (pickedIds.has(left.item.id)) {
      const original = input.picked.find((p) => p.id === left.item.id) ?? left.item;
      unplaced.push({
        ...original,
        reason: "시간이 부족해 넣지 못했어요. 다른 일차에 직접 넣거나 다른 장소를 빼 주세요.",
      });
    }
  }
  return { days, unplaced };
}
