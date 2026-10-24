// 크리에이터 코스 카드 — 대표 사진은 첫 장소 사진을 호출 측이 넘긴다.
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { RouteIcon } from "@/components/icons";
import { Photo } from "@/components/photo";
import { cn } from "@/lib/utils";
import { sigunName, type CreatorCourse, type PhotoAsset } from "@/shared/domain";
import { tripLengthLabel } from "@/shared/lib/format";

export const ORDER_BASIS_LABEL: Record<CreatorCourse["orderBasis"], string> = {
  video_order: "영상 등장 순서",
  verified_trip: "확인된 여행 순서",
  editor_suggested: "운영팀 제안 순서",
};

export function CourseCard({
  course,
  cover,
  className,
}: {
  course: CreatorCourse;
  cover: PhotoAsset | undefined;
  className?: string;
}) {
  return (
    <article className={cn("relative", className)}>
      <Link to={paths.creatorDetail(course.id)} className="group flex flex-col gap-2 rounded-xl outline-none">
        <Photo
          photo={cover}
          alt={course.title}
          fallbackIcon={<RouteIcon size="lg" />}
          className="aspect-4/3 w-full rounded-xl transition-opacity group-hover:opacity-90"
        />
        <div className="flex min-w-0 flex-col gap-0.5 px-0.5">
          <p className="text-muted-foreground truncate text-xs">
            {[course.creator.name, tripLengthLabel(course.days.length), course.siguns.map(sigunName).join("·")]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <h3 className="line-clamp-2 text-base leading-snug font-semibold group-focus-visible:underline">
            {course.title}
          </h3>
          <p className="text-muted-foreground text-sm">{ORDER_BASIS_LABEL[course.orderBasis]} 기준</p>
        </div>
      </Link>
    </article>
  );
}
