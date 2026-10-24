// "일정에 담기" — 축제·장소·보관함·크리에이터 화면이 같은 규칙으로 코스에 방문 후보를 넣는다.
// 대상: 로그인 전 작성 중인 코스(draft) · 저장된 코스. 저장된 코스에 저장 전 편집본이 있으면 편집본에 넣고,
// 없으면 최신 서버본에 넣어 바로 저장한다 (버전 비교 저장 — 다른 기기 변경을 덮어쓰지 않는다).
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Trip, TripDraft, VisitItem } from "@/shared/domain";
import { getTrip, saveTrip } from "../api/trips-api";
import { addItemsToDay } from "../lib/trip-builders";
import { useTripDraftStore } from "./use-trip-draft-store";
import { useTripWorkingStore } from "./use-trip-working-store";
import { tripKeys, useMyTrips } from "./use-trips";

export type TripTarget = { kind: "draft" } | { kind: "saved"; tripId: string };

export interface TripTargetOption {
  target: TripTarget;
  title: string;
  startDate: string;
  endDate: string;
  days: TripDraft["days"];
  /** 저장하지 않은 변경이 있는지 */
  unsaved: boolean;
}

/** 담을 수 있는 여행 목록 — 작성 중인 코스가 맨 위 */
export function useTripTargets() {
  const draft = useTripDraftStore((s) => s.draft);
  const copies = useTripWorkingStore((s) => s.copies);
  const mine = useMyTrips();
  const options: TripTargetOption[] = [];
  if (draft) {
    options.push({
      target: { kind: "draft" },
      title: draft.title,
      startDate: draft.startDate,
      endDate: draft.endDate,
      days: draft.days,
      unsaved: true,
    });
  }
  for (const t of mine.data ?? []) {
    const copy = copies[t.id];
    const trip = copy?.trip ?? t;
    options.push({
      target: { kind: "saved", tripId: t.id },
      title: trip.title,
      startDate: trip.startDate,
      endDate: trip.endDate,
      days: trip.days,
      unsaved: Boolean(copy),
    });
  }
  return { options, isLoading: mine.isLoading, error: mine.error, refetch: mine.refetch };
}

export interface AddResult {
  added: VisitItem[];
  duplicates: VisitItem[];
  /** 담은 뒤 이동할 편집 화면 id ("draft" 또는 tripId) */
  editId: string;
}

export function useAddItemsToTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      target,
      dayIndex,
      items,
    }: {
      target: TripTarget;
      dayIndex: number;
      items: VisitItem[];
    }): Promise<AddResult> => {
      if (target.kind === "draft") {
        const { draft, setDraft } = useTripDraftStore.getState();
        if (!draft) throw new Error("작성 중인 여행이 없어요. 새 여행을 먼저 만들어 주세요.");
        const r = addItemsToDay(draft, dayIndex, items);
        setDraft(r.trip);
        return { added: r.added, duplicates: r.duplicates, editId: "draft" };
      }
      const working = useTripWorkingStore.getState();
      const copy = working.copies[target.tripId];
      if (copy) {
        const r = addItemsToDay(copy.trip, dayIndex, items);
        working.put(copy.baseVersion, r.trip);
        return { added: r.added, duplicates: r.duplicates, editId: target.tripId };
      }
      const latest = await getTrip(target.tripId);
      const r = addItemsToDay(latest, dayIndex, items);
      if (r.added.length > 0) {
        const saved: Trip = await saveTrip(r.trip);
        qc.setQueryData(tripKeys.detail(saved.id), saved);
        void qc.invalidateQueries({ queryKey: tripKeys.mine(saved.ownerUid) });
      }
      return { added: r.added, duplicates: r.duplicates, editId: target.tripId };
    },
  });
}
