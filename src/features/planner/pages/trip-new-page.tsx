// S09 여행 시작 — 설정을 받아 로그인 전 초안으로 만들고 코스 편집(S10)으로 보낸다.
// 저장은 편집 화면에서 한다 (비회원도 작성 가능, 저장할 때 로그인).
// ?festival=&date=(&program=)으로 오면 그 축제 방문을 방문일 일차에 담아 시작한다 (기능명세 §2).
import { useState } from "react";
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
import { useFestival } from "@/features/festivals";
import {
  addItemsToDay,
  dayIndexOf,
  newTripDraft,
  useTripDraftStore,
  visitFromFestival,
} from "@/features/trips";
import type { Festival, TripDraft } from "@/shared/domain";
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
  const [pending, setPending] = useState<TripDraft | null>(null);
  const [params] = useSearchParams();
  const festivalId = params.get("festival");
  const dateParam = params.get("date") ?? "";
  const visitDate = DATE_RE.test(dateParam) ? dateParam : undefined;
  const programId = params.get("program") ?? undefined;
  const festival = useFestival(festivalId);

  const start = (draft: TripDraft) => {
    setDraft(draft);
    void navigate(paths.tripDraft);
  };

  const onSubmit = (v: TripSetupValues) => {
    let draft: TripDraft;
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
    } else {
      draft = newTripDraft({ ...v, origin: { kind: "blank" } });
    }
    // 저장 안 한 초안을 조용히 덮어쓰지 않는다
    if (existing) setPending(draft);
    else start(draft);
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

      <TripSetupForm onSubmit={onSubmit} defaultDate={visitDate} />

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
                if (pending) start(pending);
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
