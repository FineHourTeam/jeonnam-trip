// 네이버 지도 SDK 로드 상태 — 서버 상태처럼 TanStack Query로 한 번만 불러온다.
// 로드에 성공한 뒤 인증 실패가 오면 쿼리를 초기화해 오류 상태로 바꾼다 (지도 대신 안내를 보여 준다).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { loadNaverMaps, onNaverMapsAuthFailure } from "../lib/naver-maps";

const SDK_KEY = ["naver-maps-sdk"] as const;

export function useNaverMaps() {
  const qc = useQueryClient();
  // 외부 SDK의 인증 실패 콜백 구독 (외부 시스템 동기화라 Effect)
  useEffect(
    () =>
      onNaverMapsAuthFailure(() => {
        void qc.resetQueries({ queryKey: SDK_KEY });
      }),
    [qc],
  );
  return useQuery({
    queryKey: SDK_KEY,
    queryFn: loadNaverMaps,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}
