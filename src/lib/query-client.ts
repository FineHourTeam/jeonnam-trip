// TanStack Query 전역 설정 단일 지점 — staleTime 등 캐시 정책 변경은 여기서만.
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 기본 0은 과다 리페치 — 30초 기본, 화면별 필요에 따라 훅에서 오버라이드 (rules.md § 상태관리)
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Firebase permission-denied·unauthenticated는 재시도해도 소용없다 — 즉시 실패
        const code = (error as { code?: string }).code ?? "";
        if (code.includes("permission-denied") || code.includes("unauthenticated")) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

// 로그아웃 시 반드시 호출 — 이전 사용자 데이터가 캐시에 남아 다음 로그인에서
// 번쩍이는 개인정보 사고 방지 (unknown-unknowns #34).
export function resetQueryCache() {
  queryClient.clear();
}
