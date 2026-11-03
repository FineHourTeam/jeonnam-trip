import { Link } from "react-router";
import { paths } from "@/app/paths";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { sigunName, type CreatorCourse } from "@/shared/domain";
import { courseDayCount, formatDays } from "../lib/course";
import { CreatorAvatar } from "./creator-avatar";

interface CourseCardProps {
  course: CreatorCourse;
  /** 대표 사진 (useCourseCovers) — null이면 사진 자리, undefined면 불러오는 중 */
  cover: string | null | undefined;
}

export function CourseCard({ course, cover }: CourseCardProps) {
  const placeCount = course.days.reduce((n, d) => n + d.items.length, 0);
  const regions = course.siguns.map(sigunName).join(" · ");
  return (
    <Link
      to={paths.creatorDetail(course.id)}
      className="border-border bg-card text-card-foreground hover:bg-background-subtle focus-visible:ring-ring flex h-full flex-col overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:outline-none"
    >
      {cover === undefined ? (
        <Skeleton className="aspect-video w-full rounded-none" />
      ) : cover ? (
        // 제목이 바로 아래 글자로 있어 사진은 장식으로 둔다
        <img
          src={cover}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-video w-full object-cover"
        />
      ) : (
        <div className="bg-background-subtle text-muted-foreground flex aspect-video w-full items-center justify-center px-4 text-center text-sm">
          {regions}
        </div>
      )}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{formatDays(courseDayCount(course))}</Badge>
          {course.tags.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
        <p className="line-clamp-2 font-medium text-pretty">{course.title}</p>
        <p className="text-muted-foreground text-sm">
          {regions} · 장소 {placeCount}곳
        </p>
        <div className="mt-1 flex items-center gap-2">
          <CreatorAvatar creator={course.creator} size="sm" />
          <p className="min-w-0 truncate text-sm font-medium">{course.creator.name}</p>
        </div>
      </div>
    </Link>
  );
}
