// 로그인·로그아웃 mutation — 화면은 이 훅만 쓴다 (Firebase Auth는 api/ 경유).
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTripDraftStore } from "@/features/trips";
import { signInWithGoogle, signOutUser } from "../api/auth-api";

/** 실패 시 LoginError(reason) — 작성 중인 초안(localStorage)은 건드리지 않는다 */
export function useSignIn() {
  return useMutation({ mutationFn: signInWithGoogle });
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
