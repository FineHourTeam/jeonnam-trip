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
  return (trip: Trip, shareId: string | null) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: tripKeys.detail(trip.id) }),
      qc.invalidateQueries({ queryKey: tripKeys.mine(trip.ownerUid) }),
      ...(shareId
        ? [
            qc.invalidateQueries({ queryKey: shareKeys.own(shareId) }),
            qc.invalidateQueries({ queryKey: shareKeys.public(shareId) }),
          ]
        : []),
    ]);
}

export function usePublishShare() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ trip, current }: { trip: Trip; current: SharedTrip | null }) => {
      if (current?.active) return republishShare(trip, current);
      const share = await createShare(trip);
      try {
        // 화면이 아는 연결 상태(trip.shareId)가 서버와 같을 때만 연결한다
        await setTripShareId(trip.id, trip.shareId, share.id);
      } catch (e) {
        // 코스에 연결하지 못한 공유본은 해제 버튼으로도 못 막으니 바로 거둔다
        await deactivateShare(share.id).catch(() => undefined);
        throw e;
      }
      return share;
    },
    onSuccess: async (share, { trip }) => {
      // 새 연결을 캐시에 먼저 반영하고, 다시 받아 올 때까지 기다린다 — 그 사이 "링크 만들기"를 또 누르지 않게
      qc.setQueryData<Trip>(tripKeys.detail(trip.id), (t) =>
        t ? { ...t, shareId: share.id, version: t.version + 1 } : t,
      );
      await invalidate(trip, share.id);
    },
    // 실패(이미 해제된 공유본·다른 기기의 변경)해도 화면이 서버 상태를 다시 읽게
    onError: async (_, { trip, current }) => {
      await invalidate(trip, current?.id ?? trip.shareId);
    },
  });
}

export function useUnshare() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ trip, shareId }: { trip: Trip; shareId: string }) => {
      await deactivateShare(shareId);
      // 서버가 여전히 이 공유본을 가리킬 때만 연결을 끊는다 (다른 기기가 새로 연결한 링크는 그대로)
      await setTripShareId(trip.id, shareId, null);
    },
    onSettled: async (_, __, { trip, shareId }) => {
      await invalidate(trip, shareId);
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
