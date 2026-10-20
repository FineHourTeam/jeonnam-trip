// S04 조회 조건 ↔ URL 검색 파라미터 — 뒤로 가기·공유에도 조건이 유지된다.
// 종류는 쉼표로 여러 개 (같은 묶음 OR), 지역·종류·검색어는 서로 AND (기능명세 §3).
import { PLACE_CATEGORY_LABEL, isSigunCode, type PlaceCategory } from "@/shared/domain";
import type { PlaceListQuery } from "../api/places-api";

/** 화면에 보이는 종류 순서 */
export const PLACE_CATEGORIES: PlaceCategory[] = [
  "attraction",
  "restaurant",
  "cafe",
  "shop",
  "lodging",
];

function isPlaceCategory(v: string): v is PlaceCategory {
  return v in PLACE_CATEGORY_LABEL;
}

export function readPlaceFilter(params: URLSearchParams): PlaceListQuery {
  const sigun = params.get("sigun") ?? "";
  const picked = new Set((params.get("category") ?? "").split(",").filter(isPlaceCategory));
  return {
    sigun: isSigunCode(sigun) ? sigun : null,
    // 순서를 고정해 같은 조건이 같은 캐시 키가 되게 한다
    categories: PLACE_CATEGORIES.filter((c) => picked.has(c)),
    q: (params.get("q") ?? "").trim().slice(0, 50),
  };
}

export function placeFilterParams(f: PlaceListQuery): Record<string, string | null> {
  return {
    sigun: f.sigun,
    category: f.categories.length > 0 ? f.categories.join(",") : null,
    q: f.q || null,
  };
}
