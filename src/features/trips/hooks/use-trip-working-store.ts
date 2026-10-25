// 저장된 코스의 "저장 전 편집본" — 이 기기 localStorage에 보존해 화면 이동·새로고침·로그인 만료 뒤에도 이어 쓴다.
// baseVersion은 편집을 시작할 때의 서버 버전이다. 저장 시 서버 버전과 다르면 VersionConflictError로 안내한다.
// 저장에 성공하면 drop(), 로그아웃하면 clearAll() (기기 개인 데이터 정리).
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Trip } from "@/shared/domain";

export interface WorkingCopy {
  baseVersion: number;
  trip: Trip;
  editedAt: string;
}

interface TripWorkingState {
  copies: Record<string, WorkingCopy>;
  put: (baseVersion: number, trip: Trip) => void;
  drop: (tripId: string) => void;
  clearAll: () => void;
}

export const useTripWorkingStore = create<TripWorkingState>()(
  persist(
    (set) => ({
      copies: {},
      put: (baseVersion, trip) => {
        set((s) => ({
          copies: {
            ...s.copies,
            [trip.id]: { baseVersion, trip, editedAt: new Date().toISOString() },
          },
        }));
      },
      drop: (tripId) => {
        set((s) => {
          const { [tripId]: _removed, ...rest } = s.copies;
          return { copies: rest };
        });
      },
      clearAll: () => {
        set({ copies: {} });
      },
    }),
    { name: "jeonnam-trip:working", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
