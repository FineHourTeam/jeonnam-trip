// S09 여행 시작 — 설정 화면 없이 바로 초안을 만들어 코스 편집(S10)으로 보낸다. 날짜·일수는 편집 화면에서 바꾼다.
// 저장은 편집 화면에서 한다 (비회원도 작성 가능, 저장할 때 로그인).
// ?date=&sigun=: 홈에서 고른 날짜·지역으로 시작한다. 없으면 오늘 하루.
// ?festival=&date=(&program=)으로 오면 그 축제 방문을 방문일 일차에 담아 시작한다 (기능명세 §2).
// ?creator=로 오면 크리에이터 코스의 장소·순서를 개인 초안으로 복사한다. 일수는 코스 일수(최대 4일) (기능명세 §5).
// ?places=id1,id2로 오면 장소 목록·상세에서 고른 장소를 첫째 날에 담아 시작한다 (기능명세 §3).
// 여러 개가 함께 오면 축제 → 크리에이터 코스 → 고른 장소 순으로 하나만 쓴다.
// 이 화면은 거쳐 가기만 하므로 편집 화면으로 갈 때 기록을 바꿔치기한다 — 뒤로 가기로 돌아와 초안을 다시 만들지 않게.
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
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
import { MAX_TRIP_DAYS, isSigunCode, type Festival, type TripDraft } from "@/shared/domain";
import { addDays, todayKst } from "@/shared/lib/date";

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
  const built = useRef(false);
  const [params] = useSearchParams();
  const festivalId = params.get("festival");
  const dateParam = params.get("date") ?? "";
  const startDate = DATE_RE.test(dateParam) ? dateParam : todayKst();
  const visitDate = DATE_RE.test(dateParam) ? dateParam : undefined;
  const programId = params.get("program") ?? undefined;
  const sigunParam = params.get("sigun");
  const siguns = sigunParam && isSigunCode(sigunParam) ? [sigunParam] : [];
  const festival = useFestival(festivalId);
  const creatorId = festivalId ? null : params.get("creator");
  const course = useCreatorCourse(creatorId);
  const coursePlaces = useCoursePlaces(course.data);
  // 비공개·없는 코스면 빈 초안으로 시작한다
  const courseNotFound = course.error instanceof CourseNotFoundError;
  const placeIds = festivalId || creatorId ? [] : readPlaceIds(params.get("places"));
  const pickedPlaces = usePlacesByIds(placeIds);

  const failed = festivalId
    ? festival.isError
    : creatorId
      ? !courseNotFound && (course.isError || coursePlaces.isError)
      : placeIds.length > 0 && pickedPlaces.isError;
  const ready = festivalId
    ? festival.isSuccess
    : creatorId
      ? courseNotFound || coursePlaces.isSuccess
      : placeIds.length === 0 || pickedPlaces.isSuccess;

  const start = (draft: TripDraft, notice?: string) => {
    setDraft(draft);
    if (notice) toast(notice);
    void navigate(paths.tripDraft, { replace: true });
  };

  const blankDraft = () =>
    newTripDraft({ startDate, endDate: startDate, siguns, pace: null, origin: { kind: "blank" } });

  const build = (): { draft: TripDraft; notice?: string } => {
    if (festivalId && festival.data) {
      const draft = newTripDraft({
        startDate,
        endDate: startDate,
        siguns,
        pace: null,
        origin: { kind: "festival", festivalId },
      });
      if (festival.data.state === "cancelled") {
        return { draft, notice: "취소된 축제라 코스에 담지 않았어요." };
      }
      if (!visitDate) {
        return {
          draft,
          notice: "방문일이 없어 축제를 담지 않았어요. 축제 상세에서 방문일을 골라 주세요.",
        };
      }
      return { draft: withFestival(draft, festival.data, visitDate, programId) };
    }
    if (creatorId && course.data && coursePlaces.data) {
      const days = Math.min(courseDayCount(course.data), MAX_TRIP_DAYS);
      const base = newTripDraft({
        startDate,
        endDate: addDays(startDate, days - 1),
        siguns: siguns.length > 0 ? siguns : course.data.siguns,
        pace: null,
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
      return {
        draft: trip,
        notice:
          skipped.length > 0 ? `가져오지 못한 장소가 있어요 (${skipped.join(", ")}).` : undefined,
      };
    }
    if (creatorId)
      return { draft: blankDraft(), notice: "찾을 수 없는 코스라 빈 코스로 시작해요." };
    if (pickedPlaces.data && pickedPlaces.data.length > 0) {
      return { draft: addItemsToDay(blankDraft(), 0, pickedPlaces.data.map(visitFromPlace)).trip };
    }
    return { draft: blankDraft() };
  };

  // 필요한 정보를 다 읽으면 한 번만 만든다. 저장 안 한 초안은 조용히 덮어쓰지 않는다
  useEffect(() => {
    if (!ready || built.current) return;
    built.current = true;
    const next = build();
    if (existing) setPending(next);
    else start(next.draft, next.notice);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ready가 된 순간 한 번만 만든다
  }, [ready]);

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-4 px-4 py-10">
      {failed ? (
        <div className="bg-background-subtle text-foreground flex flex-col gap-3 rounded-lg p-4 text-sm">
          <p>
            {festivalId
              ? "축제 정보를 불러오지 못했어요."
              : creatorId
                ? "코스 정보를 불러오지 못했어요."
                : "고른 장소를 불러오지 못했어요."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (festivalId) void festival.refetch();
                else if (course.isError) void course.refetch();
                else if (coursePlaces.isError) void coursePlaces.refetch();
                else void pickedPlaces.refetch();
              }}
            >
              다시 시도
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                built.current = true;
                start(blankDraft());
              }}
            >
              빈 코스로 시작
            </Button>
          </div>
        </div>
      ) : (
        <div aria-busy="true" className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">코스를 준비하고 있어요.</p>
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

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
                void navigate(paths.tripDraft, { replace: true });
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
