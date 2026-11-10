// S01 홈 전용 카드 — 4:3 큰 사진 + 사진 오른쪽 아래에 반쯤 걸친 원형 지역 배지 + 아래 이름·보조 정보 (전남 관광 사이트 추천 여행지 참고).
// 카드 전체가 상세로 가는 링크다. 축제·장소·코스 목록 화면의 카드는 따로 있고 이건 홈 가로 목록에만 쓴다.
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatorAvatar, courseDayCount, formatDays, tagLabel } from "@/features/creators";
import { FestivalStateBadge, formatPeriod } from "@/features/festivals";
import { subcategoryLabel } from "@/features/places";
import { cn } from "@/lib/utils";
import type { CreatorCourse, Festival, Place } from "@/shared/domain";
import { courseText, placeText } from "@/shared/lib/content-text";

interface HomeCardProps {
  to: string;
  /** 대표 사진 — null이면 "사진 없음", undefined면 불러오는 중 */
  photo: string | null | undefined;
  /** 원형 배지에 넣을 지역 이름 */
  region: string;
  /** 사진 왼쪽 위에 올릴 배지 (축제 상태 등) */
  badge?: ReactNode;
  /** 사진 아래 글 — 이름과 보조 정보 */
  children: ReactNode;
}

/** 원(56px)에 안 들어가는 긴 로마자 이름(예: "Yeonggwang +")만 알약 모양으로 늘린다 */
function isPillRegion(name: string) {
  return /^[ -~]+$/.test(name) && name.length > 5;
}

export function HomeCard({ to, photo, region, badge, children }: HomeCardProps) {
  const { t } = useTranslation("explore");
  const pill = isPillRegion(region);
  return (
    <Link
      to={to}
      className="group focus-visible:outline-ring flex h-full flex-col gap-3 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2"
    >
      <div className="relative">
        <div className="bg-background-subtle text-muted-foreground flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl text-sm">
          {photo === undefined ? (
            <Skeleton className="size-full rounded-none" />
          ) : photo ? (
            // 이름이 바로 아래 글자로 있어 사진은 장식으로 둔다
            <img
              src={photo}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : (
            t("card.noPhoto")
          )}
        </div>
        {/* outline 배지(예정·종료)는 배경이 투명해 사진 위에서 안 읽히므로 불투명 바탕을 깐다 */}
        {badge && <div className="bg-background absolute top-2 left-2 rounded-4xl">{badge}</div>}
        <RegionBadge name={region} pill={pill} />
      </div>
      {/* 원형 배지 자리 = right-3(12px) + 56px + ring 4px = 72px → pr-20(80px).
          알약 배지는 폭이 일정하지 않아 글을 배지 아래(사진 밖 28px + ring 4px)로 내린다 */}
      <div className={cn("flex min-w-0 flex-col gap-1", pill ? "pt-6" : "pr-20")}>{children}</div>
    </Link>
  );
}

/** 두 글자는 크게, 세 글자 이상은 작게. 한·일 이름은 원 안에서 띄어쓰기 기준으로 줄바꿈("장성군 외")하고,
 *  긴 로마자 이름은 옆으로 늘어난 알약 모양이 된다 */
function RegionBadge({ name, pill }: { name: string; pill: boolean }) {
  return (
    <span
      className={cn(
        "bg-primary text-primary-foreground ring-background absolute right-3 -bottom-7 flex h-14 items-center justify-center rounded-full text-center leading-tight font-bold ring-4",
        pill ? "min-w-14 px-3 whitespace-nowrap" : "w-14 px-1 break-keep",
        name.length <= 2 ? "text-sm" : "text-xs",
      )}
    >
      {name}
    </span>
  );
}

export function HomeCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-4/3 w-full rounded-xl" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function FestivalHomeCard({ festival, today }: { festival: Festival; today: string }) {
  const { t, i18n } = useTranslation("explore");
  const { name } = placeText(festival, i18n.language);
  return (
    <HomeCard
      to={paths.festivalDetail(festival.id)}
      photo={festival.photos[0] ?? null}
      region={t(`sigun.${festival.sigun}`, { ns: "common" })}
      badge={<FestivalStateBadge festival={festival} today={today} />}
    >
      <p className="line-clamp-2 font-semibold text-pretty">{name}</p>
      <p className="text-muted-foreground truncate text-sm">
        {formatPeriod(festival.startDate, festival.endDate, i18n.language)}
      </p>
    </HomeCard>
  );
}

export function PlaceHomeCard({ place }: { place: Place }) {
  const { t, i18n } = useTranslation("explore");
  const { name } = placeText(place, i18n.language);
  return (
    <HomeCard
      to={paths.placeDetail(place.id)}
      photo={place.photos[0] ?? null}
      region={t(`sigun.${place.sigun}`, { ns: "common" })}
    >
      <p className="line-clamp-2 font-semibold text-pretty">{name}</p>
      <p className="text-muted-foreground truncate text-sm">
        {t(`placeCategory.${place.category}`, { ns: "common" })}
        {place.subcategory ? ` · ${subcategoryLabel(place.subcategory, i18n.language)}` : ""}
      </p>
    </HomeCard>
  );
}

interface CourseHomeCardProps {
  course: CreatorCourse;
  /** 대표 사진 (useCourseCovers) — null이면 사진 없음, undefined면 불러오는 중 */
  cover: string | null | undefined;
}

export function CourseHomeCard({ course, cover }: CourseHomeCardProps) {
  const { t, i18n } = useTranslation("explore");
  const { title } = courseText(course, i18n.language);
  const siguns = course.siguns.map((s) => t(`sigun.${s}`, { ns: "common" }));
  const placeCount = course.days.reduce((n, d) => n + d.items.length, 0);
  const [first = t("jeonnam")] = siguns;
  return (
    <HomeCard
      to={paths.creatorDetail(course.id)}
      photo={cover}
      region={siguns.length > 1 ? t("card.regionMore", { region: first }) : first}
    >
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{formatDays(courseDayCount(course))}</Badge>
        {course.tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tagLabel(tag, i18n.language)}
          </Badge>
        ))}
      </div>
      <p className="line-clamp-2 font-semibold text-pretty">{title}</p>
      <p className="text-muted-foreground truncate text-sm">
        {t("card.meta", {
          ns: "creators",
          regions: siguns.join(t("regionSeparator", { ns: "creators" })),
          count: placeCount,
        })}
      </p>
      <div className="flex items-center gap-2">
        <CreatorAvatar creator={course.creator} size="sm" />
        <p className="min-w-0 truncate text-sm font-medium">{course.creator.name}</p>
      </div>
    </HomeCard>
  );
}
