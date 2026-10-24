// S09 여행 시작 — 축제(방문일·프로그램)·크리에이터 코스·고른 장소를 이어받아 날짜·지역·방식을 정하고 편집기로 간다.
// 초안은 이 기기에 먼저 보존되고(비회원도 작성 가능), 서버 저장은 편집기의 "저장"에서 한다 (ACC-02).
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { paths } from "@/app/paths";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Notice } from "@/components/detail-parts";
import { FestivalIcon, LockIcon, RouteIcon } from "@/components/icons";
import { PageBody, PageTopBar } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { DetailSkeleton, ErrorState } from "@/components/state-views";
import {
  useCreatorCourse,
  useFestival,
  usePlacesByIds,
  useRegionPlacesFetcher,
} from "@/features/content";
import { TripTooLongError, useTripDraftStore } from "@/features/trips";
import { errorMessage } from "@/lib/errors";
import { isSigunCode, MAX_TRIP_DAYS, sigunName, type Place, type SigunCode, type TripDraft } from "@/shared/domain";
import { addDays, formatDateShort, todayKst } from "@/shared/lib/date";
import { tripLengthLabel } from "@/shared/lib/format";
import { buildStartDraft } from "../lib/start-trip";
import { TripStartForm, type TripStartSubmit } from "../components/trip-start-form";

export default function TripNewPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const festivalId = params.get("festival") ?? undefined;
  const festivalDate = params.get("date") ?? undefined;
  const programId = params.get("program") ?? undefined;
  const creatorId = params.get("creator") ?? undefined;
  const placeIds = (params.get("places") ?? "").split(",").filter(Boolean);
  const qsSigun = params.get("sigun") ?? "";

  const festival = useFestival(festivalId);
  const course = useCreatorCourse(creatorId);
  const courseIds = course.data?.days.flatMap((d) => d.items.map((i) => i.placeId)) ?? [];
  const picked = usePlacesByIds(placeIds);
  const coursePlaces = usePlacesByIds(courseIds);
  const existing = useTripDraftStore((s) => s.draft);
  const setDraft = useTripDraftStore((s) => s.setDraft);
  const [pendingDraft, setPendingDraft] = useState<TripDraft | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchRegionPlaces = useRegionPlacesFetcher();

  const loading = [
    Boolean(festivalId) && festival.isPending,
    Boolean(creatorId) && (course.isPending || (courseIds.length > 0 && coursePlaces.isPending)),
    placeIds.length > 0 && picked.isPending,
  ].some(Boolean);
  const loadError = festival.error ?? course.error ?? picked.error ?? coursePlaces.error;

  if (loading) {
    return (
      <>
        <PageTopBar fallback={paths.home} title="여행 만들기" />
        <DetailSkeleton />
      </>
    );
  }
  if (loadError) {
    return (
      <>
        <PageTopBar fallback={paths.home} title="여행 만들기" />
        <ErrorState
          title="이어 받을 정보를 불러오지 못했어요"
          error={loadError}
          onRetry={() => {
            void festival.refetch();
            void course.refetch();
            void picked.refetch();
          }}
        />
      </>
    );
  }

  const f = festival.data;
  const c = course.data;
  const program = f?.programs.find((p) => p.id === programId);
  const defaultSiguns: SigunCode[] = [
    ...new Set<SigunCode>([
      ...(isSigunCode(qsSigun) ? [qsSigun] : []),
      ...(f ? [f.sigun] : []),
      ...(c?.siguns ?? []),
      ...(picked.data ?? []).map((p) => p.sigun),
    ]),
  ];
  const courseDays = c ? Math.min(c.days.length, MAX_TRIP_DAYS) : 0;
  const defaults = {
    siguns: defaultSiguns,
    ...(f && festivalDate ? { startDate: festivalDate, endDate: festivalDate } : {}),
    ...(c && !festivalDate
      ? { startDate: addDays(todayKst(), 7), endDate: addDays(todayKst(), 7 + courseDays - 1) }
      : {}),
    startMode: placeIds.length > 0 && !f ? ("direct" as const) : ("recommend" as const),
  };

  function finish(draft: TripDraft) {
    setDraft(draft);
    void navigate(paths.tripEdit("draft"), { replace: true });
  }

  function build(v: TripStartSubmit, regionPlaces: Place[]): TripDraft | null {
    try {
      return buildStartDraft({
        ...v,
        festival: f && festivalDate ? { festival: f, date: festivalDate, programId } : undefined,
        course: c ? { course: c, places: coursePlaces.data ?? [] } : undefined,
        picked: picked.data ?? [],
        suggestions: regionPlaces.filter((p) => p.category !== "lodging"),
      });
    } catch (e) {
      setError(e instanceof TripTooLongError ? e.message : "여행을 만들지 못했어요. 입력을 확인해 주세요.");
      return null;
    }
  }

  async function onSubmit(v: TripStartSubmit) {
    setError(null);
    setBuilding(true);
    try {
      // 추천 시작: 고른 지역의 공개 장소를 후보로 불러온다 (크리에이터 복사는 원본만)
      const region = v.startMode === "recommend" && !c ? await fetchRegionPlaces(v.siguns) : [];
      const draft = build(v, region);
      if (!draft) return;
      if (existing) setPendingDraft(draft);
      else finish(draft);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="flex flex-col pb-10">
      <Seo title="여행 만들기" description="날짜와 지역을 고르면 영업시간과 이동시간을 맞춘 일정을 만들어요." noindex />
      <PageTopBar fallback={paths.home} title={c ? "내 여행으로 복사" : "여행 만들기"} />
      <PageBody className="gap-6 pt-5">
        {f ? (
          <div className="border-border flex items-start gap-3 rounded-xl border p-4">
            <span className="bg-primary-soft text-primary-soft-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
              <FestivalIcon size="sm" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 text-sm">
              <span className="font-semibold">{f.name}</span>
              <span className="text-muted-foreground">
                {festivalDate ? `${formatDateShort(festivalDate)} 방문` : "방문일 미정"}
                {program ? (
                  <>
                    {" · "}
                    <LockIcon size="sm" className="inline" /> {program.start}~{program.end} {program.name}
                  </>
                ) : " · 운영시간 안에서 배치"}
              </span>
            </div>
          </div>
        ) : null}
        {c ? (
          <div className="border-border flex items-start gap-3 rounded-xl border p-4">
            <span className="bg-primary-soft text-primary-soft-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
              <RouteIcon size="sm" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 text-sm">
              <span className="font-semibold">{c.title}</span>
              <span className="text-muted-foreground">
                원본 {tripLengthLabel(c.days.length)} · 장소 {String(courseIds.length)}곳 · 원본 순서 그대로 가져와요
              </span>
            </div>
          </div>
        ) : null}
        {(picked.data ?? []).length > 0 ? (
          <div className="border-border flex flex-col gap-2 rounded-xl border p-4 text-sm">
            <span className="font-semibold">고른 장소 {String(picked.data?.length ?? 0)}곳</span>
            <span className="text-muted-foreground">
              {(picked.data ?? []).map((p) => p.name).join(", ")}
            </span>
          </div>
        ) : null}
        {c ? (
          <Notice tone="info">
            기간을 원본({tripLengthLabel(c.days.length)})보다 짧게 고르면 넘치는 일차의 장소는 미배치 후보로 남겨요. 날짜에 맞춰 영업·휴무를 다시 검토해요.
          </Notice>
        ) : null}
        {error ? <Notice tone="destructive" title={error} /> : null}

        <TripStartForm
          defaults={defaults}
          showStartMode={!c}
          mustInclude={f && festivalDate ? festivalDate : undefined}
          submitLabel={c ? "내 여행으로 복사하기" : "여행 만들기"}
          pending={building}
          onSubmit={(v) => {
            void onSubmit(v);
          }}
        />
        {defaultSiguns.length > 0 ? (
          <p className="text-muted-foreground -mt-4 text-center text-xs">
            {defaultSiguns.map(sigunName).join(", ")} 기준으로 골라 두었어요.
          </p>
        ) : null}
      </PageBody>

      <ConfirmDialog
        open={pendingDraft !== null}
        onOpenChange={(v) => {
          if (!v) setPendingDraft(null);
        }}
        title="작성 중인 여행이 있어요"
        description={`저장하지 않은 "${existing?.title ?? ""}" 대신 새 여행을 만들어요. 작성 중이던 내용은 되돌릴 수 없어요.`}
        actionLabel="새로 만들기"
        onAction={() => {
          if (pendingDraft) finish(pendingDraft);
        }}
      />
    </div>
  );
}
