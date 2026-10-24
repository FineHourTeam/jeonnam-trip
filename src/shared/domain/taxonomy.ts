// 고정 분류·태그 목록 — 초기에는 필터와 고정 태그로 시작한다 (서비스기획 §4).
// 운영 태그(분위기·목적)는 관리자가 장소에 붙이고, 개인 태그는 사용자가 보관함에서 붙인다 (서로 섞지 않는다).
import type { PlaceCategory } from "./content";

export const PLACE_CATEGORIES: PlaceCategory[] = ["attraction", "restaurant", "cafe", "shop", "lodging"];

/** 세부 종류 — 상위 종류에 연결. 현재 종류와 맞지 않는 세부 종류는 필터에서 초기화한다 */
export const SUBCATEGORIES: Record<PlaceCategory, string[]> = {
  cafe: ["디저트", "베이커리", "브런치", "전통찻집"],
  restaurant: ["한식", "한정식", "해산물", "떡갈비", "국밥", "분식"],
  shop: ["공예", "특산물", "소품"],
  attraction: ["자연", "정원", "역사", "전망", "체험"],
  lodging: ["한옥", "호텔", "펜션"],
};

/** 분위기 — 주관적 운영 태그 (이용 조건과 구분해 표시) */
export const MOOD_TAGS = ["오션뷰", "정원", "한옥", "대숲", "자연", "야경", "노을", "빈티지"] as const;

/** 목적 — 여러 개 선택 가능 */
export const PURPOSE_TAGS = ["사진", "데이트", "혼자 쉬기", "가족 식사", "아이와 함께", "산책"] as const;

/** 이용 조건 — 확인된 사실만 필터에 쓴다 (미확인은 "있음"으로 치지 않는다) */
export const FACT_LABEL = { parking: "주차", reservation: "예약", pets: "반려동물" } as const;
export type FactKey = keyof typeof FACT_LABEL;

/** 개인 태그 — 비공개. 보관함에서 다시 찾기 위한 용도 */
export const PERSONAL_TAGS = ["꼭 가볼 곳", "다음 여행", "비 오는 날", "친구 추천"] as const;
