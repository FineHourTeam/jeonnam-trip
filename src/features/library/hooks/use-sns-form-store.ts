// S07 로그인 왕복 동안 쓰던 SNS 링크 폼 — 저장하려다 로그인하러 갈 때 담고, 돌아오면 그대로 채운다 (기능명세 §4-6).
// sessionStorage: 새로고침·로그인 화면 왕복에는 남고, 탭을 닫으면 사라진다 (개인 링크·메모를 기기에 오래 두지 않는다).
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SnsFormValues } from "../lib/sns-form";

interface SnsFormState {
  pending: SnsFormValues | null;
  setPending: (values: SnsFormValues) => void;
  clear: () => void;
}

export const useSnsFormStore = create<SnsFormState>()(
  persist(
    (set) => ({
      pending: null,
      setPending: (pending) => {
        set({ pending });
      },
      clear: () => {
        set({ pending: null });
      },
    }),
    {
      name: "jeonnam-trip:sns-form",
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
    },
  ),
);
