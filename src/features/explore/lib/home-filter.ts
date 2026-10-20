// S01 조회 조건 ↔ URL 검색 파라미터 (?sigun=&date=) — 새로고침·뒤로 가기에도 지역·날짜가 유지된다.
// 날짜는 오늘(KST) 이후만 받는다. 없거나 지난 날짜·없는 날짜면 오늘로 본다.
import { isSigunCode, type SigunCode } from "@/shared/domain";
import { addDays } from "@/shared/lib/date";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface HomeFilter {
  sigun: SigunCode | null;
  date: string;
}

export function readHomeFilter(params: URLSearchParams, today: string): HomeFilter {
  const sigun = params.get("sigun") ?? "";
  const date = params.get("date") ?? "";
  // addDays(d, 0) === d 로 "2026-02-30" 같은 없는 날짜를 거른다
  const isValid = DATE_RE.test(date) && addDays(date, 0) === date && date >= today;
  return { sigun: isSigunCode(sigun) ? sigun : null, date: isValid ? date : today };
}

/** 값이 있는 것만 쿼리로 붙인다 — 목록 화면에 지금 조건을 넘길 때 쓴다 */
export function withQuery(path: string, query: Record<string, string | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}
