// 축제 화면 표기 — 날짜는 "10월 16일 (금)", 확인일은 "2026. 10. 19." (rules.md § 한국어 카피 — 숫자·날짜)
import type { TimeRange } from "@/shared/domain";
import { formatDateKo } from "@/shared/lib/date";

export function formatPeriod(start: string, end: string): string {
  return start === end ? formatDateKo(start) : `${formatDateKo(start)} ~ ${formatDateKo(end)}`;
}

/** null = 미확인, [] = 휴무 */
export function formatRanges(ranges: TimeRange[] | null): string {
  if (ranges === null) return "운영시간 확인 필요";
  if (ranges.length === 0) return "휴무";
  return ranges.map((r) => `${r.open}~${r.close}`).join(", ");
}

export function formatDotDate(date: string): string {
  const [y = 0, m = 0, d = 0] = date.split("-").map(Number);
  return `${String(y)}. ${String(m)}. ${String(d)}.`;
}

/** http/https 주소만 링크로 쓴다 (javascript: URI 차단) */
export function safeHttpUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}
