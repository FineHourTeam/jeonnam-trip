// S09 여행 시작 — 설정을 받아 로그인 전 초안으로 만들고 코스 편집(S10)으로 보낸다.
// 저장은 편집 화면에서 한다 (비회원도 작성 가능, 저장할 때 로그인).
// ?festival=&date=(&program=)으로 오면 그 축제 방문을 방문일 일차에 담아 시작한다 (기능명세 §2).
// ?creator=로 오면 크리에이터 코스의 장소·순서를 개인 초안으로 복사한다. 넘치는 일차는 미배치 후보로 (기능명세 §5).
// ?places=id1,id2로 오면 장소 목록·상세에서 고른 장소를 첫째 날에 담아 시작한다 (기능명세 §3).
// 여러 개가 함께 오면 축제 → 크리에이터 코스 → 고른 장소 순으로 하나만 쓴다.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CourseNotFoundError,
  copyCourseIntoDraft,
  courseDayCount,
  useCoursePlaces,
  useCreatorCourse,
} from "@/features/creators";
import { useFestival } from "@/features/festivals";
import { readPlaceIds, usePlacesByIds } from "@/features/places";
import {
  addItemsToDay,
  dayIndexOf,
  newTripDraft,
  useTripDraftStore,
  visitFromFestival,
  visitFromPlace,
} from "@/features/trips";
import i18n from "@/lib/i18n";
import { MAX_TRIP_DAYS, type CreatorCourse, type Festival, type TripDraft } from "@/shared/domain";
import { formatDay } from "@/shared/lib/date";
import { courseText, placeText } from "@/shared/lib/content-text";
import { TripSetupForm, type TripSetupValues } from "../components/trip-setup-form";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 축제 방문을 방문일 일차에 담는다. 방문일이 기간 밖이면 미배치 후보로 */
function withFestival(draft: TripDraft, festival: Festival, date: string, programId?: string) {
  const item = visitFromFestival(festival, date, programId);
  const dayIndex = dayIndexOf(draft, date);
  if (dayIndex >= 0) return addItemsToDay(draft, dayIndex, [item]).trip;
  return {
    ...draft,
    // 이유 문구는 초안에 저장되므로 만든 시점의 언어로 남는다
    unplaced: [...draft.unplaced, { ...item, reason: i18n.t("new.outOfRange", { ns: "planner" }) }],
  };
}

export default function TripNewPage() {
  const { t } = useTranslation("planner");
  const navigate = useNavigate();
  const existing = useTripDraftStore((s) => s.draft);
  const setDraft = useTripDraftStore((s) => s.setDraft);
  // notice: 초안을 실제로 넣을 때 띄울 안내 (덮어쓰기 확인을 거치면 확인 뒤에 띄운다)
  const [pending, setPending] = useState<{ draft: TripDraft; notice?: string } | null>(null);
  const [params] = useSearchParams();
  const festivalId = params.get("festival");
  const dateParam = params.get("date") ?? "";
  const visitDate = DATE_RE.test(dateParam) ? dateParam : undefined;
  const programId = params.get("program") ?? undefined;
  const festival = useFestival(festivalId);
  const creatorId = festivalId ? null : params.get("creator");
  const course = useCreatorCourse(creatorId);
  const coursePlaces = useCoursePlaces(course.data);
  // 비공개·없는 코스면 빈 초안으로 시작할 수 있게 한다 (안내는 배너가 한다)
  const courseNotFound = course.error instanceof CourseNotFoundError;
  const courseDays = course.data ? Math.min(courseDayCount(course.data), MAX_TRIP_DAYS) : undefined;
  const placeIds = festivalId || creatorId ? [] : readPlaceIds(params.get("places"));
  const pickedPlaces = usePlacesByIds(placeIds);

  const start = (draft: TripDraft, notice?: string) => {
    setDraft(draft);
    if (notice) toast(notice);
    void navigate(paths.tripDraft);
  };

  const onSubmit = (v: TripSetupValues) => {
    let draft: TripDraft;
    let notice: string | undefined;
    if (festivalId) {
      if (!festival.data) {
        toast(t("new.waitFestival"));
        return;
      }
      draft = newTripDraft({ ...v, origin: { kind: "festival", festivalId } });
      // 취소된 축제는 담지 않는다 — 안내는 위 배너가 한다
      if (visitDate && festival.data.state !== "cancelled") {
        draft = withFestival(draft, festival.data, visitDate, programId);
      }
    } else if (creatorId && !courseNotFound) {
      if (!course.data || !coursePlaces.data) {
        toast(t("new.waitCourse"));
        return;
      }
      const base = newTripDraft({
        ...v,
        siguns: v.siguns.length > 0 ? v.siguns : course.data.siguns,
        origin: { kind: "creator", courseId: creatorId },
      });
      const { trip, missing, duplicates } = copyCourseIntoDraft(
        base,
        course.data,
        coursePlaces.data,
      );
      const skipped = [
        missing > 0 && t("new.skippedMissing", { count: missing }),
        duplicates > 0 && t("new.skippedDuplicates", { count: duplicates }),
      ].filter(Boolean);
      if (skipped.length > 0) {
        notice = t("new.skippedNotice", { list: skipped.join(t("listSeparator")) });
      }
      draft = trip;
    } else if (placeIds.length > 0) {
      if (!pickedPlaces.data) {
        toast(t("new.waitPlaces"));
        return;
      }
      const blank = newTripDraft({ ...v, origin: { kind: "blank" } });
      draft = addItemsToDay(blank, 0, pickedPlaces.data.map(visitFromPlace)).trip;
    } else {
      draft = newTripDraft({ ...v, origin: { kind: "blank" } });
    }
    // 저장 안 한 초안을 조용히 덮어쓰지 않는다
    if (existing) setPending({ draft, notice });
    else start(draft, notice);
  };

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-balance">{t("new.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("new.intro")}</p>
      </div>

      {festivalId && (
        <FestivalBanner
          festival={festival.data}
          isPending={festival.isPending}
          isError={festival.isError}
          onRetry={() => void festival.refetch()}
          visitDate={visitDate}
        />
      )}

      {creatorId && (
        <CreatorBanner
          course={course.data}
          isPending={course.isPending || coursePlaces.isPending}
          isError={course.isError || coursePlaces.isError}
          notFound={courseNotFound}
          onRetry={() => void (course.isError ? course.refetch() : coursePlaces.refetch())}
        />
      )}

      {placeIds.length > 0 && (
        <div className="bg-background-subtle text-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 text-sm">
          {pickedPlaces.isPending ? (
            <Skeleton className="h-5 w-2/3" />
          ) : pickedPlaces.isError ? (
            <>
              <p>{t("new.pickedError")}</p>
              <Button variant="outline" size="sm" onClick={() => void pickedPlaces.refetch()}>
                {t("retry", { ns: "common" })}
              </Button>
            </>
          ) : (
            <p>
              {pickedPlaces.data.length > 0
                ? t("new.pickedReady", { count: pickedPlaces.data.length })
                : t("new.pickedNone")}
            </p>
          )}
        </div>
      )}

      <TripSetupForm onSubmit={onSubmit} defaultDate={visitDate} defaultDays={courseDays} />

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("new.overwriteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("new.overwriteBody", { title: existing?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                void navigate(paths.tripDraft);
              }}
            >
              {t("new.openDraft")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) start(pending.draft, pending.notice);
              }}
            >
              {t("new.startNew")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

interface FestivalBannerProps {
  festival: Festival | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  visitDate: string | undefined;
}

function FestivalBanner({ festival, isPending, isError, onRetry, visitDate }: FestivalBannerProps) {
  const { t, i18n } = useTranslation("planner");
  if (isPending) return <Skeleton className="h-16 w-full rounded-lg" />;
  if (isError || !festival) {
    return (
      <div className="bg-background-subtle text-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 text-sm">
        <p>{t("new.festivalError")}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("retry", { ns: "common" })}
        </Button>
      </div>
    );
  }
  return (
    <div className="bg-background-subtle text-foreground flex flex-col gap-1 rounded-lg p-4 text-sm">
      <p className="font-medium">{placeText(festival, i18n.language).name}</p>
      <p className="text-muted-foreground">
        {festival.state === "cancelled"
          ? t("new.festivalCancelled")
          : visitDate
            ? t("new.festivalWithDate", { date: formatDay(visitDate, i18n.language) })
            : t("new.festivalNoDate")}
      </p>
    </div>
  );
}

interface CreatorBannerProps {
  course: CreatorCourse | undefined;
  isPending: boolean;
  isError: boolean;
  notFound: boolean;
  onRetry: () => void;
}

function CreatorBanner({ course, isPending, isError, notFound, onRetry }: CreatorBannerProps) {
  const { t, i18n } = useTranslation("planner");
  if (notFound) {
    return (
      <div className="bg-background-subtle text-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 text-sm">
        <div className="flex flex-col gap-1">
          <p className="font-medium">{t("new.courseNotFoundTitle")}</p>
          <p className="text-muted-foreground">{t("new.courseNotFoundBody")}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={paths.creators}>{t("new.browseCourses")}</Link>
        </Button>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="bg-background-subtle text-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 text-sm">
        <p>{t("new.courseError")}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("retry", { ns: "common" })}
        </Button>
      </div>
    );
  }
  if (isPending || !course) return <Skeleton className="h-16 w-full rounded-lg" />;
  return (
    <div className="bg-background-subtle text-foreground flex flex-col gap-1 rounded-lg p-4 text-sm">
      <p className="font-medium">{courseText(course, i18n.language).title}</p>
      <p className="text-muted-foreground">
        {t("new.courseIntro", { name: course.creator.name, days: courseDayCount(course) })}
      </p>
    </div>
  );
}
