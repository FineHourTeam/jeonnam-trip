// 장소 서버 상태 훅 — queryKey는 placeKeys로만 (rules.md § 상태관리).
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  PlaceNotFoundError,
  countPlaces,
  getPlace,
  listPlaces,
  type PlaceCursor,
  type PlaceListQuery,
} from "../api/places-api";

export const placeKeys = {
  all: ["places"] as const,
  list: (q: PlaceListQuery) => [...placeKeys.all, "list", q] as const,
  count: (q: PlaceListQuery) => [...placeKeys.all, "count", q] as const,
  detail: (id: string) => [...placeKeys.all, "detail", id] as const,
};

export function usePlaces(q: PlaceListQuery) {
  return useInfiniteQuery({
    queryKey: placeKeys.list(q),
    queryFn: ({ pageParam }) => listPlaces(q, pageParam),
    initialPageParam: null as PlaceCursor | null,
    getNextPageParam: (last) => last.next,
  });
}

export function usePlaceCount(q: PlaceListQuery) {
  return useQuery({ queryKey: placeKeys.count(q), queryFn: () => countPlaces(q) });
}

export function usePlace(id: string | null | undefined) {
  return useQuery({
    queryKey: placeKeys.detail(id ?? ""),
    queryFn: () => getPlace(id ?? ""),
    enabled: Boolean(id),
    retry: (count, error) => !(error instanceof PlaceNotFoundError) && count < 2,
  });
}
