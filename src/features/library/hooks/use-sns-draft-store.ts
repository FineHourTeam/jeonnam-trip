// SNS 링크 작성 중 내용 — 비회원이 저장을 누르면 로그인 화면으로 가므로, 입력을 이 기기에 남겨 두고 돌아와 이어 쓴다 (기능명세 §4-6).
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CustomPlace, SigunCode } from "@/shared/domain";

export interface SnsDraft {
  url: string;
  title: string;
  sigun: SigunCode | null;
  tags: string[];
  memo: string;
  placeIds: string[];
  customs: Omit<CustomPlace, "id" | "createdAt">[];
}

interface State {
  draft: SnsDraft | null;
  set: (d: SnsDraft) => void;
  clear: () => void;
}

export const useSnsDraftStore = create<State>()(
  persist(
    (set) => ({
      draft: null,
      set: (draft) => {
        set({ draft });
      },
      clear: () => {
        set({ draft: null });
      },
    }),
    { name: "jeonnam-trip:sns-draft", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
