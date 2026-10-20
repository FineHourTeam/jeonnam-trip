// 공유본 서버 상태 훅 — queryKey는 shareKeys로만 (rules.md § 상태관리).
// 공유본을 만들거나 해제하면 개인 코스의 shareId도 함께 바꾼다 (코스 쪽 저장 버전이 1 오른다).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { setTripShareId, tripKeys } from "@/features/trips";
import type { SharedTrip, Trip } from "@/shared/domain";
import {
  ShareNotFoundError,
  createShare,
  deactivateShare,
  deactivateSharesOfTrip,
  getActiveShare,
  getOwnShare,
  republishShare,
} from "../api/shares-api";

export const shareKeys = {
  all: ["shares"] as const,
  public: (id: string) => [...shareKeys.all, "public", id] as const,
  own: (id: string) => [...shareKeys.all, "own", id] as const,
};

export function useActiveShare(shareId: string | undefined) {
  return useQuery({
    queryKey: shareKeys.public(shareId ?? ""),
    queryFn: () => getActiveShare(shareId ?? ""),
    enabled: Boolean(shareId),
    retry: (count, error) => !(error instanceof ShareNotFoundError) && count < 2,
  });
}

export function useOwnShare(shareId: string | null) {
  return useQuery({
    queryKey: shareKeys.own(shareId ?? ""),
    queryFn: () => getOwnShare(shareId ?? ""),
    enabled: shareId !== null,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return (trip: Trip, shareId: string) => {
    void qc.invalidateQueries({ queryKey: tripKeys.detail(trip.id) });
    void qc.invalidateQueries({ queryKey: tripKeys.mine(trip.ownerUid) });
    void qc.invalidateQueries({ queryKey: shareKeys.own(shareId) });
    void qc.invalidateQueries({ queryKey: shareKeys.public(shareId) });
  };
}

export function usePublishShare() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ trip, current }: { trip: Trip; current: SharedTrip | null }) => {
      if (current?.active) return republishShare(trip, current);
      const share = await createShare(trip);
      try {
        await setTripShareId(trip.id, share.id);
      } catch (e) {
        // 코스에 연결하지 못한 공유본은 해제 버튼으로도 못 막으니 바로 거둔다
        await deactivateShare(share.id).catch(() => undefined);
        throw e;
      }
      return share;
    },
    onSuccess: (share, { trip }) => {
      invalidate(trip, share.id);
    },
    // 실패(이미 해제된 공유본 등)해도 화면이 서버 상태를 다시 읽게
    onError: (_, { trip, current }) => {
      if (current) invalidate(trip, current.id);
    },
  });
}

export function useUnshare() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ trip, shareId }: { trip: Trip; shareId: string }) => {
      await deactivateShare(shareId);
      await setTripShareId(trip.id, null);
    },
    onSettled: (_, __, { trip, shareId }) => {
      invalidate(trip, shareId);
    },
  });
}

/** 코스 삭제 전에 그 코스의 공유본을 모두 막는다 — 삭제된 코스의 링크가 열리지 않게 (기능명세 §8) */
export function useDeactivateTripShares() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trip: Trip) => deactivateSharesOfTrip(trip.ownerUid, trip.id),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: shareKeys.all });
    },
  });
}
