// 관리자 훅 — 관리자 여부 확인, 콘텐츠 목록·편집. 저장·공개 뒤 사용자 화면 캐시(contentKeys)도 갱신한다.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminKind } from "@/app/paths";
import { contentKeys } from "@/features/content";
import { useCurrentUid } from "@/features/trips";
import type { ContentStatus } from "@/shared/domain";
import {
  checkIsAdmin,
  createContent,
  discardDraft,
  getContentWithDraft,
  hideContent,
  listContent,
  publishContent,
  saveDraft,
  uploadContentPhoto,
  type ContentInput,
} from "../api/admin-api";

export const adminKeys = {
  all: ["admin"] as const,
  isAdmin: (uid: string) => [...adminKeys.all, "isAdmin", uid] as const,
  list: (kind: AdminKind) => [...adminKeys.all, "list", kind] as const,
  one: (kind: AdminKind, id: string) => [...adminKeys.all, "one", kind, id] as const,
};

export function useIsAdmin() {
  const uid = useCurrentUid();
  return useQuery({
    queryKey: adminKeys.isAdmin(uid ?? ""),
    queryFn: () => checkIsAdmin(uid ?? ""),
    enabled: uid !== null,
    staleTime: 5 * 60_000,
  });
}

export function useAdminList(kind: AdminKind) {
  return useQuery({ queryKey: adminKeys.list(kind), queryFn: () => listContent(kind) });
}

export function useAdminContent(kind: AdminKind, id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.one(kind, id ?? ""),
    queryFn: () => getContentWithDraft(kind, id ?? ""),
    enabled: Boolean(id),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: adminKeys.all });
    void qc.invalidateQueries({ queryKey: contentKeys.all });
  };
}

export function useAdminMutations(kind: AdminKind) {
  const invalidate = useInvalidate();
  const opts = { onSuccess: invalidate };
  return {
    create: useMutation({
      mutationFn: (input: ContentInput<AdminKind>) => createContent(kind, input),
      ...opts,
    }),
    saveDraft: useMutation({
      mutationFn: (v: { id: string; status: ContentStatus; input: ContentInput<AdminKind> }) =>
        saveDraft(kind, v.id, v.status, v.input),
      ...opts,
    }),
    publish: useMutation({
      mutationFn: (v: { id: string; input: ContentInput<AdminKind> }) =>
        publishContent(kind, v.id, v.input),
      ...opts,
    }),
    hide: useMutation({ mutationFn: (id: string) => hideContent(kind, id), ...opts }),
    discardDraft: useMutation({ mutationFn: (id: string) => discardDraft(kind, id), ...opts }),
    upload: useMutation({
      mutationFn: (v: { id: string; file: File }) => uploadContentPhoto(kind, v.id, v.file),
    }),
  };
}
