import { Link } from "react-router";
import { paths } from "@/app/paths";
import { Badge } from "@/components/ui/badge";
import { sigunName, type CreatorCourse } from "@/shared/domain";
import { courseDayCount, formatDays } from "../lib/course";

export function CourseCard({ course }: { course: CreatorCourse }) {
  const placeCount = course.days.reduce((n, d) => n + d.items.length, 0);
  return (
    <Link
      to={paths.creatorDetail(course.id)}
      className="border-border bg-card text-card-foreground hover:bg-background-subtle focus-visible:ring-ring flex flex-col gap-2 rounded-lg border p-4 focus-visible:ring-2 focus-visible:outline-none"
    >
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
        {course.siguns.map(sigunName).join(" · ")} · 장소 {placeCount}곳
      </p>
      <p className="text-muted-foreground text-xs">출처 {course.creator.name}</p>
    </Link>
  );
}
