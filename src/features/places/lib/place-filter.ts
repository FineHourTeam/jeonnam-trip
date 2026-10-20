// S04 조회 조건 ↔ URL 검색 파라미터 — 뒤로 가기·공유에도 조건이 유지된다.
// 종류·세부 종류는 쉼표로 여러 개 (같은 묶음 OR), 지역·종류·검색어는 서로 AND (기능명세 §3).
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

// ponytail: 2026-10-20 수집 데이터에 있는 세부 종류 고정 목록 — 관리자가 새 세부 종류를 쓰기 시작하면 여기에 추가하거나 관리자 설정 목록으로 옮길 것
export const PLACE_SUBCATEGORIES: Record<PlaceCategory, string[]> = {
  attraction: ["역사·문화·전시", "자연·생태", "마을·거리", "힐링관광", "체험관광", "산업·경제"],
  restaurant: ["특산물", "한식", "특화거리", "모범음식점"],
  cafe: ["카페"],
  shop: ["이색쇼핑"],
  lodging: ["펜션", "호텔·리조트", "글램핑·캠핑", "한옥스테이", "모텔", "청소년수련원"],
};

function isPlaceCategory(v: string): v is PlaceCategory {
  return v in PLACE_CATEGORY_LABEL;
}

/** 고른 종류에 속한 세부 종류 (화면 순서) */
export function subcategoriesOf(categories: PlaceCategory[]): string[] {
  return categories.flatMap((c) => PLACE_SUBCATEGORIES[c]);
}

/** 상위 종류와 맞지 않는 세부 종류는 버린다 — 종류를 안 고르면 세부 종류도 없다 */
export function normalizePlaceFilter(f: PlaceListQuery): PlaceListQuery {
  const picked = new Set(f.subcategories);
  return { ...f, subcategories: subcategoriesOf(f.categories).filter((s) => picked.has(s)) };
}

const list = (v: string | null) => (v ?? "").split(",").filter(Boolean);

export function readPlaceFilter(params: URLSearchParams): PlaceListQuery {
  const sigun = params.get("sigun") ?? "";
  const picked = new Set(list(params.get("category")).filter(isPlaceCategory));
  return normalizePlaceFilter({
    sigun: isSigunCode(sigun) ? sigun : null,
    // 순서를 고정해 같은 조건이 같은 캐시 키가 되게 한다
    categories: PLACE_CATEGORIES.filter((c) => picked.has(c)),
    subcategories: list(params.get("sub")),
    q: (params.get("q") ?? "").trim().slice(0, 50),
  });
}

export function placeFilterParams(f: PlaceListQuery): Record<string, string | null> {
  return {
    sigun: f.sigun,
    category: f.categories.length > 0 ? f.categories.join(",") : null,
    sub: f.subcategories.length > 0 ? f.subcategories.join(",") : null,
    q: f.q || null,
  };
}

/** 여행 만들기(S09)에 넘기는 장소 수 상한 — URL 길이와 한 번에 읽는 문서 수를 제한한다 */
export const MAX_PLACES_PARAM = 30;

/** ?places=id1,id2 (쉼표 구분 placeId) — 만들기와 읽기가 같은 규칙을 쓴다 */
export function readPlaceIds(value: string | null): string[] {
  return [...new Set(list(value))].slice(0, MAX_PLACES_PARAM);
}
