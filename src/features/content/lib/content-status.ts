// 콘텐츠 상태 판정 순수 함수 — 축제 진행 단계, 장소의 오늘 영업 표시, 목록 필터.
// 날짜·시각은 모두 KST 문자열 기준 (shared/lib/date).
import {
  type FactKey,
  type Festival,
  type Place,
  type PlaceCategory,
  type SigunCode,
  type TimeRange,
} from "@/shared/domain";
import { dayOfWeek, toMinutes } from "@/shared/lib/date";

export type FestivalPhase = "ongoing" | "upcoming" | "ended";

export function festivalPhase(
  f: Pick<Festival, "startDate" | "endDate">,
  today: string,
): FestivalPhase {
  if (today < f.startDate) return "upcoming";
  if (today > f.endDate) return "ended";
  return "ongoing";
}

export const FESTIVAL_PHASE_LABEL: Record<FestivalPhase, string> = {
  ongoing: "진행 중",
  upcoming: "예정",
  ended: "종료",
};

/** 그날 영업 구간 — 예외일 우선. null = 미확인, [] = 휴무 */
export function placeRangesOn(place: Pick<Place, "hours">, date: string): TimeRange[] | null {
  const ex = place.hours.exceptions.find((e) => e.date === date);
  if (ex) return ex.ranges;
  return place.hours.weekly[dayOfWeek(date)] ?? null;
}

export type OpenState =
  | { kind: "unknown" }
  | { kind: "closed-day" }
  | { kind: "open"; until: string; lastOrder?: string }
  | { kind: "break"; reopen: string }
  | { kind: "before"; opens: string }
  | { kind: "after" };

/** 지금(KST "HH:mm") 영업 상태 — 브레이크타임·영업 전·종료를 구분 */
export function openStateAt(place: Pick<Place, "hours">, date: string, now: string): OpenState {
  const ranges = placeRangesOn(place, date);
  if (ranges === null) return { kind: "unknown" };
  if (ranges.length === 0) return { kind: "closed-day" };
  const t = toMinutes(now);
  const sorted = [...ranges].sort((a, b) => toMinutes(a.open) - toMinutes(b.open));
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    if (!r) continue;
    const open = toMinutes(r.open);
    let close = toMinutes(r.close);
    if (close <= open) close += 1440;
    if (t < open)
      return i === 0 ? { kind: "before", opens: r.open } : { kind: "break", reopen: r.open };
    if (t < close) return { kind: "open", until: r.close, lastOrder: r.lastOrder };
  }
  return { kind: "after" };
}

export function openStateLabel(s: OpenState): string {
  switch (s.kind) {
    case "unknown":
      return "영업시간 확인 필요";
    case "closed-day":
      return "오늘 휴무";
    case "open":
      return s.lastOrder
        ? `영업 중 · ${s.until}까지 (주문 마감 ${s.lastOrder})`
        : `영업 중 · ${s.until}까지`;
    case "break":
      return `브레이크타임 · ${s.reopen}에 다시 열어요`;
    case "before":
      return `영업 전 · ${s.opens}에 열어요`;
    case "after":
      return "오늘 영업 종료";
  }
}

/** 카드처럼 좁은 자리용 — 주문 마감은 상세에서 보여준다 */
export function openStateShortLabel(s: OpenState): string {
  if (s.kind === "open") return `영업 중 · ${s.until}까지`;
  if (s.kind === "break") return `브레이크타임 · ${s.reopen} 재개`;
  if (s.kind === "unknown") return "영업시간 확인 필요";
  return openStateLabel(s);
}

export interface PlaceFilter {
  sigun: SigunCode | null;
  category: PlaceCategory | null;
  subcategory: string | null;
  /** 같은 묶음 안 복수 선택은 OR, 다른 축끼리는 AND (기능명세 §3 필터 정책) */
  moods: string[];
  purposes: string[];
  /** 확인된 이용 조건만 (미확인은 통과시키지 않는다) */
  facts: FactKey[];
  keyword: string;
}

export const EMPTY_PLACE_FILTER: PlaceFilter = {
  sigun: null,
  category: null,
  subcategory: null,
  moods: [],
  purposes: [],
  facts: [],
  keyword: "",
};

function norm(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

export function matchesPlace(p: Place, f: PlaceFilter): boolean {
  if (f.sigun && p.sigun !== f.sigun) return false;
  if (f.category && p.category !== f.category) return false;
  if (f.subcategory && p.subcategory !== f.subcategory) return false;
  if (f.moods.length > 0 && !f.moods.some((m) => p.moods.includes(m))) return false;
  if (f.purposes.length > 0 && !f.purposes.some((m) => p.purposes.includes(m))) return false;
  if (f.facts.some((k) => p.facts[k] !== true)) return false;
  if (f.keyword.trim()) {
    const k = norm(f.keyword);
    const hay = norm(
      [p.name, p.area ?? "", p.subcategory ?? "", p.address ?? "", ...p.moods].join(" "),
    );
    if (!hay.includes(k)) return false;
  }
  return true;
}

/** 태그를 고른 경우 많이 맞는 순(추천 정렬), 그다음 이름순 */
export function sortPlacesByTagMatch(places: Place[], f: PlaceFilter): Place[] {
  const tags = [...f.moods, ...f.purposes];
  if (tags.length === 0) return places;
  const score = (p: Place) =>
    tags.filter((t) => p.moods.includes(t) || p.purposes.includes(t)).length;
  return [...places].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, "ko"));
}

export function activeFilterCount(f: PlaceFilter): number {
  return (f.subcategory ? 1 : 0) + f.moods.length + f.purposes.length + f.facts.length;
}
