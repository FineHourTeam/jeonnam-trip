// 축제 서버 상태 훅 — queryKey는 festivalKeys로만 (rules.md § 상태관리).
import { useQuery } from "@tanstack/react-query";
import {
  FestivalNotFoundError,
  getFestival,
  listFestivals,
  type FestivalListQuery,
} from "../api/festivals-api";

export const festivalKeys = {
  all: ["festivals"] as const,
  list: (q: FestivalListQuery) => [...festivalKeys.all, "list", q] as const,
  detail: (id: string) => [...festivalKeys.all, "detail", id] as const,
};

export function useFestivals(q: FestivalListQuery) {
  return useQuery({ queryKey: festivalKeys.list(q), queryFn: () => listFestivals(q) });
}

export function useFestival(id: string | null | undefined) {
  return useQuery({
    queryKey: festivalKeys.detail(id ?? ""),
    queryFn: () => getFestival(id ?? ""),
    enabled: Boolean(id),
    retry: (count, error) => !(error instanceof FestivalNotFoundError) && count < 2,
  });
}
