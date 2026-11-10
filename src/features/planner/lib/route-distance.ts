// 경로 주변 찾기 — 후보 지점이 그날 경로(조회된 경로 선, 없으면 방문지 좌표)에서 얼마나 떨어져 있는지.
// ponytail: 위도 기준 평면 근사(수십 km 안에서 오차 1% 미만) + 모든 선분 전수 비교 — 후보·경로 점이 수만 개를 넘으면 bbox로 먼저 거를 것
import type { LatLng } from "@/shared/domain";

const KM_PER_DEG_LAT = 110.574;
const KM_PER_DEG_LNG_AT_EQUATOR = 111.32;

/** 경로 기준선 — 조회된 구간 경로들 + 방문지 좌표(경로가 없는 지점도 기준이 되게 점 하나짜리 선으로) */
export function routeLines(visits: LatLng[], paths: LatLng[][]): LatLng[][] {
  return [...paths.filter((p) => p.length > 0), ...visits.map((v) => [v])];
}

/** 점 p에서 선(점 여러 개를 이은 것)까지의 최단 거리(km). 선이 없으면 Infinity */
export function distanceToRouteKm(p: LatLng, lines: LatLng[][]): number {
  const kx = KM_PER_DEG_LNG_AT_EQUATOR * Math.cos((p.lat * Math.PI) / 180);
  const xy = (q: LatLng) => [(q.lng - p.lng) * kx, (q.lat - p.lat) * KM_PER_DEG_LAT] as const;
  let best = Infinity;
  for (const line of lines) {
    const first = line[0];
    if (!first) continue;
    let [ax, ay] = xy(first);
    best = Math.min(best, Math.hypot(ax, ay));
    for (let i = 1; i < line.length; i++) {
      const q = line[i];
      if (!q) continue;
      const [bx, by] = xy(q);
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      // 원점(p)을 선분 AB에 투영한 위치(0~1로 자름)
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
      ax = bx;
      ay = by;
    }
  }
  return best;
}

/** 경로에서 maxKm 안의 후보만, 가까운 순으로 */
export function nearRoute<T extends { location: LatLng | null }>(
  items: T[],
  lines: LatLng[][],
  maxKm: number,
): { item: T; km: number }[] {
  return items
    .flatMap((item) => {
      if (!item.location) return [];
      const km = distanceToRouteKm(item.location, lines);
      return km <= maxKm ? [{ item, km }] : [];
    })
    .sort((a, b) => a.km - b.km);
}
