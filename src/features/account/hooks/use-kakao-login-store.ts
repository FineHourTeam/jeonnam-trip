// 카카오 로그인 왕복 동안 기억할 값 — 카카오 화면으로 떠나기 전에 담고, 콜백(/auth/kakao/callback)에서 꺼낸다.
// state: 돌아온 요청이 이 탭에서 시작한 로그인인지 확인하는 값(CSRF 방지). returnTo: 로그인 뒤 돌아갈 앱 경로.
// sessionStorage: 같은 탭의 페이지 이동에는 남고, 탭을 닫으면 사라진다.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface PendingKakaoLogin {
  state: string;
  returnTo: string;
}

interface KakaoLoginState {
  pending: PendingKakaoLogin | null;
  begin: (pending: PendingKakaoLogin) => void;
  clear: () => void;
}

export const useKakaoLoginStore = create<KakaoLoginState>()(
  persist(
    (set) => ({
      pending: null,
      begin: (pending) => {
        set({ pending });
      },
      clear: () => {
        set({ pending: null });
      },
    }),
    {
      name: "jeonnam-trip:kakao-login",
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
    },
  ),
);
