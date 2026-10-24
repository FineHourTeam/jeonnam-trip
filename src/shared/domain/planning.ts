// 일정 계산·추천 기본값 단일 출처 — 기능명세 §6 "계약 전 확정" 대상이라 한 곳에서만 정한다.
// 화면·계산 코드는 이 값을 직접 쓰지 않고 planner의 ScheduleConfig로 받아 쓴다 (테스트에서 바꿔 끼울 수 있게).
import type { PlaceCategory } from "./content";

/** 주차·입구까지 이동 같은 접근 여유(분) — 경로 예상시간과 구분해 구간마다 더한다 */
export const ACCESS_BUFFER_MIN = 10;

/** 고정 프로그램 시작 전 준비 여유(분) — 접근 여유와 중복 합산하지 않고 둘 중 큰 값을 쓴다 */
export const PREP_BUFFER_MIN = 10;

/** 최소 허용 체류(분) — 자동으로 줄인 체류가 이보다 짧으면 방문 가능한 일정으로 확정하지 않는다 */
export const MIN_STAY_MIN: Record<PlaceCategory | "festival", number> = {
  festival: 60,
  restaurant: 40,
  cafe: 20,
  shop: 15,
  attraction: 30,
  lodging: 0,
};

/**
 * 여행 속도별 추천 규칙. 여유롭게 = 하루 장소 수 상한을 낮추고 체류를 늘린다, 알차게 = 후보를 더 검토한다.
 * 이동시간·최소 체류·고정 프로그램은 어떤 속도에서도 줄이지 않는다 (PLN-11).
 */
export const PACE_RULES = {
  relaxed: { maxStops: 3, extraStayMin: 20 },
  default: { maxStops: 4, extraStayMin: 0 },
  packed: { maxStops: 6, extraStayMin: 0 },
} as const;

export const PACE_LABEL = { relaxed: "여유롭게", packed: "알차게" } as const;
