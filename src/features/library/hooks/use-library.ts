// 보관함 서버 상태 훅 — queryKey는 libraryKeys로만 (rules.md § 상태관리). 로그인 사용자만 조회한다.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUid } from "@/features/trips";
import i18n from "@/lib/i18n";
import type { SavedPlace } from "@/shared/domain";
import {
  deleteSnsLink,
  listCustomPlaces,
  listSavedPlaces,
  listSnsLinks,
  removeSavedPlace,
  restoreSavedPlace,
  savePlace,
  saveSnsLink,
  updateSavedPlace,
  type SnsLinkInput,
} from "../api/library-api";

export const libraryKeys = {
  all: ["library"] as const,
  user: (uid: string) => [...libraryKeys.all, uid] as const,
  saved: (uid: string) => [...libraryKeys.user(uid), "saved"] as const,
  customs: (uid: string) => [...libraryKeys.user(uid), "customs"] as const,
  links: (uid: string) => [...libraryKeys.user(uid), "links"] as const,
};

export function useSavedPlaces() {
  const uid = useCurrentUid();
  return useQuery({
    queryKey: libraryKeys.saved(uid ?? ""),
    queryFn: () => listSavedPlaces(uid ?? ""),
    enabled: uid !== null,
  });
}

export function useCustomPlaces() {
  const uid = useCurrentUid();
  return useQuery({
    queryKey: libraryKeys.customs(uid ?? ""),
    queryFn: () => listCustomPlaces(uid ?? ""),
    enabled: uid !== null,
  });
}

export function useSnsLinks() {
  const uid = useCurrentUid();
  return useQuery({
    queryKey: libraryKeys.links(uid ?? ""),
    queryFn: () => listSnsLinks(uid ?? ""),
    enabled: uid !== null,
  });
}

class LoginRequiredError extends Error {
  constructor() {
    super(i18n.t("errors.loginRequired", { ns: "library" }));
    this.name = "LoginRequiredError";
  }
}

/**
 * 로그인 사용자 uid로 실행하고, 끝나면 그 사용자의 보관함 쿼리를 모두 새로 받는다.
 * 새로 받기를 기다리지 않는다 — 목록이 바뀌며 화면이 내려가도(마지막 항목 삭제 등) 호출한 쪽의 완료 처리가 먼저 돈다.
 */
function useLibraryMutation<TArg, TResult>(fn: (uid: string, arg: TArg) => Promise<TResult>) {
  const uid = useCurrentUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arg: TArg) => {
      if (uid === null) throw new LoginRequiredError();
      return fn(uid, arg);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: libraryKeys.user(uid ?? "") });
    },
  });
}

export function useSavePlace() {
  return useLibraryMutation(savePlace);
}

export function useUpdateSavedPlace() {
  return useLibraryMutation(updateSavedPlace);
}

/** 저장 해제 + "되돌리기" 토스트 (지우기 전 태그·메모 그대로 복구). 이미 담은 일정은 건드리지 않는다 */
export function useUnsavePlace() {
  const remove = useLibraryMutation(removeSavedPlace);
  const restore = useLibraryMutation(restoreSavedPlace);
  // mutateAsync: 토스트의 "되돌리기"는 호출한 화면이 내려간 뒤에도 눌릴 수 있다 (실패 안내까지 이어지게)
  const unsave = (saved: SavedPlace) => {
    remove
      .mutateAsync(saved.id)
      .then(() =>
        toast(i18n.t("toast.unsaved", { ns: "library" }), {
          action: {
            label: i18n.t("toast.undo", { ns: "library" }),
            onClick: () => {
              restore
                .mutateAsync(saved)
                .catch(() => toast.error(i18n.t("toast.undoFailed", { ns: "library" })));
            },
          },
        }),
      )
      .catch(() => toast.error(i18n.t("toast.unsaveFailed", { ns: "library" })));
  };
  return { unsave, isPending: remove.isPending || restore.isPending };
}

export function useSaveSnsLink() {
  return useLibraryMutation(
    (uid, { input, linkId }: { input: SnsLinkInput; linkId: string | null }) =>
      saveSnsLink(uid, input, linkId),
  );
}

export function useDeleteSnsLink() {
  return useLibraryMutation(deleteSnsLink);
}
