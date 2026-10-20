// 관리자 서버 상태 훅 — queryKey는 adminKeys로만 (rules.md § 상태관리).
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

/** 사용자 화면 feature의 query key 첫 칸 — 관리자 저장 뒤 공개 화면 캐시를 새로 받게 */
const PUBLIC_KEY: Record<AdminKind, string> = {
  festivals: "festivals",
  places: "places",
  creators: "creatorCourses",
};

export const adminKeys = {
  all: ["admin"] as const,
  isAdmin: (uid: string) => [...adminKeys.all, "isAdmin", uid] as const,
  list: (kind: AdminKind) => [...adminKeys.all, "list", kind] as const,
  counts: (kind: AdminKind) => [...adminKeys.all, "counts", kind] as const,
  edit: (kind: AdminKind, id: string) => [...adminKeys.all, "edit", kind, id] as const,
  upload: (kind: AdminKind, id: string) => [...adminKeys.all, "upload", kind, id] as const,
};

export function useIsAdmin(uid: string | null) {
  return useQuery({
    queryKey: adminKeys.isAdmin(uid ?? ""),
    queryFn: () => checkIsAdmin(uid ?? ""),
    enabled: uid !== null,
    staleTime: 5 * 60_000,
  });
}

export function useContentList<K extends AdminKind>(kind: K, enabled = true) {
  return useQuery({ queryKey: adminKeys.list(kind), queryFn: () => listContent(kind), enabled });
}

export function useContentCounts(kind: AdminKind) {
  return useQuery({ queryKey: adminKeys.counts(kind), queryFn: () => countContent(kind) });
}

export function useEditable<K extends AdminKind>(kind: K, id: string | null) {
  return useQuery({
    queryKey: adminKeys.edit(kind, id ?? ""),
    queryFn: () => getEditable(kind, id ?? ""),
    enabled: id !== null,
    // 폼 기준값은 이 화면의 저장(무효화)으로만 바뀐다 — 배경 재조회가 폼을 다시 그려 입력을 지우지 않게.
    // 화면을 떠나면 캐시를 버려(gcTime 0) 다시 열 때는 항상 서버의 최신 내용을 받는다
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
    // 다시 받아 올 때까지 기다린다 — 그동안 폼이 잠겨 있어야 새 기준값으로 다시 그릴 때 입력이 사라지지 않는다
    onSuccess: (_, { content }) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: adminKeys.edit(kind, content.id) }),
        qc.invalidateQueries({ queryKey: adminKeys.list(kind) }),
        qc.invalidateQueries({ queryKey: adminKeys.counts(kind) }),
        // 사용자 화면의 공개 콘텐츠 캐시 (각 feature query key의 첫 칸)
        qc.invalidateQueries({ queryKey: [PUBLIC_KEY[kind]] }),
      ]),
  });
}

export function useUploadPhoto(kind: AdminKind, id: string) {
  return useMutation({
    mutationKey: adminKeys.upload(kind, id),
    mutationFn: (file: File) => uploadPhoto(kind, id, file),
  });
}

/** 사진을 올리는 중이면 저장을 막는다 — 올리는 도중 저장하면 그 사진이 폼에서 빠진다 */
export function useIsUploading(kind: AdminKind, id: string): boolean {
  return useIsMutating({ mutationKey: adminKeys.upload(kind, id) }) > 0;
}

/** 새 콘텐츠 id — 첫 저장 전에도 사진 경로를 정할 수 있게 화면 진입 때 한 번 만든다 */
export function useNewContentId(kind: AdminKind): string {
  const [id] = useState(() => newContentId(kind));
  return id;
}
