// 자동차 경로 조회 계약 — 지도 feature(features/map)가 구현하고, 코스 편집(features/planner)이 사용한다.
// 서버: Cloud Function `api` → POST /api/directions (Hosting rewrite, 같은 오리진).
// 네이버 Directions 5 driving을 프록시한다. Client Secret은 함수의 Secret(NAVER_MAP_CLIENT_SECRET)에만 있다.
import type { LatLng } from "./content";

export interface LegRequest {
  from: LatLng;
  to: LatLng;
  /** 출발 일시 ISO — 미래 날짜는 현재 교통 기반 예상치임을 화면에 구분 표시 */
  departAt?: string;
}

export type LegResult =
  | {
      status: "ok";
      /** 경로 예상 소요(분, 올림) — 주차·접근 여유는 포함하지 않는다 */
      durationMin: number;
      distanceM: number;
      /** 지도 표시용 경로 좌표 */
      path: LatLng[];
      /** 조회 시각 ISO */
      fetchedAt: string;
    }
  | {
      status: "failed";
      /** 사용자 표시용 사유 (해요체) */
      reason: string;
    };

/** POST /api/directions 요청·응답 본문 */
export interface DirectionsRequestBody {
  legs: LegRequest[];
}

export interface DirectionsResponseBody {
  legs: LegResult[];
}
