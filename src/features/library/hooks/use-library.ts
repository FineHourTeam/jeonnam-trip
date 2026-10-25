// 보관함 서버 상태 훅 — queryKey는 libraryKeys로만. 로그인 전에는 조회하지 않는다.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUid } from "@/features/trips";
import type { CustomPlace, SavedPlace } from "@/shared/domain";
import {
  createCustomPlace,
  deleteSnsLink,
  getSnsLink,
  listCustomPlaces,
  listSavedPlaces,
  listSnsLinks,
  saveSnsLink,
  savePlace,
  unsavePlace,
  updateCustomPlace,
  updateSavedPlace,
} from "../api/library-api";

export const libraryKeys = {
  all: ["library"] as const,
  saved: (uid: string) => [...libraryKeys.all, uid, "saved"] as const,
  custom: (uid: string) => [...libraryKeys.all, uid, "custom"] as const,
  sns: (uid: string) => [...libraryKeys.all, uid, "sns"] as const,
  snsOne: (uid: string, id: string) => [...libraryKeys.all, uid, "sns", id] as const,
};

function useUidOrThrow(): () => string {
  const uid = useCurrentUid();
  return () => {
    if (!uid) throw new Error("로그인하면 보관함에 저장할 수 있어요.");
    return uid;
  };
}

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
    queryKey: libraryKeys.custom(uid ?? ""),
    queryFn: () => listCustomPlaces(uid ?? ""),
    enabled: uid !== null,
  });
}

export function useSnsLinks() {
  const uid = useCurrentUid();
  return useQuery({
    queryKey: libraryKeys.sns(uid ?? ""),
    queryFn: () => listSnsLinks(uid ?? ""),
    enabled: uid !== null,
  });
}

export function useSnsLink(id: string | null) {
  const uid = useCurrentUid();
  return useQuery({
    queryKey: libraryKeys.snsOne(uid ?? "", id ?? ""),
    queryFn: () => getSnsLink(uid ?? "", id ?? ""),
    enabled: uid !== null && Boolean(id),
  });
}

function useInvalidateLibrary() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: libraryKeys.all });
}

export function useSavePlace() {
  const getUid = useUidOrThrow();
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (input: { ref: SavedPlace["ref"]; tags?: string[]; memo?: string }) =>
      savePlace(getUid(), input.ref, input),
    onSettled: invalidate,
  });
}

export function useUnsavePlace() {
  const getUid = useUidOrThrow();
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (savedId: string) => unsavePlace(getUid(), savedId),
    onSettled: invalidate,
  });
}

export function useUpdateSavedPlace() {
  const getUid = useUidOrThrow();
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (input: { id: string; tags: string[]; memo: string }) =>
      updateSavedPlace(getUid(), input.id, input),
    onSettled: invalidate,
  });
}

export function useCreateCustomPlace() {
  const getUid = useUidOrThrow();
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (input: {
      place: Omit<CustomPlace, "id" | "createdAt">;
      tags: string[];
      memo: string;
    }) => createCustomPlace(getUid(), input.place, input),
    onSettled: invalidate,
  });
}

export function useUpdateCustomPlace() {
  const getUid = useUidOrThrow();
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (input: { id: string; patch: Partial<Omit<CustomPlace, "id" | "createdAt">> }) =>
      updateCustomPlace(getUid(), input.id, input.patch),
    onSettled: invalidate,
  });
}

export function useSaveSnsLink() {
  const getUid = useUidOrThrow();
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (input: Parameters<typeof saveSnsLink>[1]) => saveSnsLink(getUid(), input),
    onSettled: invalidate,
  });
}

export function useDeleteSnsLink() {
  const getUid = useUidOrThrow();
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (id: string) => deleteSnsLink(getUid(), id),
    onSettled: invalidate,
  });
}
