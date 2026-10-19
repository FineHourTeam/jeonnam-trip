// 코스 편집 상태 — 로그인 전 초안(/trips/draft)은 기기 저장소에 바로 반영하고,
// 저장된 코스는 작업 사본을 들고 있다가 "저장"할 때만 서버에 쓴다 (실제 서버 성공 전 완료 표시 금지).
import { useState } from "react";
import { useBlocker, useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import {
  VersionConflictError,
  useCreateTrip,
  useSaveTrip,
  useTrip,
  useTripDraftStore,
} from "@/features/trips";
import type { Trip, TripDraft } from "@/shared/domain";

/** 편집 함수 — Trip이든 TripDraft든 같은 모양을 돌려준다 */
export type TripEdit = <T extends TripDraft>(trip: T) => T;

export function useTripEditor(tripId: string) {
  const isDraft = tripId === "draft";
  const navigate = useNavigate();
  const auth = useAuthState();
  const draft = useTripDraftStore((s) => s.draft);
  const setDraft = useTripDraftStore((s) => s.setDraft);
  const clearDraft = useTripDraftStore((s) => s.clear);
  const query = useTrip(isDraft ? undefined : tripId);
  const [working, setWorking] = useState<Trip | null>(null);
  const [conflict, setConflict] = useState(false);
  const create = useCreateTrip();
  const save = useSaveTrip();

  const saved = working ?? query.data ?? null;
  const trip: TripDraft | null = isDraft ? draft : saved;
  const dirty = !isDraft && working !== null;

  // 저장 안 한 변경이 있으면 다른 화면으로 나가기 전에 묻는다 (초안은 기기에 남으므로 묻지 않는다)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  const update = (edit: TripEdit) => {
    if (isDraft) {
      if (draft) setDraft(edit(draft));
    } else if (saved) {
      setWorking(edit(saved));
    }
  };

  const onSave = async () => {
    try {
      if (isDraft) {
        if (!draft) return;
        if (auth.status !== "authed") {
          // 초안은 기기에 남아 있다 — 로그인 후 이 화면으로 돌아와 이어서 저장한다
          void navigate(paths.login, { state: { from: paths.tripDraft } });
          return;
        }
        const created = await create.mutateAsync({ uid: auth.user.uid, draft });
        clearDraft();
        toast.success("코스를 저장했어요.");
        void navigate(paths.tripEdit(created.id), { replace: true });
        return;
      }
      if (!working) return;
      await save.mutateAsync(working);
      setWorking(null);
      toast.success("코스를 저장했어요.");
    } catch (err) {
      if (err instanceof VersionConflictError) setConflict(true);
      else toast.error("코스를 저장하지 못했어요. 네트워크를 확인하고 다시 시도해주세요.");
    }
  };

  /** 버전 충돌 시 내 변경을 버리고 서버의 최신 코스를 불러온다 */
  const reloadLatest = async () => {
    setConflict(false);
    setWorking(null);
    await query.refetch();
  };

  return {
    isDraft,
    trip,
    dirty,
    isLoading: !isDraft && query.isPending,
    loadError: isDraft ? null : query.error,
    retryLoad: () => void query.refetch(),
    authPending: auth.status === "loading",
    isSaving: create.isPending || save.isPending,
    update,
    save: onSave,
    conflict,
    dismissConflict: () => {
      setConflict(false);
    },
    reloadLatest,
    blocker,
  };
}
