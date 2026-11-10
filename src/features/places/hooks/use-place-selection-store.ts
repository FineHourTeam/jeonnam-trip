// S04 선택한 장소 — 필터를 바꾸거나 상세에 다녀와도 유지한다 (기능명세 §3). 새로고침하면 비운다.
import { create } from "zustand";
import type { Place } from "@/shared/domain";

interface PlaceSelectionState {
  selected: Place[];
  toggle: (place: Place) => void;
  clear: () => void;
}

export const usePlaceSelectionStore = create<PlaceSelectionState>()((set) => ({
  selected: [],
  toggle: (place) => {
    set((s) => ({
      selected: s.selected.some((p) => p.id === place.id)
        ? s.selected.filter((p) => p.id !== place.id)
        : [...s.selected, place],
    }));
  },
  clear: () => {
    set({ selected: [] });
  },
}));
