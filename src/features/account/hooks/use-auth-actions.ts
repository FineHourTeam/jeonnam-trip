// 로그인·로그아웃 — 화면은 이 훅만 쓴다 (Firebase Auth·카카오 SDK는 api/ 경유).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { paths } from "@/app/paths";
import { useTripDraftStore } from "@/features/trips";
import {
  completeKakaoLogin,
  signInWithGoogle,
  signOutUser,
  startKakaoLogin,
} from "../api/auth-api";
import { kakaoRedirectUriOf, type LoginProvider } from "../lib/login";
import { useKakaoLoginStore } from "./use-kakao-login-store";

/**
 * mutate("kakao" | "google") — 실패 시 LoginError(reason). 작성 중인 초안(localStorage)은 건드리지 않는다.
 * Google은 팝업으로 바로 로그인하고, 카카오는 카카오 화면으로 떠난다 (돌아오면 useKakaoCallback이 마무리하고 returnTo로 보낸다).
 */
export function useSignIn(returnTo: string) {
  return useMutation({
    mutationFn: async (provider: LoginProvider) => {
      if (provider === "google") return signInWithGoogle();
      const state = crypto.randomUUID();
      useKakaoLoginStore.getState().begin({ state, returnTo });
      await startKakaoLogin({ redirectUri: kakaoRedirectUriOf(window.location.origin), state });
    },
  });
}

/**
 * 카카오 콜백 화면 — 인가 코드로 로그인을 마무리한다. 코드는 한 번만 쓸 수 있어서 mutation 대신
 * 코드별 쿼리로 둔다 (StrictMode·재렌더에도 한 번만 호출). 성공하면 돌아갈 경로를 돌려준다.
 */
export function useKakaoCallback(code: string | null) {
  return useQuery({
    queryKey: ["auth", "kakao-callback", code],
    queryFn: async () => {
      await completeKakaoLogin({
        code: code ?? "",
        redirectUri: kakaoRedirectUriOf(window.location.origin),
      });
      const returnTo = useKakaoLoginStore.getState().pending?.returnTo ?? paths.home;
      useKakaoLoginStore.getState().clear();
      return returnTo;
    },
    enabled: code !== null,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** 로그아웃 후 이전 사용자의 캐시와 이 기기의 작성 중 초안을 함께 지운다 (unknown-unknowns #34) */
export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: signOutUser,
    onSuccess: () => {
      qc.clear();
      useTripDraftStore.getState().clear();
    },
  });
}
