// S09 여행 시작 — 설정을 받아 로그인 전 초안으로 만들고 코스 편집(S10)으로 보낸다.
// 저장은 편집 화면에서 한다 (비회원도 작성 가능, 저장할 때 로그인).
// ?festival=&date=(&program=)으로 오면 그 축제 방문을 방문일 일차에 담아 시작한다 (기능명세 §2).
// ?creator=로 오면 크리에이터 코스의 장소·순서를 개인 초안으로 복사한다. 넘치는 일차는 미배치 후보로 (기능명세 §5).
// ?places=id1,id2로 오면 장소 목록·상세에서 고른 장소를 첫째 날에 담아 시작한다 (기능명세 §3).
// 여러 개가 함께 오면 축제 → 크리에이터 코스 → 고른 장소 순으로 하나만 쓴다.
import { useState } from "react";
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
import {
  MAX_TRIP_DAYS,
  isSigunCode,
  type CreatorCourse,
  type Festival,
  type TripDraft,
} from "@/shared/domain";
import { formatDateKo } from "@/shared/lib/date";
import { TripSetupForm, type TripSetupValues } from "../components/trip-setup-form";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 축제 방문을 방문일 일차에 담는다. 방문일이 기간 밖이면 미배치 후보로 */
function withFestival(draft: TripDraft, festival: Festival, date: string, programId?: string) {
  const item = visitFromFestival(festival, date, programId);
  const dayIndex = dayIndexOf(draft, date);
  if (dayIndex >= 0) return addItemsToDay(draft, dayIndex, [item]).trip;
  return {
    ...draft,
    unplaced: [...draft.unplaced, { ...item, reason: "방문일이 여행 기간 밖이에요." }],
  };
}

export default function TripNewPage() {
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
  const sigunParam = params.get("sigun");
  const defaultSiguns = sigunParam && isSigunCode(sigunParam) ? [sigunParam] : undefined;
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
        toast("축제 정보를 불러온 뒤 다시 눌러 주세요.");
        return;
      }
      draft = newTripDraft({ ...v, origin: { kind: "festival", festivalId } });
      // 취소된 축제는 담지 않는다 — 안내는 위 배너가 한다
      if (visitDate && festival.data.state !== "cancelled") {
        draft = withFestival(draft, festival.data, visitDate, programId);
      }
    } else if (creatorId && !courseNotFound) {
      if (!course.data || !coursePlaces.data) {
        toast("코스 정보를 불러온 뒤 다시 눌러 주세요.");
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
        missing > 0 && `지금은 볼 수 없는 장소 ${String(missing)}곳`,
        duplicates > 0 && `같은 일차에 겹친 장소 ${String(duplicates)}곳`,
      ].filter(Boolean);
      if (skipped.length > 0) notice = `가져오지 못한 장소가 있어요 (${skipped.join(", ")}).`;
      draft = trip;
    } else if (placeIds.length > 0) {
      if (!pickedPlaces.data) {
        toast("장소 정보를 불러온 뒤 다시 눌러 주세요.");
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
        <h1 className="text-xl font-semibold text-balance">여행 만들기</h1>
        <p className="text-muted-foreground text-sm">
          날짜를 정하고 코스에 장소를 담으면 이동시간과 영업시간을 함께 계산해요.
        </p>
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
              <p>고른 장소를 불러오지 못했어요.</p>
              <Button variant="outline" size="sm" onClick={() => void pickedPlaces.refetch()}>
                다시 시도
              </Button>
            </>
          ) : (
            <p>
              {pickedPlaces.data.length > 0
                ? `고른 장소 ${String(pickedPlaces.data.length)}곳을 첫째 날에 담아 시작해요.`
                : "고른 장소가 공개가 끝나 담을 수 없어요."}
            </p>
          )}
        </div>
      )}

      <TripSetupForm
        onSubmit={onSubmit}
        defaultDate={visitDate}
        defaultDays={courseDays}
        defaultSiguns={defaultSiguns}
      />

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>저장하지 않은 코스가 있어요</AlertDialogTitle>
            <AlertDialogDescription>
              「{existing?.title}」 코스를 아직 저장하지 않았어요. 새로 만들면 작성 중이던 내용은
              사라져요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                void navigate(paths.tripDraft);
              }}
            >
              작성 중인 코스 열기
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) start(pending.draft, pending.notice);
              }}
            >
              새로 만들기
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
  if (isPending) return <Skeleton className="h-16 w-full rounded-lg" />;
  if (isError || !festival) {
    return (
      <div className="bg-background-subtle text-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 text-sm">
        <p>축제 정보를 불러오지 못했어요.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      </div>
    );
  }
  return (
    <div className="bg-background-subtle text-foreground flex flex-col gap-1 rounded-lg p-4 text-sm">
      <p className="font-medium">{festival.name}</p>
      <p className="text-muted-foreground">
        {festival.state === "cancelled"
          ? "취소된 축제라 코스에 담지 않아요."
          : visitDate
            ? `${formatDateKo(visitDate)} 방문을 그날 일차에 담아요. 방문일이 여행 기간 밖이면 미배치 후보로 들어가요.`
            : "방문일이 정해지지 않아 축제를 담지 않아요. 축제 상세에서 방문일을 골라 주세요."}
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
  if (notFound) {
    return (
      <div className="bg-background-subtle text-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 text-sm">
        <div className="flex flex-col gap-1">
          <p className="font-medium">찾을 수 없는 코스예요</p>
          <p className="text-muted-foreground">
            공개가 끝났거나 주소가 잘못됐어요. 아래에서 빈 코스로 시작할 수 있어요.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={paths.creators}>추천 코스 보기</Link>
        </Button>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="bg-background-subtle text-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 text-sm">
        <p>코스 정보를 불러오지 못했어요.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      </div>
    );
  }
  if (isPending || !course) return <Skeleton className="h-16 w-full rounded-lg" />;
  return (
    <div className="bg-background-subtle text-foreground flex flex-col gap-1 rounded-lg p-4 text-sm">
      <p className="font-medium">{course.title}</p>
      <p className="text-muted-foreground">
        {`${course.creator.name}의 ${String(courseDayCount(course))}일 코스를 내 코스로 가져와요. 여행 기간이 더 짧으면 넘치는 일차의 장소는 미배치 후보로 들어가요.`}
      </p>
    </div>
  );
}
