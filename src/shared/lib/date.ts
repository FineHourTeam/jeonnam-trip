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

/** ISO 일시 → KST 달력 날짜 "YYYY-MM-DD" (UTC 문자열을 잘라 쓰면 오전 9시 전에는 하루 전으로 보인다) */
export function kstDateOf(iso: string): string {
  return todayKst(new Date(iso));
}

/** 문자열은 그대로, Firestore Timestamp(toDate 있는 객체)는 ISO 일시로. 그 밖은 undefined */
function isoOf(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "toDate" in v && typeof v.toDate === "function") {
    const d = (v as { toDate: () => unknown }).toDate();
    if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
}

/**
 * Firestore 문서의 일시 필드를 문자열로 맞춘다 — 손으로 넣은 문서가 Timestamp로 저장돼 있어도 화면이 깨지지 않게.
 * updatedAt은 ISO 일시(없거나 못 읽으면 ""), reviewedAt은 KST "YYYY-MM-DD"(못 읽으면 뺀다).
 */
export function withStringDates<T extends { updatedAt?: unknown; reviewedAt?: unknown }>(
  data: T,
): T {
  const out = { ...data, updatedAt: isoOf(data.updatedAt) ?? "" };
  if (data.reviewedAt !== undefined && typeof data.reviewedAt !== "string") {
    const iso = isoOf(data.reviewedAt);
    return { ...out, reviewedAt: iso && kstDateOf(iso) };
  }
  return out;
}

/** ISO 일시 → KST "YYYY-MM-DD HH:mm" */
export function kstDateTimeOf(iso: string): string {
  return new Date(new Date(iso).getTime() + KST_OFFSET_MS)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
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

/** 화면 언어별 날짜 표기 — ko "10월 16일 (금)" · en "Fri, Oct 16" · ja "10月16日(金)" */
export function formatDay(date: string, lng: string): string {
  if (lng === "ko") {
    const [, m = 0, d = 0] = date.split("-").map(Number);
    return `${String(m)}월 ${String(d)}일 (${WEEKDAY[dayOfWeek(date)]})`;
  }
  return new Intl.DateTimeFormat(lng, {
    timeZone: "UTC",
    month: lng === "ja" ? "long" : "short",
    day: "numeric",
    weekday: "short",
  }).format(toUtcMs(date));
}
