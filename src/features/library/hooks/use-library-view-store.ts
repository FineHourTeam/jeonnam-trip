// S06 화면 상태 — 탭·필터·고른 장소. 상세에 다녀오거나 필터를 바꿔도 유지한다 (기능명세 §3). 새로고침하면 비운다.
import { create } from "zustand";
import { EMPTY_LIBRARY_FILTER, type LibraryFilter } from "../lib/library";

export type LibraryTab = "places" | "links";

interface LibraryViewState {
  tab: LibraryTab;
  filter: LibraryFilter;
  /** 고른 보관 항목 id (SavedPlace.id) */
  selected: string[];
  setTab: (tab: LibraryTab) => void;
  setFilter: (filter: LibraryFilter) => void;
  toggle: (id: string) => void;
  clear: () => void;
}

export const useLibraryViewStore = create<LibraryViewState>()((set) => ({
  tab: "places",
  filter: EMPTY_LIBRARY_FILTER,
  selected: [],
  setTab: (tab) => {
    set({ tab });
  },
  setFilter: (filter) => {
    set({ filter });
  },
  toggle: (id) => {
    set((s) => ({
      selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
    }));
  },
  clear: () => {
    set({ selected: [] });
  },
}));
