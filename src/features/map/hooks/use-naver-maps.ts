// 네이버 지도 SDK 로드 상태 — 서버 상태처럼 TanStack Query로 한 번만 불러온다.
import { useQuery } from "@tanstack/react-query";
import { loadNaverMaps } from "../lib/naver-maps";

export function useNaverMaps() {
  return useQuery({
    queryKey: ["naver-maps-sdk"],
    queryFn: loadNaverMaps,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}
