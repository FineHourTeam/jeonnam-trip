// S02 축제 목록·달력 — 진행·예정 축제를 한 번 받아 시군(서버)·상태·날짜(화면)로 거른다.
// 달력과 목록은 같은 결과를 쓴다 (기능명세 §2). 조건은 URL 검색 파라미터에 둔다.
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isSigunCode, type Festival } from "@/shared/domain";
import { formatDay, todayKst } from "@/shared/lib/date";
import { FestivalCalendar } from "../components/festival-calendar";
import { FestivalCard } from "../components/festival-card";
import { FestivalFilters, type FestivalFilterValues } from "../components/festival-filters";
import { useFestivals } from "../hooks/use-festivals";
import { festivalDates, filterFestivals } from "../lib/festival-filter";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function readFilter(params: URLSearchParams, today: string): FestivalFilterValues {
  const sigun = params.get("sigun") ?? "";
  const phase = params.get("phase");
  const date = params.get("date") ?? "";
  return {
    sigun: isSigunCode(sigun) ? sigun : null,
    phase: phase === "ongoing" || phase === "upcoming" ? phase : null,
    date: DATE_RE.test(date) && date >= today ? date : null,
  };
}

export default function FestivalListPage() {
  const { t, i18n } = useTranslation("festivals");
  const today = todayKst();
  const [params, setParams] = useSearchParams();
  const filter = readFilter(params, today);
  const view = params.get("view") === "calendar" ? "calendar" : "list";
  const festivals = useFestivals({ sigun: filter.sigun, from: today });

  const base = useMemo(
    () => filterFestivals(festivals.data ?? [], { phase: filter.phase, date: null }, today),
    [festivals.data, filter.phase, today],
  );
  const results = filter.date
    ? filterFestivals(base, { phase: null, date: filter.date }, today)
    : base;

  const update = (next: Record<string, string | null>) => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(next)) {
          if (v) p.set(k, v);
          else p.delete(k);
        }
        return p;
      },
      { replace: true },
    );
  };
  const reset = () => {
    update({ sigun: null, phase: null, date: null });
  };

  const body = (
    <ResultList
      isPending={festivals.isPending}
      isError={festivals.isError}
      onRetry={() => void festivals.refetch()}
      results={results}
      filtered={filter.sigun !== null || filter.phase !== null || filter.date !== null}
      onReset={reset}
      today={today}
    />
  );

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-8">
      <Seo title={t("list.seoTitle")} description={t("list.seoDescription")} />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-balance">{t("list.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("list.intro")}</p>
      </div>

      <FestivalFilters
        values={filter}
        today={today}
        onChange={(next) => {
          update(Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v ?? null])));
        }}
        onReset={reset}
      />

      <Tabs
        value={view}
        onValueChange={(v) => {
          update({ view: v === "calendar" ? v : null });
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium" aria-live="polite">
            {festivals.isSuccess &&
              `${filter.date ? `${formatDay(filter.date, i18n.language)} · ` : ""}${t("list.count", { count: results.length })}`}
          </p>
          <TabsList>
            <TabsTrigger value="list">{t("list.tabList")}</TabsTrigger>
            <TabsTrigger value="calendar">{t("list.tabCalendar")}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="list">{body}</TabsContent>
        <TabsContent value="calendar" className="flex flex-col gap-4">
          <FestivalCalendar
            dates={festivalDates(base)}
            selected={filter.date}
            today={today}
            onSelect={(date) => {
              update({ date });
            }}
          />
          {body}
        </TabsContent>
      </Tabs>
    </section>
  );
}

interface ResultListProps {
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  results: Festival[];
  filtered: boolean;
  onReset: () => void;
  today: string;
}

function ResultList({
  isPending,
  isError,
  onRetry,
  results,
  filtered,
  onReset,
  today,
}: ResultListProps) {
  const { t } = useTranslation("festivals");
  if (isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <AlertTitle>{t("list.errorTitle")}</AlertTitle>
          <AlertDescription>{t("list.errorBody")}</AlertDescription>
        </Alert>
        <Button onClick={onRetry}>{t("retry", { ns: "common" })}</Button>
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="bg-background-subtle text-foreground flex flex-col items-center gap-3 rounded-lg px-4 py-10 text-center">
        <p className="font-medium">{filtered ? t("list.emptyFiltered") : t("list.empty")}</p>
        {filtered && (
          <>
            <p className="text-muted-foreground text-sm">{t("list.emptyHint")}</p>
            <Button variant="outline" onClick={onReset}>
              {t("filters.reset")}
            </Button>
          </>
        )}
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {results.map((f) => (
        <li key={f.id}>
          <FestivalCard festival={f} today={today} />
        </li>
      ))}
    </ul>
  );
}
