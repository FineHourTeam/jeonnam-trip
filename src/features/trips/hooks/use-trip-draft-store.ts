// 로그인 전 작성 중인 코스 — 이 기기 localStorage에 보존해 로그인·새로고침·화면 이동 후에도 이어 쓴다 (ACC-02).
// 로그인 후 첫 저장에 성공하면 clear() 한다. 로그아웃 시에도 clear() (기기 개인 데이터 정리).
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { TripDraft } from "@/shared/domain";

interface TripDraftState {
  draft: TripDraft | null;
  setDraft: (draft: TripDraft) => void;
  clear: () => void;
}

export const useTripDraftStore = create<TripDraftState>()(
  persist(
    (set) => ({
      draft: null,
      setDraft: (draft) => {
        set({ draft });
      },
      clear: () => {
        set({ draft: null });
      },
    }),
    { name: "jeonnam-trip:draft", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
