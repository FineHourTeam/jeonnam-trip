// 개인 코스 서버 상태 훅 — queryKey는 tripKeys로만 (rules.md § 상태관리).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthState } from "@/app/use-auth-state";
import type { Trip, TripDraft } from "@/shared/domain";
import { createTrip, deleteTrip, getTrip, listMyTrips, saveTrip } from "../api/trips-api";

export const tripKeys = {
  all: ["trips"] as const,
  mine: (uid: string) => [...tripKeys.all, "mine", uid] as const,
  detail: (tripId: string) => [...tripKeys.all, "detail", tripId] as const,
};

/** 로그인 사용자 uid (확인 중·비회원이면 null) */
export function useCurrentUid(): string | null {
  const state = useAuthState();
  return state.status === "authed" ? state.user.uid : null;
}

export function useTrip(tripId: string | undefined) {
  return useQuery({
    queryKey: tripKeys.detail(tripId ?? ""),
    queryFn: () => getTrip(tripId ?? ""),
    enabled: Boolean(tripId) && tripId !== "draft",
  });
}

export function useMyTrips() {
  const uid = useCurrentUid();
  return useQuery({
    queryKey: tripKeys.mine(uid ?? ""),
    queryFn: () => listMyTrips(uid ?? ""),
    enabled: uid !== null,
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, draft }: { uid: string; draft: TripDraft }) => createTrip(uid, draft),
    onSuccess: (trip) => {
      qc.setQueryData(tripKeys.detail(trip.id), trip);
      void qc.invalidateQueries({ queryKey: tripKeys.mine(trip.ownerUid) });
    },
  });
}

/** 저장 실패(VersionConflictError 포함)는 그대로 throw — 화면이 완료 표시를 하지 않고 안내한다 */
export function useSaveTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trip: Trip) => saveTrip(trip),
    onSuccess: (trip) => {
      qc.setQueryData(tripKeys.detail(trip.id), trip);
      void qc.invalidateQueries({ queryKey: tripKeys.mine(trip.ownerUid) });
    },
  });
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trip: Trip) => deleteTrip(trip.id),
    onSuccess: (_, trip) => {
      qc.removeQueries({ queryKey: tripKeys.detail(trip.id) });
      void qc.invalidateQueries({ queryKey: tripKeys.mine(trip.ownerUid) });
    },
  });
}
