import { describe, expect, it } from "vitest";
import { distanceToRouteKm, nearRoute, routeLines } from "./route-distance";

// 목포 부근 — 위도 0.01° ≈ 1.106km
const A = { lat: 34.8, lng: 126.4 };
const B = { lat: 34.8, lng: 126.5 };

describe("distanceToRouteKm", () => {
  it("선분 중간 옆의 점은 선분까지의 수직 거리", () => {
    const d = distanceToRouteKm({ lat: 34.81, lng: 126.45 }, [[A, B]]);
    expect(d).toBeCloseTo(1.106, 2);
  });

  it("선분 끝 바깥의 점은 끝점까지의 거리", () => {
    const d = distanceToRouteKm({ lat: 34.8, lng: 126.39 }, [[A, B]]);
    expect(d).toBeCloseTo(0.914, 2);
  });

  it("점 하나짜리 선(방문지)도 기준이 되고, 선이 없으면 Infinity", () => {
    expect(distanceToRouteKm({ lat: 34.81, lng: 126.4 }, routeLines([A], []))).toBeCloseTo(
      1.106,
      2,
    );
    expect(distanceToRouteKm(A, [])).toBe(Infinity);
  });
});

describe("nearRoute", () => {
  it("반경 안의 후보만 가까운 순으로, 위치 없는 후보는 뺀다", () => {
    const items = [
      { id: "far", location: { lat: 34.9, lng: 126.45 } },
      { id: "mid", location: { lat: 34.82, lng: 126.45 } },
      { id: "near", location: { lat: 34.801, lng: 126.45 } },
      { id: "none", location: null },
    ];
    const result = nearRoute(items, routeLines([A, B], [[A, B]]), 3);
    expect(result.map((r) => r.item.id)).toEqual(["near", "mid"]);
    expect(result[1]?.km).toBeCloseTo(2.211, 2);
  });
});
