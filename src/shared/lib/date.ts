// 날짜·시각 유틸 — 기간 판정은 한국 표준시(KST) 달력 날짜 기준 (기능명세 §2).
// 날짜는 "YYYY-MM-DD", 시각은 "HH:mm" 문자열로 다룬다. Date 객체의 로컬 타임존에 의존하지 않는다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 지금의 KST 날짜 "YYYY-MM-DD" */
export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function toUtcMs(date: string): number {
  const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: string, days: number): string {
  return new Date(toUtcMs(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** 두 날짜 사이 일수 (b - a) */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86_400_000);
}

/** 요일 0=일 … 6=토 */
export function dayOfWeek(date: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return new Date(toUtcMs(date)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/** start~end(포함) 날짜 목록 */
export function dateRange(start: string, end: string): string[] {
  const n = diffDays(start, end);
  return n < 0 ? [] : Array.from({ length: n + 1 }, (_, i) => addDays(start, i));
}

/** 두 기간이 하루라도 겹치는지 (양 끝 포함) */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** "HH:mm" → 자정 기준 분 */
export function toMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 분 → "HH:mm" (24시 이상은 다음날로 넘기지 않고 그대로 표기: 25:10) */
export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** "10월 16일 (금)" */
export function formatDateKo(date: string): string {
  const [, m = 0, d = 0] = date.split("-").map(Number);
  return `${String(m)}월 ${String(d)}일 (${WEEKDAY[dayOfWeek(date)]})`;
}

/** 지금의 KST 시각 "HH:mm" */
export function nowKstTime(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(11, 16);
}

/** 그 달의 첫날·마지막 날 */
export function monthRange(date: string): { from: string; to: string } {
  const [y = 0, m = 1] = date.split("-").map(Number);
  const from = `${String(y)}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from, to: `${String(y)}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}` };
}

/** "10.23 (금)" — 탭·칩처럼 좁은 자리 */
export function formatDateShort(date: string): string {
  const [, m = 0, d = 0] = date.split("-").map(Number);
  return `${String(m)}.${String(d)} (${WEEKDAY[dayOfWeek(date)]})`;
}

/** "10월 23일 ~ 25일" / "10월 30일 ~ 11월 8일" */
export function formatPeriodKo(start: string, end: string): string {
  const [, sm = 0, sd = 0] = start.split("-").map(Number);
  const [, em = 0, ed = 0] = end.split("-").map(Number);
  if (start === end) return `${String(sm)}월 ${String(sd)}일`;
  return sm === em
    ? `${String(sm)}월 ${String(sd)}일 ~ ${String(ed)}일`
    : `${String(sm)}월 ${String(sd)}일 ~ ${String(em)}월 ${String(ed)}일`;
}
