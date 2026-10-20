// 관리자 서버 상태 훅 — queryKey는 adminKeys로만 (rules.md § 상태관리).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { AdminKind } from "@/app/paths";
import {
  checkIsAdmin,
  countContent,
  discardDraft,
  getEditable,
  hide,
  listContent,
  newContentId,
  publish,
  saveDraft,
  uploadPhoto,
  type AnyContent,
} from "../api/admin-api";

export const adminKeys = {
  all: ["admin"] as const,
  isAdmin: (uid: string) => [...adminKeys.all, "isAdmin", uid] as const,
  list: (kind: AdminKind) => [...adminKeys.all, "list", kind] as const,
  counts: (kind: AdminKind) => [...adminKeys.all, "counts", kind] as const,
  edit: (kind: AdminKind, id: string) => [...adminKeys.all, "edit", kind, id] as const,
};

export function useIsAdmin(uid: string | null) {
  return useQuery({
    queryKey: adminKeys.isAdmin(uid ?? ""),
    queryFn: () => checkIsAdmin(uid ?? ""),
    enabled: uid !== null,
    staleTime: 5 * 60_000,
  });
}

export function useContentList<K extends AdminKind>(kind: K) {
  return useQuery({ queryKey: adminKeys.list(kind), queryFn: () => listContent(kind) });
}

export function useContentCounts(kind: AdminKind) {
  return useQuery({ queryKey: adminKeys.counts(kind), queryFn: () => countContent(kind) });
}

export function useEditable<K extends AdminKind>(kind: K, id: string | null) {
  return useQuery({
    queryKey: adminKeys.edit(kind, id ?? ""),
    queryFn: () => getEditable(kind, id ?? ""),
    enabled: id !== null,
    // 편집 중 다른 탭으로 다녀왔다고 폼 기준값이 바뀌지 않게
    refetchOnWindowFocus: false,
  });
}

export type ContentAction = "draft" | "publish" | "hide" | "discard";

/** 초안 저장·공개·비공개·초안 버리기 — 성공 후 목록·사용자 화면 캐시를 새로 받게 한다 */
export function useContentAction(kind: AdminKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, content }: { action: ContentAction; content: AnyContent }) => {
      if (action === "draft") return saveDraft(kind, content);
      if (action === "publish") await publish(kind, content);
      if (action === "hide") await hide(kind, content.id);
      if (action === "discard") await discardDraft(kind, content.id);
      return null;
    },
    onSuccess: (_, { content }) => {
      void qc.invalidateQueries({ queryKey: adminKeys.list(kind) });
      void qc.invalidateQueries({ queryKey: adminKeys.counts(kind) });
      void qc.invalidateQueries({ queryKey: adminKeys.edit(kind, content.id) });
      // 사용자 화면의 공개 콘텐츠 캐시 (축제·장소·코스 feature의 queryKey 첫 칸)
      void qc.invalidateQueries({ queryKey: [kind === "creators" ? "creators" : kind] });
    },
  });
}

export function useUploadPhoto(kind: AdminKind, id: string) {
  return useMutation({ mutationFn: (file: File) => uploadPhoto(kind, id, file) });
}

/** 새 콘텐츠 id — 첫 저장 전에도 사진 경로를 정할 수 있게 화면 진입 때 한 번 만든다 */
export function useNewContentId(kind: AdminKind): string {
  const [id] = useState(() => newContentId(kind));
  return id;
}
