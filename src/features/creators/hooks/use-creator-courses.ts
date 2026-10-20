// 크리에이터 코스 서버 상태 훅 — queryKey는 creatorKeys로만 (rules.md § 상태관리).
import { useQuery } from "@tanstack/react-query";
import { usePlacesByIds } from "@/features/places";
import type { CreatorCourse } from "@/shared/domain";
import {
  CourseNotFoundError,
  getCoursePlaces,
  getCreatorCourse,
  listCreatorCourses,
} from "../api/creators-api";
import { coursePlaceIds, pickCoverPhoto } from "../lib/course";

export const creatorKeys = {
  all: ["creatorCourses"] as const,
  list: () => [...creatorKeys.all, "list"] as const,
  detail: (id: string) => [...creatorKeys.all, "detail", id] as const,
  /** 코스 문서의 장소 구성이 바뀌면 다시 받도록 정렬한 placeIds를 키에 넣는다 */
  places: (placeIds: string[]) => [...creatorKeys.all, "places", placeIds] as const,
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
export function useCoursePlaces(course: { days: { items: { placeId: string }[] }[] } | undefined) {
  const placeIds = coursePlaceIds(course ? [course] : []);
  return useQuery({
    queryKey: creatorKeys.places(placeIds),
    queryFn: () => getCoursePlaces(placeIds),
    enabled: Boolean(course),
  });
}

/**
 * 목록에 보이는 코스들의 카드 대표 사진 — 코스마다 따로 읽지 않고 장소를 한 번에 읽는다.
 * coverOf(course): 사진 주소 · null(사진 없음, 장소를 못 읽음) · undefined(불러오는 중)
 */
export function useCourseCovers(courses: CreatorCourse[]) {
  const ids = coursePlaceIds(courses);
  const places = usePlacesByIds(ids);
  // 조건이 바뀌어 다른 장소를 읽는 동안 보이는 이전 결과로는 대표 사진을 고르지 않는다
  const loading = ids.length > 0 && (places.isPending || places.isPlaceholderData);
  const byId = Object.fromEntries((places.data ?? []).map((p) => [p.id, p]));
  return (course: CreatorCourse): string | null | undefined =>
    loading ? undefined : pickCoverPhoto(course, byId);
}
