// S08 크리에이터 코스 상세 — 원문 출처·순서 기준·일차별 장소. 복사는 여행 시작(S09)에서 날짜를 받아 개인 초안으로 만든다.
// 순서 기준이 편집자 구성·영상 등장이면 실제 방문 순서로 표현하지 않는다 (기능명세 §5).
// 코스 지도는 일차 하나씩 번호 마커와 실제 자동차 경로로 보여 준다 (CourseDayMap).
import { useState } from "react";
import { Link, useParams } from "react-router";
import { paths } from "@/app/paths";
import { ChevronLeftIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PLACE_CATEGORY_LABEL,
  sigunName,
  type CourseOrderBasis,
  type CreatorCourse,
  type Place,
} from "@/shared/domain";
import { cn } from "@/lib/utils";
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
} from "../lib/course";

const ORDER_BASIS_TEXT: Record<CourseOrderBasis, string> = {
  editor_suggested: "편집자가 구성한 순서예요. 실제로 이 순서대로 다녀온 기록은 아니에요.",
  video_order: "영상에 나온 순서예요. 실제 방문 순서와 다를 수 있어요.",
  verified_trip: "크리에이터가 실제로 다녀온 순서예요.",
};

export default function CreatorDetailPage() {
  const { courseId } = useParams();
  const query = useCreatorCourse(courseId);

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link to={paths.creators}>
          <ChevronLeftIcon size="sm" />
          코스 목록
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
  return (
    <div className="flex flex-col items-start gap-3">
      <Alert variant="destructive">
        <AlertTitle>{notFound ? "코스를 찾을 수 없어요" : "코스를 불러오지 못했어요"}</AlertTitle>
        <AlertDescription>
          {notFound
            ? "공개가 끝났거나 주소가 잘못된 코스예요."
            : "네트워크 연결을 확인한 뒤 다시 시도해 주세요."}
        </AlertDescription>
      </Alert>
      {!notFound && <Button onClick={onRetry}>다시 시도</Button>}
    </div>
  );
}

function CourseDetail({ course }: { course: CreatorCourse }) {
  const places = useCoursePlaces(course);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const channelUrl = safeHttpUrl(course.creator.channelUrl);
  const sourceUrl = safeHttpUrl(course.sourceUrl);

  return (
    <>
      <Seo
        title={course.title}
        description={`${course.creator.name}이(가) 구성한 ${course.siguns.map(sigunName).join("·")} 여행 코스`}
      />
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{formatDays(courseDayCount(course))}</Badge>
          {course.tags.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
        <h1 className="text-xl font-semibold text-balance">{course.title}</h1>
        <p className="text-muted-foreground text-sm">{course.siguns.map(sigunName).join(" · ")}</p>
      </header>

      <div className="bg-background-subtle text-foreground flex flex-col gap-1 rounded-lg p-4 text-sm">
        <p>
          출처{" "}
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
                원문 보기
              </a>
            </>
          )}
        </p>
        <p className="text-muted-foreground">{ORDER_BASIS_TEXT[course.orderBasis]}</p>
        {course.reviewedAt && (
          <p className="text-muted-foreground">운영팀 확인일 {formatDotDate(course.reviewedAt)}</p>
        )}
      </div>

      {course.summary && <p className="leading-relaxed text-pretty">{course.summary}</p>}

      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <p className="text-sm">
          여행 날짜를 고르면 이 코스의 장소와 순서를 내 코스로 가져와요. 가져온 코스는 내 개인
          코스라 고쳐도 원본은 바뀌지 않아요.
        </p>
        <Button asChild className="self-start">
          <Link to={`${paths.tripNew}?${new URLSearchParams({ creator: course.id }).toString()}`}>
            내 일정으로 가져오기
          </Link>
        </Button>
      </div>

      {places.isError ? (
        <div className="flex flex-col items-start gap-3">
          <Alert variant="destructive">
            <AlertTitle>장소 정보를 불러오지 못했어요</AlertTitle>
            <AlertDescription>네트워크 연결을 확인한 뒤 다시 시도해 주세요.</AlertDescription>
          </Alert>
          <Button onClick={() => void places.refetch()}>다시 시도</Button>
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
              <h2 className="text-base font-semibold">{day.day}일차</h2>
              <ol className="flex flex-col gap-2">
                {day.items.map((item, i) => (
                  <li key={courseItemId(day.day, i)}>
                    {places.isPending ? (
                      <Skeleton className="h-20 w-full rounded-lg" />
                    ) : (
                      <PlaceRow
                        index={i + 1}
                        place={places.data[item.placeId]}
                        note={item.note}
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
  if (!place) {
    return (
      <div className="bg-background-subtle text-muted-foreground flex items-center gap-3 rounded-lg p-3 text-sm">
        <span className="w-5 shrink-0 text-center font-medium">{index}</span>
        지금은 볼 수 없는 장소예요. 가져올 때 빠져요.
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
          사진 없음
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate font-medium">{place.name}</p>
        <p className="text-muted-foreground text-sm">
          {sigunName(place.sigun)} · {PLACE_CATEGORY_LABEL[place.category]}
        </p>
        {(hoursUnknown(place) || closed) && (
          <div className="flex flex-wrap gap-1.5">
            {hoursUnknown(place) && <Badge variant="warning">영업시간 미확인</Badge>}
            {closed && <Badge variant="outline">{closed}</Badge>}
          </div>
        )}
        {note && <p className="text-muted-foreground text-sm">{note}</p>}
      </div>
    </Link>
  );
}
