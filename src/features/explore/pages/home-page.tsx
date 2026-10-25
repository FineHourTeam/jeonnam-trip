// S01 탐색 홈 — 지역·기간 → 여행 만들기 → 이 기간 축제(없으면 같은 지역 장소) → 가볼 만한 곳 → 크리에이터 코스.
// 가짜 인기 수치를 쓰지 않는다. 선택한 지역·기간은 주소(쿼리)에 남겨 뒤로 가기에도 유지한다.
import { Link, useSearchParams } from "react-router";
import { paths } from "@/app/paths";
import { ArrowRightIcon, FestivalIcon, RouteIcon } from "@/components/icons";
import { PageBody, Rail, RailItem, SectionHeader } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { SigunPickerButton } from "@/components/sigun-picker";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  CourseCard,
  FestivalCard,
  PlaceCard,
  useCreatorCourses,
  useFestivals,
  usePlaces,
  usePlacesByIds,
} from "@/features/content";
import { SaveButton } from "@/features/library";
import { isSigunCode, PLACE_CATEGORY_LABEL, sigunName, type PlaceCategory } from "@/shared/domain";
import { addDays, formatPeriodKo, monthRange, todayKst } from "@/shared/lib/date";

type Period = "soon" | "month" | "next";

function periodRange(p: Period, today: string) {
  if (p === "month") return { from: today, to: monthRange(today).to };
  if (p === "next") {
    const next = addDays(monthRange(today).to, 1);
    return monthRange(next);
  }
  return { from: today, to: addDays(today, 13) };
}

const PERIOD_LABEL: Record<Period, string> = {
  soon: "앞으로 2주",
  month: "이번 달",
  next: "다음 달",
};
const PICK_CATEGORIES: PlaceCategory[] = ["attraction", "cafe", "restaurant"];
const rank = (c: PlaceCategory) =>
  PICK_CATEGORIES.includes(c) ? PICK_CATEGORIES.indexOf(c) : PICK_CATEGORIES.length;

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const rawSigun = params.get("sigun") ?? "";
  const sigun = isSigunCode(rawSigun) ? rawSigun : null;
  const period =
    (["soon", "month", "next"] as const).find((p) => p === params.get("period")) ?? "soon";
  const rawCat = params.get("category");
  const category = PICK_CATEGORIES.find((c) => c === rawCat) ?? null;
  const today = todayKst();
  const range = periodRange(period, today);

  const festivals = useFestivals({ ...range, sigun });
  const places = usePlaces({ sigun, category });
  const courses = useCreatorCourses();
  const visibleCourses = (courses.data ?? [])
    .filter((c) => !sigun || c.siguns.includes(sigun))
    .slice(0, 8);
  const coverIds = visibleCourses.flatMap((c) => c.days[0]?.items[0]?.placeId ?? []);
  const covers = usePlacesByIds(coverIds);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const placeList = (places.data?.pages.flatMap((p) => p.items) ?? [])
    .filter((p) => p.category !== "lodging")
    // 탐색 첫 화면은 관광지부터, 같은 종류 안에서는 사진 있는 곳부터
    .sort(
      (a, b) =>
        rank(a.category) - rank(b.category) ||
        Number(b.photos.length > 0) - Number(a.photos.length > 0),
    )
    .slice(0, 6);
  const regionLabel = sigun ? sigunName(sigun) : "전남";
  // 취소된 축제도 볼 수는 있지만 탐색에서는 뒤로 보낸다
  const visibleFestivals = [...(festivals.data ?? [])].sort(
    (a, b) => Number(a.state === "cancelled") - Number(b.state === "cancelled"),
  );

  return (
    <PageBody width="xl" className="gap-10 pt-5 pb-8 md:pt-8">
      <Seo
        title="전남 축제·장소로 여행 일정 만들기"
        description="전남 축제와 가고 싶은 곳을 모아 영업시간과 자동차 이동시간에 맞춘 여행 일정을 만들어요."
      />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-sm">전남 축제와 가고 싶은 곳으로</p>
          <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
            어디로 떠날까요?
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SigunPickerButton
            value={sigun}
            onChange={(v) => {
              setParam("sigun", v);
            }}
          />
          <ToggleGroup
            type="single"
            variant="chip"
            size="chip"
            value={period}
            onValueChange={(v) => {
              if (v) setParam("period", v === "soon" ? null : v);
            }}
            aria-label="기간"
            className="flex-wrap"
          >
            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
              <ToggleGroupItem key={p} value={p}>
                {PERIOD_LABEL[p]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <Link
          to={paths.tripNew + (sigun ? `?sigun=${sigun}` : "")}
          className="border-border hover:bg-background-subtle flex items-center gap-4 rounded-xl border p-4 transition-colors"
        >
          <span className="bg-primary-soft text-primary-soft-foreground flex size-12 shrink-0 items-center justify-center rounded-xl">
            <RouteIcon />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold">{regionLabel} 여행 만들기</span>
            <span className="text-muted-foreground text-sm text-pretty">
              날짜와 지역을 고르면 영업시간과 이동시간을 맞춘 일정을 만들어요.
            </span>
          </span>
          <ArrowRightIcon className="text-muted-foreground shrink-0" />
        </Link>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="home-festivals">
        <SectionHeader
          title={`${PERIOD_LABEL[period]} 축제`}
          description={`${formatPeriodKo(range.from, range.to)} · ${regionLabel}`}
          to={`${paths.festivals}?from=${range.from}&to=${range.to}${sigun ? `&sigun=${sigun}` : ""}`}
        />
        {festivals.isPending ? (
          <Rail label="축제 불러오는 중">
            {[0, 1, 2].map((i) => (
              <RailItem key={i}>
                <Skeleton className="aspect-4/3 w-full rounded-xl" />
              </RailItem>
            ))}
          </Rail>
        ) : festivals.isError ? (
          <ErrorState error={festivals.error} onRetry={() => void festivals.refetch()} />
        ) : visibleFestivals.length === 0 ? (
          <EmptyState
            icon={<FestivalIcon />}
            title={`${formatPeriodKo(range.from, range.to)} · ${regionLabel} 축제가 없어요`}
            description="대신 아래에서 이 지역의 가볼 만한 곳을 둘러보세요."
            className="border-border border py-8"
          />
        ) : (
          <Rail label="축제">
            {visibleFestivals.map((f) => (
              <RailItem key={f.id}>
                <FestivalCard festival={f} />
              </RailItem>
            ))}
          </Rail>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="home-places">
        <SectionHeader
          title="가볼 만한 곳"
          description={regionLabel}
          to={`${paths.places}${sigun ? `?sigun=${sigun}` : ""}`}
        />
        <ToggleGroup
          type="single"
          variant="chip"
          size="chip"
          value={category ?? "all"}
          onValueChange={(v) => {
            if (v) setParam("category", v === "all" ? null : v);
          }}
          aria-label="장소 종류"
          className="-mx-4 w-auto scrollbar-none flex-nowrap overflow-x-auto px-4 md:mx-0 md:px-0"
        >
          <ToggleGroupItem value="all">전체</ToggleGroupItem>
          {PICK_CATEGORIES.map((c) => (
            <ToggleGroupItem key={c} value={c}>
              {PLACE_CATEGORY_LABEL[c]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {places.isPending ? (
          <CardGridSkeleton count={6} />
        ) : places.isError ? (
          <ErrorState error={places.error} onRetry={() => void places.refetch()} />
        ) : placeList.length === 0 ? (
          <EmptyState
            title={`${regionLabel}에 등록된 장소가 아직 없어요`}
            description="다른 지역을 골라 보세요."
            action={
              sigun ? (
                <Button
                  variant="outline"
                  size="touch"
                  onClick={() => {
                    setParam("sigun", null);
                  }}
                >
                  전남 전체 보기
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
            {placeList.map((p) => (
              <PlaceCard
                key={p.id}
                place={p}
                action={<SaveButton placeId={p.id} placeName={p.name} />}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="home-courses">
        <SectionHeader
          title="크리에이터 코스"
          description="운영팀이 원문과 장소를 확인한 코스예요"
          to={paths.creators}
        />
        {courses.isPending ? (
          <Rail label="코스 불러오는 중">
            {[0, 1].map((i) => (
              <RailItem key={i}>
                <Skeleton className="aspect-4/3 w-full rounded-xl" />
              </RailItem>
            ))}
          </Rail>
        ) : courses.isError ? (
          <ErrorState error={courses.error} onRetry={() => void courses.refetch()} />
        ) : visibleCourses.length === 0 ? (
          <EmptyState
            title={`${regionLabel} 크리에이터 코스가 아직 없어요`}
            className="border-border border py-8"
          />
        ) : (
          <Rail label="크리에이터 코스">
            {visibleCourses.map((c) => (
              <RailItem key={c.id}>
                <CourseCard
                  course={c}
                  cover={covers.data?.find((p) => p.id === c.days[0]?.items[0]?.placeId)?.photos[0]}
                />
              </RailItem>
            ))}
          </Rail>
        )}
      </section>
    </PageBody>
  );
}
