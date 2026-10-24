// 사용자 표시용 숫자·시간 서식 — 한국식 표기 (rules.md § 한국어 카피 — 변수·숫자·서식).

/** 분 → "1시간 5분" / "45분" / "0분" */
export function formatDuration(min: number): string {
  const total = Math.max(0, Math.round(min));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${String(m)}분`;
  return m === 0 ? `${String(h)}시간` : `${String(h)}시간 ${String(m)}분`;
}

/** 미터 → "12.4km" / "800m" */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${String(Math.round(meters / 10) * 10)}m`;
  const km = meters / 1000;
  return `${km >= 100 ? String(Math.round(km)) : km.toFixed(1)}km`;
}

/** 자정 기준 분 → "09:30" · 자정을 넘기면 "다음 날 01:10" */
export function formatClock(min: number): string {
  const day = Math.floor(min / 1440);
  const rest = min - day * 1440;
  const hh = String(Math.floor(rest / 60)).padStart(2, "0");
  const mm = String(rest % 60).padStart(2, "0");
  return day > 0 ? `다음 날 ${hh}:${mm}` : `${hh}:${mm}`;
}

/** ISO 일시 → "2026. 10. 16." (마지막 마침표까지) */
export function formatDateDot(iso: string): string {
  const [y = "", m = "", d = ""] = iso.slice(0, 10).split("-");
  return `${y}. ${String(Number(m))}. ${String(Number(d))}.`;
}

/** 두 좌표 사이 직선거리(m) — 화면에는 반드시 "직선"으로 표기한다 (실제 도로거리 아님) */
export function straightDistanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** 일수 → "당일" / "1박 2일" … */
export function tripLengthLabel(days: number): string {
  if (days <= 1) return "당일";
  return `${String(days - 1)}박 ${String(days)}일`;
}
