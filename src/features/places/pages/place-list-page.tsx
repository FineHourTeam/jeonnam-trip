// S04 장소 목록 — 지역·종류·세부 종류·검색어(서버 조회)로 거르고 이름순으로 한 페이지씩 받는다 (1,000곳이 넘어 한 번에 받지 않는다).
// 고른 장소는 필터를 바꿔도 유지하고, 아래 막대에서 작성 중인 코스의 일차에 한꺼번에 담는다 (기능명세 §3).
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlaceListQuery } from "../api/places-api";
import { PlaceAddToTrip } from "../components/place-add-to-trip";
import { PlaceCard } from "../components/place-card";
import { PlaceFilters } from "../components/place-filters";
import { usePlaceSelectionStore } from "../hooks/use-place-selection-store";
import { usePlaceCount, usePlaces } from "../hooks/use-places";
import { normalizePlaceFilter, placeFilterParams, readPlaceFilter } from "../lib/place-filter";

const EMPTY: PlaceListQuery = { sigun: null, categories: [], subcategories: [], q: "" };

export default function PlaceListPage() {
  const { t, i18n } = useTranslation("places");
  const [params, setParams] = useSearchParams();
  const filter = readPlaceFilter(params);
  const places = usePlaces(filter);
  const count = usePlaceCount(filter);
  const selected = usePlaceSelectionStore((s) => s.selected);
  const toggle = usePlaceSelectionStore((s) => s.toggle);
  const clear = usePlaceSelectionStore((s) => s.clear);

  const update = (next: Partial<PlaceListQuery>) => {
    const merged = { ...filter, ...next };
    const normalized = normalizePlaceFilter(merged);
    // 종류를 바꿔 맞지 않게 된 세부 종류는 풀고 알린다 (기능명세 §3)
    if (normalized.subcategories.length < merged.subcategories.length) {
      toast(t("list.subcategoryCleared"));
    }
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(placeFilterParams(normalized))) {
          if (v) p.set(k, v);
          else p.delete(k);
        }
        return p;
      },
      { replace: true },
    );
  };
  const reset = () => {
    update(EMPTY);
  };
  const filtered = filter.sigun !== null || filter.categories.length > 0 || filter.q !== "";
  const list = places.data?.pages.flatMap((p) => p.places) ?? [];
  const selectedIds = new Set(selected.map((p) => p.id));

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-8">
      <Seo title={t("list.seoTitle")} description={t("list.seoDescription")} />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-balance">{t("list.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("list.intro")}</p>
      </div>

      <PlaceFilters values={filter} onChange={update} onReset={reset} />

      <p className="text-sm font-medium" aria-live="polite">
        {count.isSuccess &&
          t("list.count", {
            count: count.data,
            formatted: count.data.toLocaleString(i18n.language),
          })}
      </p>

      {places.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : places.isError && !places.isFetchNextPageError ? (
        <div className="flex flex-col items-start gap-3">
          <Alert variant="destructive">
            <AlertTitle>{t("list.loadErrorTitle")}</AlertTitle>
            <AlertDescription>{t("error.network")}</AlertDescription>
          </Alert>
          <Button onClick={() => void places.refetch()}>{t("retry", { ns: "common" })}</Button>
        </div>
      ) : list.length === 0 ? (
        <div className="bg-background-subtle text-foreground flex flex-col items-center gap-3 rounded-lg px-4 py-10 text-center">
          <p className="font-medium">{filtered ? t("list.emptyFiltered") : t("list.emptyAll")}</p>
          {filtered && (
            <>
              <p className="text-muted-foreground text-sm">{t("list.emptyHint")}</p>
              <Button variant="outline" onClick={reset}>
                {t("filters.reset")}
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {list.map((p) => (
              <li key={p.id}>
                <PlaceCard
                  place={p}
                  selected={selectedIds.has(p.id)}
                  onToggle={() => {
                    toggle(p);
                  }}
                />
              </li>
            ))}
          </ul>
          {places.isFetchNextPageError && (
            <p className="text-destructive text-sm">{t("list.nextPageError")}</p>
          )}
          {places.hasNextPage && (
            <Button
              variant="outline"
              className="self-center"
              disabled={places.isFetchingNextPage}
              onClick={() => void places.fetchNextPage()}
            >
              {places.isFetchingNextPage ? t("list.loadingMore") : t("list.more")}
            </Button>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="border-border bg-background text-foreground sticky bottom-16 flex flex-col gap-3 rounded-lg border p-4 shadow-md md:bottom-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{t("list.selected", { count: selected.length })}</p>
            <Button variant="ghost" size="sm" onClick={clear}>
              {t("list.clearSelection")}
            </Button>
          </div>
          <PlaceAddToTrip places={selected} onAdded={clear} />
        </div>
      )}
    </section>
  );
}
