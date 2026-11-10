// S08 크리에이터 코스 상세 — 원문 출처(유튜브면 영상)·순서 기준·일차별 장소. 복사는 여행 시작(S09)에서 날짜를 받아 개인 초안으로 만든다.
// 순서 기준이 편집자 구성·영상 등장이면 실제 방문 순서로 표현하지 않는다 (기능명세 §5).
// 코스 지도는 일차 하나씩 번호 마커와 실제 자동차 경로로 보여 준다 (CourseDayMap).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { paths } from "@/app/paths";
import { ChevronLeftIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CreatorCourse, Place } from "@/shared/domain";
import { cn } from "@/lib/utils";
import { courseText, placeText } from "@/shared/lib/content-text";
import { formatDotDate, safeHttpUrl } from "@/shared/lib/format";
import { CourseNotFoundError } from "../api/creators-api";
import { CourseDayMap } from "../components/course-day-map";
import { useCoursePlaces, useCreatorCourse } from "../hooks/use-creator-courses";
import {
  closedWeekdaysLabel,
  courseDayCount,
  courseItemId,
  formatDays,
  hoursUnknown,
  sortedDays,
  tagLabel,
} from "../lib/course";
import { youtubeEmbedUrl, youtubeVideoId } from "../lib/youtube";
import { CreatorAvatar } from "../components/creator-avatar";

export default function CreatorDetailPage() {
  const { courseId } = useParams();
  const { t } = useTranslation("creators");
  const query = useCreatorCourse(courseId);

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link to={paths.creators}>
          <ChevronLeftIcon size="sm" />
          {t("detail.backToList")}
        </Link>
      </Button>
      {query.isPending ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : query.isError ? (
        <LoadError
          notFound={query.error instanceof CourseNotFoundError}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <CourseDetail course={query.data} />
      )}
    </section>
  );
}

function LoadError({ notFound, onRetry }: { notFound: boolean; onRetry: () => void }) {
  const { t } = useTranslation("creators");
  return (
    <div className="flex flex-col items-start gap-3">
      <Alert variant="destructive">
        <AlertTitle>{notFound ? t("detail.notFoundTitle") : t("detail.loadErrorTitle")}</AlertTitle>
        <AlertDescription>
          {notFound ? t("detail.notFoundBody") : t("detail.networkHint")}
        </AlertDescription>
      </Alert>
      {!notFound && <Button onClick={onRetry}>{t("retry", { ns: "common" })}</Button>}
    </div>
  );
}

function CourseDetail({ course }: { course: CreatorCourse }) {
  const { t, i18n } = useTranslation("creators");
  const places = useCoursePlaces(course);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const channelUrl = safeHttpUrl(course.creator.channelUrl);
  const sourceUrl = safeHttpUrl(course.sourceUrl);
  const videoId = youtubeVideoId(course.sourceUrl);
  const text = courseText(course, i18n.language);
  const sigunNames = course.siguns.map((s) => t(`sigun.${s}`, { ns: "common" }));

  return (
    <>
      <Seo
        title={text.title}
        description={t("detail.seoDescription", {
          name: course.creator.name,
          regions: sigunNames.join(t("weekdaySeparator")),
        })}
      />
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{formatDays(courseDayCount(course))}</Badge>
          {course.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tagLabel(tag, i18n.language)}
            </Badge>
          ))}
        </div>
        <h1 className="text-xl font-semibold text-balance">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{sigunNames.join(t("regionSeparator"))}</p>
      </header>

      <div className="bg-background-subtle text-foreground flex flex-col gap-3 rounded-lg p-4 text-sm">
        {videoId && (
          <iframe
            src={youtubeEmbedUrl(videoId)}
            title={t("detail.videoTitle", { name: course.creator.name, title: text.title })}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-video w-full rounded-md"
          />
        )}
        <div className="flex flex-col gap-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CreatorAvatar creator={course.creator} />
            {channelUrl ? (
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-4"
              >
                {course.creator.name}
              </a>
            ) : (
              <span className="font-medium">{course.creator.name}</span>
            )}
            {sourceUrl && (
              <>
                {" "}
                ·{" "}
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {t("detail.viewOriginal")}
                </a>
              </>
            )}
          </p>
          <p className="text-muted-foreground">{t(`detail.orderBasis.${course.orderBasis}`)}</p>
          {course.reviewedAt && (
            <p className="text-muted-foreground">
              {t("detail.reviewedAt", { date: formatDotDate(course.reviewedAt, i18n.language) })}
            </p>
          )}
        </div>
      </div>

      {text.summary && <p className="leading-relaxed text-pretty">{text.summary}</p>}

      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <p className="text-sm">{t("detail.importHint")}</p>
        <Button asChild className="self-start">
          <Link to={`${paths.tripNew}?${new URLSearchParams({ creator: course.id }).toString()}`}>
            {t("detail.import")}
          </Link>
        </Button>
      </div>

      {places.isError ? (
        <div className="flex flex-col items-start gap-3">
          <Alert variant="destructive">
            <AlertTitle>{t("detail.placesError")}</AlertTitle>
            <AlertDescription>{t("detail.networkHint")}</AlertDescription>
          </Alert>
          <Button onClick={() => void places.refetch()}>{t("retry", { ns: "common" })}</Button>
        </div>
      ) : (
        <>
          {places.isPending ? (
            <Skeleton className="aspect-video w-full rounded-lg" />
          ) : (
            <CourseDayMap
              course={course}
              places={places.data}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
          {sortedDays(course.days).map((day) => (
            <section key={day.day} className="flex flex-col gap-3">
              <h2 className="text-base font-semibold">{t("dayLabel", { day: day.day })}</h2>
              <ol className="flex flex-col gap-2">
                {day.items.map((item, i) => (
                  <li key={courseItemId(day.day, i)}>
                    {places.isPending ? (
                      <Skeleton className="h-20 w-full rounded-lg" />
                    ) : (
                      <PlaceRow
                        index={i + 1}
                        place={places.data[item.placeId]}
                        note={text.note(day.day, i)}
                        selected={selectedId === courseItemId(day.day, i)}
                      />
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </>
      )}
    </>
  );
}

interface PlaceRowProps {
  index: number;
  place?: Place;
  note?: string;
  /** 지도에서 고른 마커의 장소 */
  selected: boolean;
}

function PlaceRow({ index, place, note, selected }: PlaceRowProps) {
  const { t, i18n } = useTranslation("creators");
  if (!place) {
    return (
      <div className="bg-background-subtle text-muted-foreground flex items-center gap-3 rounded-lg p-3 text-sm">
        <span className="w-5 shrink-0 text-center font-medium">{index}</span>
        {t("detail.unavailablePlace")}
      </div>
    );
  }
  const photo = place.photos[0];
  const closed = closedWeekdaysLabel(place);
  return (
    <Link
      to={paths.placeDetail(place.id)}
      className={cn(
        "border-border bg-card text-card-foreground hover:bg-background-subtle focus-visible:ring-ring flex items-center gap-3 rounded-lg border p-3 focus-visible:ring-2 focus-visible:outline-none",
        selected && "ring-ring ring-2",
      )}
    >
      <span className="w-5 shrink-0 text-center text-sm font-medium">{index}</span>
      {photo ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          className="size-14 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="bg-background-subtle text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-md text-xs">
          {t("detail.noPhoto")}
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate font-medium">{placeText(place, i18n.language).name}</p>
        <p className="text-muted-foreground text-sm">
          {t(`sigun.${place.sigun}`, { ns: "common" })} ·{" "}
          {t(`placeCategory.${place.category}`, { ns: "common" })}
        </p>
        {(hoursUnknown(place) || closed) && (
          <div className="flex flex-wrap gap-1.5">
            {hoursUnknown(place) && <Badge variant="warning">{t("detail.hoursUnknown")}</Badge>}
            {closed && <Badge variant="outline">{closed}</Badge>}
          </div>
        )}
        {note && <p className="text-muted-foreground text-sm">{note}</p>}
      </div>
    </Link>
  );
}
