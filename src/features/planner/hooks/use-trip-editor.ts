// 코스 편집 상태 — 로그인 전 작성본(draft)과 저장된 코스의 편집본(working copy)을 같은 모양으로 다룬다.
// 저장 전 변경은 이 기기에 보존하고(화면 이동·새로고침·로그인 후에도 이어 쓰기), 서버 성공 응답 뒤에만 저장 완료를 알린다.
import { useState } from "react";
import {
  VersionConflictError,
  useCreateTrip,
  useCurrentUid,
  useSaveTrip,
  useTrip,
  useTripDraftStore,
  useTripWorkingStore,
} from "@/features/trips";
import type { Trip } from "@/shared/domain";
import type { EditableTrip } from "../lib/edit-ops";

export type EditorState =
  | { status: "loading" }
  | { status: "no-draft" }
  | { status: "error"; error: unknown; retry: () => void }
  | {
      status: "ready";
      isDraft: boolean;
      trip: EditableTrip;
      /** 저장된 코스의 서버본 (draft면 null) */
      server: Trip | null;
      dirty: boolean;
      /** 편집을 시작한 뒤 다른 기기에서 서버본이 바뀜 */
      staleBase: boolean;
    };

export function useTripEditor(tripId: string) {
  const isDraft = tripId === "draft";
  const uid = useCurrentUid();
  const draft = useTripDraftStore((s) => s.draft);
  const setDraft = useTripDraftStore((s) => s.setDraft);
  const clearDraft = useTripDraftStore((s) => s.clear);
  const copy = useTripWorkingStore((s) => (isDraft ? undefined : s.copies[tripId]));
  const putCopy = useTripWorkingStore((s) => s.put);
  const dropCopy = useTripWorkingStore((s) => s.drop);
  const serverQuery = useTrip(isDraft ? undefined : tripId);
  const create = useCreateTrip();
  const saveMutation = useSaveTrip();
  const [conflict, setConflict] = useState(false);

  let state: EditorState;
  if (isDraft) {
    state = draft ? { status: "ready", isDraft: true, trip: draft, server: null, dirty: true, staleBase: false } : { status: "no-draft" };
  } else if (copy) {
    state = {
      status: "ready",
      isDraft: false,
      trip: copy.trip,
      server: serverQuery.data ?? null,
      dirty: true,
      staleBase: Boolean(serverQuery.data && serverQuery.data.version !== copy.baseVersion),
    };
  } else if (serverQuery.data) {
    state = { status: "ready", isDraft: false, trip: serverQuery.data, server: serverQuery.data, dirty: false, staleBase: false };
  } else if (serverQuery.isError) {
    state = {
      status: "error",
      error: serverQuery.error,
      retry: () => {
        void serverQuery.refetch();
      },
    };
  } else {
    state = { status: "loading" };
  }

  /** 편집 적용 — 저장 전까지 이 기기에만 보존 */
  function update(fn: (t: EditableTrip) => EditableTrip) {
    if (state.status !== "ready") return;
    if (isDraft) {
      if (draft) setDraft(fn(draft));
      return;
    }
    const base = copy?.trip ?? serverQuery.data;
    if (!base) return;
    putCopy(copy?.baseVersion ?? base.version, { ...base, ...fn(base) });
  }

  /** draft: 새로 저장 → 새 id. saved: 버전 비교 저장. 성공 시 저장된 Trip */
  async function save(): Promise<Trip> {
    if (isDraft) {
      if (!draft) throw new Error("저장할 여행이 없어요.");
      if (!uid) throw new Error("로그인이 필요해요.");
      const trip = await create.mutateAsync({ uid, draft });
      clearDraft();
      return trip;
    }
    if (!copy) {
      if (serverQuery.data) return serverQuery.data;
      throw new Error("저장할 코스를 불러오지 못했어요.");
    }
    try {
      const saved = await saveMutation.mutateAsync({ ...copy.trip, version: copy.baseVersion });
      dropCopy(tripId);
      setConflict(false);
      return saved;
    } catch (e) {
      if (e instanceof VersionConflictError) setConflict(true);
      throw e;
    }
  }

  /** 버전 충돌 해결: 내 편집을 최신 서버 버전 위에 다시 얹어 저장 */
  async function overwriteWithMine(): Promise<Trip> {
    const latest = await serverQuery.refetch();
    if (!copy || !latest.data) throw new Error("최신 코스를 불러오지 못했어요.");
    putCopy(latest.data.version, copy.trip);
    const saved = await saveMutation.mutateAsync({ ...copy.trip, version: latest.data.version });
    dropCopy(tripId);
    setConflict(false);
    return saved;
  }

  /** 저장하지 않은 편집 버리기 (서버본으로 돌아감) */
  function discard() {
    if (isDraft) clearDraft();
    else dropCopy(tripId);
    setConflict(false);
    if (!isDraft) void serverQuery.refetch();
  }

  return {
    state,
    update,
    save,
    overwriteWithMine,
    discard,
    conflict,
    dismissConflict: () => {
      setConflict(false);
    },
    isSaving: create.isPending || saveMutation.isPending,
    needsLogin: isDraft && uid === null,
  };
}
