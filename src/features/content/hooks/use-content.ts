// 운영 콘텐츠 서버 상태 훅 — queryKey는 contentKeys로만 (rules.md § 상태관리).
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Place, PlaceCategory, SigunCode } from "@/shared/domain";
import {
  getCreatorCourse,
  getFestival,
  getFestivalsByIds,
  getPlace,
  getPlacesByIds,
  listCreatorCourses,
  listFestivals,
  listPlaces,
} from "../api/content-api";

export const contentKeys = {
  all: ["content"] as const,
  places: (f: { sigun?: SigunCode | null; category?: PlaceCategory | null }) =>
    [...contentKeys.all, "places", f.sigun ?? "", f.category ?? ""] as const,
  place: (id: string) => [...contentKeys.all, "place", id] as const,
  placesByIds: (ids: string[]) => [...contentKeys.all, "placesByIds", [...ids].sort().join(",")] as const,
  festivals: (f: { from: string; to: string; sigun?: SigunCode | null }) =>
    [...contentKeys.all, "festivals", f.from, f.to, f.sigun ?? ""] as const,
  festival: (id: string) => [...contentKeys.all, "festival", id] as const,
  festivalsByIds: (ids: string[]) =>
    [...contentKeys.all, "festivalsByIds", [...ids].sort().join(",")] as const,
  courses: () => [...contentKeys.all, "courses"] as const,
  course: (id: string) => [...contentKeys.all, "course", id] as const,
};

const CONTENT_STALE = 5 * 60_000;

/** 장소 목록 — 서버는 시군·종류만 거르고, 세부 필터는 화면이 불러온 목록에서 거른다 */
export function usePlaces(filter: { sigun?: SigunCode | null; category?: PlaceCategory | null }) {
  return useInfiniteQuery({
    queryKey: contentKeys.places(filter),
    queryFn: ({ pageParam }) => listPlaces(filter, pageParam),
    initialPageParam: null as Awaited<ReturnType<typeof listPlaces>>["cursor"],
    getNextPageParam: (last) => last.cursor ?? undefined,
    staleTime: CONTENT_STALE,
    placeholderData: keepPreviousData,
  });
}

export function usePlace(id: string | undefined) {
  return useQuery({
    queryKey: contentKeys.place(id ?? ""),
    queryFn: () => getPlace(id ?? ""),
    enabled: Boolean(id),
    staleTime: CONTENT_STALE,
  });
}

export function usePlacesByIds(ids: string[]) {
  return useQuery({
    queryKey: contentKeys.placesByIds(ids),
    queryFn: () => getPlacesByIds(ids),
    enabled: ids.length > 0,
    staleTime: CONTENT_STALE,
  });
}

export function useFestivals(filter: { from: string; to: string; sigun?: SigunCode | null }) {
  return useQuery({
    queryKey: contentKeys.festivals(filter),
    queryFn: () => listFestivals(filter),
    staleTime: CONTENT_STALE,
    placeholderData: keepPreviousData,
  });
}

export function useFestival(id: string | undefined) {
  return useQuery({
    queryKey: contentKeys.festival(id ?? ""),
    queryFn: () => getFestival(id ?? ""),
    enabled: Boolean(id),
    staleTime: CONTENT_STALE,
  });
}

export function useFestivalsByIds(ids: string[]) {
  return useQuery({
    queryKey: contentKeys.festivalsByIds(ids),
    queryFn: () => getFestivalsByIds(ids),
    enabled: ids.length > 0,
    staleTime: CONTENT_STALE,
  });
}

export function useCreatorCourses() {
  return useQuery({ queryKey: contentKeys.courses(), queryFn: listCreatorCourses, staleTime: CONTENT_STALE });
}

export function useCreatorCourse(id: string | undefined) {
  return useQuery({
    queryKey: contentKeys.course(id ?? ""),
    queryFn: () => getCreatorCourse(id ?? ""),
    enabled: Boolean(id),
    staleTime: CONTENT_STALE,
  });
}

/** 여러 시군의 공개 장소 첫 페이지를 불러오는 함수 — 추천 시작 제출 때 한 번 (캐시 공유) */
export function useRegionPlacesFetcher() {
  const qc = useQueryClient();
  return async (siguns: SigunCode[]): Promise<Place[]> => {
    const pages = await Promise.all(
      siguns.map((sigun) =>
        qc.query({
          queryKey: [...contentKeys.places({ sigun, category: null }), "first"] as const,
          queryFn: () => listPlaces({ sigun }),
          staleTime: CONTENT_STALE,
        }),
      ),
    );
    return pages.flatMap((p) => p.items);
  };
}
