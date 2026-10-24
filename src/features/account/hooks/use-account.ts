// 계정·공유 훅. 로그아웃하면 이 기기의 개인 데이터 표시(작성 중 초안·편집본·쿼리 캐시)를 정리한다 (기능명세 §8).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnsDraftStore } from "@/features/library";
import {
  tripKeys,
  useCreateTrip,
  useCurrentUid,
  useDeleteTrip,
  useTripDraftStore,
  useTripWorkingStore,
} from "@/features/trips";
import { resetQueryCache } from "@/lib/query-client";
import { testEmailSignIn } from "@/lib/test-auth";
import type { SharedTrip, Trip } from "@/shared/domain";
import {
  createShare,
  deleteMyAccount,
  getShare,
  signInWithGoogle,
  signOutUser,
  stopShare,
  updateShare,
  type ShareContent,
} from "../api/account-api";
import { draftFromShare } from "../lib/share-content";

export const shareKeys = {
  all: ["shares"] as const,
  one: (id: string) => [...shareKeys.all, id] as const,
};

function clearDevicePersonalData() {
  useTripDraftStore.getState().clear();
  useTripWorkingStore.getState().clearAll();
  useSnsDraftStore.getState().clear();
  resetQueryCache();
}

export function useGoogleSignIn() {
  return useMutation({ mutationFn: signInWithGoogle });
}

/** 개발·에뮬레이터 전용 테스트 로그인 (프로덕션에서는 test-auth가 막는다) */
export function useTestSignIn() {
  return useMutation({ mutationFn: (email: string) => testEmailSignIn(email) });
}

export function useSignOut() {
  return useMutation({
    mutationFn: signOutUser,
    onSuccess: clearDevicePersonalData,
  });
}

export function useDeleteAccount() {
  const uid = useCurrentUid();
  return useMutation({
    mutationFn: () => {
      if (!uid) throw new Error("로그인한 뒤 다시 시도해 주세요.");
      return deleteMyAccount(uid);
    },
    onSuccess: clearDevicePersonalData,
  });
}

export function useShare(shareId: string | null | undefined) {
  return useQuery({
    queryKey: shareKeys.one(shareId ?? ""),
    queryFn: () => getShare(shareId ?? ""),
    enabled: Boolean(shareId),
    retry: false,
  });
}

function useAfterShareChange() {
  const qc = useQueryClient();
  return (tripId: string) => {
    void qc.invalidateQueries({ queryKey: tripKeys.all });
    void qc.invalidateQueries({ queryKey: shareKeys.all });
    void qc.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
  };
}

export function useCreateShare() {
  const after = useAfterShareChange();
  return useMutation({
    mutationFn: ({ trip, content }: { trip: Trip; content: ShareContent }) => createShare(trip, content),
    onSuccess: (s) => { after(s.tripId); },
  });
}

export function useUpdateShare() {
  const after = useAfterShareChange();
  return useMutation({
    mutationFn: ({ share, content }: { share: SharedTrip; content: ShareContent }) => updateShare(share, content),
    onSuccess: (_, v) => { after(v.share.tripId); },
  });
}

export function useStopShare() {
  const after = useAfterShareChange();
  return useMutation({
    mutationFn: ({ shareId, tripId }: { shareId: string; tripId: string }) => stopShare(shareId, tripId),
    onSuccess: (_, v) => { after(v.tripId); },
  });
}

/** 코스 삭제 — 공유 중이면 링크 접근부터 막고 지운다 (SHR-02) */
export function useDeleteTripAndShare() {
  const del = useDeleteTrip();
  return useMutation({
    mutationFn: async (trip: Trip) => {
      if (trip.shareId) await stopShare(trip.shareId, null);
      await del.mutateAsync(trip);
      useTripWorkingStore.getState().drop(trip.id);
    },
  });
}

/** 받은 공유 코스를 내 코스로 복사 */
export function useCopyShare() {
  const uid = useCurrentUid();
  const create = useCreateTrip();
  return useMutation({
    mutationFn: (share: SharedTrip) => {
      if (!uid) throw new Error("로그인하면 내 코스로 복사할 수 있어요.");
      return create.mutateAsync({ uid, draft: draftFromShare(share) });
    },
  });
}
