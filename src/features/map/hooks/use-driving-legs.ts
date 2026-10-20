// 구간별 자동차 경로 조회 훅 — 코스 편집이 쓰는 계약 (시그니처를 바꾸면 planner도 함께 고친다).
// 구간마다 좌표로 캐시 키를 만들므로, 빠른 연속 편집에서 이전 응답이 최신 편집을 덮어쓰지 않는다 (기능명세 §7).
import { useQueries } from "@tanstack/react-query";
import type { LegRequest, LegResult } from "@/shared/domain";
import { fetchDrivingLeg } from "../api/directions-api";

export const directionsKeys = {
  all: ["directions"] as const,
  leg: (r: LegRequest) =>
    [...directionsKeys.all, "car", r.from.lat, r.from.lng, r.to.lat, r.to.lng] as const,
};

/** 구간 상태 — pending: 조회 중, skipped: 좌표 미확인 등으로 조회하지 않음 */
export type LegState = { status: "pending" } | { status: "skipped" } | LegResult;

const FAILED: LegResult = { status: "failed", reason: "경로를 불러오지 못했어요." };

/**
 * @param requests 구간 목록. null이면 그 구간은 조회하지 않고 skipped (예: 좌표 미확인 장소)
 * @returns legs[i]는 requests[i]의 상태. retryFailed()는 실패한 구간만 다시 조회
 */
export function useDrivingLegs(requests: (LegRequest | null)[]) {
  return useQueries({
    queries: requests.map((r) => ({
      queryKey: r ? directionsKeys.leg(r) : [...directionsKeys.all, "skipped"],
      queryFn: ({ signal }: { signal: AbortSignal }) => {
        if (!r) throw new Error("skipped");
        return fetchDrivingLeg(r, signal);
      },
      enabled: r !== null,
      staleTime: 10 * 60_000,
      retry: 1,
    })),
    combine: (results) => ({
      legs: results.map((q, i): LegState => {
        if (requests[i] === null) return { status: "skipped" };
        if (q.data) return q.data;
        if (q.isError) return FAILED;
        return { status: "pending" };
      }),
      isFetching: results.some((q) => q.isFetching),
      retryFailed: () => {
        // 서버는 구간 실패를 오류가 아니라 {status:"failed"} 데이터로 돌려준다 — 둘 다 다시 조회한다
        for (const q of results) if (q.isError || q.data?.status === "failed") void q.refetch();
      },
    }),
  });
}
