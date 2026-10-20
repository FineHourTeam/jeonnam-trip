// 크리에이터 코스 서버 상태 훅 — queryKey는 creatorKeys로만 (rules.md § 상태관리).
import { useQuery } from "@tanstack/react-query";
import {
  CourseNotFoundError,
  getCoursePlaces,
  getCreatorCourse,
  listCreatorCourses,
} from "../api/creators-api";

export const creatorKeys = {
  all: ["creatorCourses"] as const,
  list: () => [...creatorKeys.all, "list"] as const,
  detail: (id: string) => [...creatorKeys.all, "detail", id] as const,
  places: (id: string) => [...creatorKeys.all, "places", id] as const,
};

export function useCreatorCourses() {
  return useQuery({ queryKey: creatorKeys.list(), queryFn: listCreatorCourses });
}

export function useCreatorCourse(id: string | null | undefined) {
  return useQuery({
    queryKey: creatorKeys.detail(id ?? ""),
    queryFn: () => getCreatorCourse(id ?? ""),
    enabled: Boolean(id),
    retry: (count, error) => !(error instanceof CourseNotFoundError) && count < 2,
  });
}

/** 코스 문서를 받은 뒤 그 코스에 든 공개 장소를 id → Place로 */
export function useCoursePlaces(
  course: { id: string; days: { items: { placeId: string }[] }[] } | undefined,
) {
  return useQuery({
    queryKey: creatorKeys.places(course?.id ?? ""),
    queryFn: () =>
      getCoursePlaces(course?.days.flatMap((d) => d.items.map((i) => i.placeId)) ?? []),
    enabled: Boolean(course),
  });
}
