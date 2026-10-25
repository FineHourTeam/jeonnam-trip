// S02 축제 목록·달력 — 시군·기간·진행 상태로 조회. 목록과 달력은 같은 조회 결과(같은 조건)를 쓴다 (FES-01·02).
// 조건은 주소 쿼리에 둔다: 뒤로 가기·공유에도 유지.
import { useSearchParams } from "react-router";
import { ko } from "react-day-picker/locale";
import { CalendarIcon, FestivalIcon, ListIcon } from "@/components/icons";
import { PageBody } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { SigunPickerButton } from "@/components/sigun-picker";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FestivalCard, festivalPhase, useFestivals } from "@/features/content";
import { isSigunCode, sigunName, type Festival } from "@/shared/domain";
import {
  addDays,
  dateRange,
  formatDateKo,
  formatPeriodKo,
  monthRange,
  todayKst,
} from "@/shared/lib/date";

function toDate(ymd: string): Date {
  const [y = 0, m = 1, d = 1] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fromDate(d: Date): string {
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function FestivalGrid({ items }: { items: Festival[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((f) => (
        <FestivalCard key={f.id} festival={f} />
      ))}
    </div>
  );
}

export default function FestivalListPage() {
  const [params, setParams] = useSearchParams();
  const today = todayKst();
  const rawSigun = params.get("sigun") ?? "";
  const sigun = isSigunCode(rawSigun) ? rawSigun : null;
  const view = params.get("view") === "calendar" ? "calendar" : "list";
  const phase = (["ongoing", "upcoming"] as const).find((p) => p === params.get("phase")) ?? "all";
  const isYmd = (v: string | null): v is string => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));
  const fromParam = params.get("from");
  const toParam = params.get("to");
  const from = isYmd(fromParam) ? fromParam : today;
  const to = isYmd(toParam) && toParam >= from ? toParam : addDays(from, 59);
  const monthParam = params.get("month");
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : today.slice(0, 7);
  const monthR = monthRange(`${month}-01`);
  const dayParam = params.get("date");
  const selectedDay = isYmd(dayParam) && dayParam.startsWith(month) ? dayParam : null;

  const range = view === "calendar" ? monthR : { from, to };
  const q = useFestivals({ ...range, sigun });

  function patch(next: Record<string, string | null>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    setParams(p, { replace: true });
  }

  const matched = (q.data ?? []).filter(
    (f) => phase === "all" || festivalPhase(f, today) === phase,
  );
  const onDay = (d: string) => matched.filter((f) => f.startDate <= d && f.endDate >= d);
  const festivalDays =
    view === "calendar"
      ? dateRange(monthR.from, monthR.to).filter((d) =>
          onDay(d).some((f) => f.state !== "cancelled"),
        )
      : [];
  const dayList = selectedDay ? onDay(selectedDay) : matched;
  const regionLabel = sigun ? sigunName(sigun) : "전남";
  const periodLabel =
    view === "calendar" ? `${String(Number(month.slice(5)))}월` : formatPeriodKo(from, to);
  const hasCondition = sigun !== null || phase !== "all" || Boolean(fromParam) || Boolean(toParam);

  return (
    <PageBody width="xl" className="gap-5 pt-5 pb-8 md:pt-8">
      <Seo title="전남 축제" description="전남 시군별 축제를 기간·진행 상태로 찾아보세요." />
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">축제</h1>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {q.isPending
              ? "불러오는 중..."
              : `${regionLabel} · ${periodLabel} · ${String(dayList.length)}개`}
          </p>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={view}
          onValueChange={(v) => {
            if (v) patch({ view: v === "list" ? null : v, date: null });
          }}
          aria-label="보기 방식"
        >
          <ToggleGroupItem value="list" aria-label="목록으로 보기" className="h-11 px-3">
            <ListIcon size="sm" />
            목록
          </ToggleGroupItem>
          <ToggleGroupItem value="calendar" aria-label="달력으로 보기" className="h-11 px-3">
            <CalendarIcon size="sm" />
            달력
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="-mx-4 flex scrollbar-none items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <SigunPickerButton
          value={sigun}
          onChange={(v) => {
            patch({ sigun: v });
          }}
        />
        <ToggleGroup
          type="single"
          variant="chip"
          size="chip"
          value={phase}
          onValueChange={(v) => {
            if (v) patch({ phase: v === "all" ? null : v });
          }}
          aria-label="진행 상태"
          className="flex-nowrap"
        >
          <ToggleGroupItem value="all">전체</ToggleGroupItem>
          <ToggleGroupItem value="ongoing">진행 중</ToggleGroupItem>
          <ToggleGroupItem value="upcoming">예정</ToggleGroupItem>
        </ToggleGroup>
        {view === "list" ? (
          <ToggleGroup
            type="single"
            variant="chip"
            size="chip"
            value={fromParam || toParam ? "custom" : "default"}
            onValueChange={(v) => {
              if (v === "default") patch({ from: null, to: null });
              if (v === "month") patch({ from: today, to: monthRange(today).to });
              if (v === "next") {
                const n = monthRange(addDays(monthRange(today).to, 1));
                patch({ from: n.from, to: n.to });
              }
            }}
            aria-label="기간"
            className="flex-nowrap"
          >
            <ToggleGroupItem value="default">앞으로 두 달</ToggleGroupItem>
            <ToggleGroupItem value="month">이번 달</ToggleGroupItem>
            <ToggleGroupItem value="next">다음 달</ToggleGroupItem>
          </ToggleGroup>
        ) : null}
      </div>

      {view === "calendar" ? (
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="border-border rounded-xl border p-2 md:w-96 md:shrink-0">
            <Calendar
              mode="single"
              locale={ko}
              month={toDate(`${month}-01`)}
              onMonthChange={(d) => {
                patch({ month: fromDate(d).slice(0, 7), date: null });
              }}
              selected={selectedDay ? toDate(selectedDay) : undefined}
              onSelect={(d) => {
                patch({ date: d ? fromDate(d) : null });
              }}
              modifiers={{ festival: festivalDays.map(toDate) }}
              modifiersClassNames={{ festival: "[&_button]:font-bold [&_button]:text-primary" }}
              className="w-full [--cell-size:--spacing(11)]"
            />
            <p className="text-muted-foreground px-2 pb-1 text-xs">굵은 날짜에 축제가 있어요.</p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h2 className="text-lg font-bold">
              {selectedDay ? formatDateKo(selectedDay) : `${periodLabel} 전체`}
            </h2>
            {q.isPending ? (
              <CardGridSkeleton count={4} />
            ) : q.isError ? (
              <ErrorState error={q.error} onRetry={() => void q.refetch()} />
            ) : dayList.length === 0 ? (
              <EmptyState
                icon={<FestivalIcon />}
                title={`${selectedDay ? formatDateKo(selectedDay) : periodLabel} · ${regionLabel} 축제가 없어요`}
                action={
                  selectedDay ? (
                    <Button
                      variant="outline"
                      size="touch"
                      onClick={() => {
                        patch({ date: null });
                      }}
                    >
                      이 달 전체 보기
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <FestivalGrid items={dayList} />
            )}
          </div>
        </div>
      ) : q.isPending ? (
        <CardGridSkeleton count={8} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : matched.length === 0 ? (
        <EmptyState
          icon={<FestivalIcon />}
          title={`${periodLabel} · ${regionLabel} 축제가 없어요`}
          description="지역이나 기간을 바꿔 보세요."
          action={
            hasCondition ? (
              <Button
                variant="outline"
                size="touch"
                onClick={() => {
                  setParams(new URLSearchParams(), { replace: true });
                }}
              >
                조건 초기화
              </Button>
            ) : undefined
          }
        />
      ) : (
        <FestivalGrid items={matched} />
      )}
    </PageBody>
  );
}
