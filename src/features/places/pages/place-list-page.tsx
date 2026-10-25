// S04 장소 목록 — 시군·종류(서버) + 상세 필터·검색(불러온 목록에서). 카드/지도 전환, 여러 곳 골라 일정에 담기.
// 필터를 바꿔도 고른 장소는 유지한다. 축제 기준 주변 보기(near)는 직선거리임을 밝힌다 (PLC-01·02·08).
import { useState } from "react";
import { useSearchParams } from "react-router";
import { paths } from "@/app/paths";
import { CloseIcon, FilterIcon, ListIcon, MapIcon, SearchIcon } from "@/components/icons";
import { PageBody, StickyActionBar } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { SigunPickerButton } from "@/components/sigun-picker";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  activeFilterCount,
  matchesPlace,
  PlaceCard,
  PlaceRow,
  sortPlacesByTagMatch,
  useFestival,
  usePlaces,
  type PlaceFilter,
} from "@/features/content";
import { SaveButton } from "@/features/library";
import { CourseMap } from "@/features/map";
import { AddToTripSheet, visitFromPlace } from "@/features/trips";
import { cn } from "@/lib/utils";
import {
  FACT_LABEL,
  isSigunCode,
  PLACE_CATEGORIES,
  PLACE_CATEGORY_LABEL,
  SUBCATEGORIES,
  sigunName,
  type FactKey,
  type Place,
} from "@/shared/domain";
import { formatDistance, straightDistanceM } from "@/shared/lib/format";
import { PlaceFilterSheet } from "../components/place-filter-sheet";

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export default function PlaceListPage() {
  const [params, setParams] = useSearchParams();
  const rawSigun = params.get("sigun") ?? "";
  const rawCat = params.get("category");
  const category = PLACE_CATEGORIES.find((c) => c === rawCat) ?? null;
  const rawSub = params.get("sub");
  const filter: PlaceFilter = {
    sigun: isSigunCode(rawSigun) ? rawSigun : null,
    category,
    // 현재 종류와 맞지 않는 세부 종류는 무시(초기화)한다
    subcategory: category && rawSub && SUBCATEGORIES[category].includes(rawSub) ? rawSub : null,
    moods: list(params.get("moods")),
    purposes: list(params.get("purposes")),
    facts: list(params.get("facts")).filter((f): f is FactKey => f in FACT_LABEL),
    keyword: params.get("q") ?? "",
  };
  const nearId = params.get("near");
  const view = params.get("view") === "map" ? "map" : "list";
  const near = useFestival(nearId ?? undefined);
  const q = usePlaces({ sigun: filter.sigun, category: filter.category });

  const [filterOpen, setFilterOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Map<string, Place>>(new Map());
  const [addOpen, setAddOpen] = useState(false);
  const [mapPick, setMapPick] = useState<string | null>(null);

  function setFilter(next: PlaceFilter) {
    const p = new URLSearchParams(params);
    const put = (k: string, v: string | null) => {
      if (v) p.set(k, v);
      else p.delete(k);
    };
    put("sigun", next.sigun);
    put("category", next.category);
    put(
      "sub",
      next.category && next.subcategory && SUBCATEGORIES[next.category].includes(next.subcategory)
        ? next.subcategory
        : null,
    );
    put("moods", next.moods.join(","));
    put("purposes", next.purposes.join(","));
    put("facts", next.facts.join(","));
    put("q", next.keyword.trim() ? next.keyword : null);
    setParams(p, { replace: true });
  }

  const loaded = q.data?.pages.flatMap((pg) => pg.items) ?? [];
  const origin = near.data?.location ?? null;
  const distanceOf = (p: Place) =>
    origin && p.location ? straightDistanceM(origin, p.location) : null;
  let results = sortPlacesByTagMatch(
    loaded.filter((p) => matchesPlace(p, filter)),
    filter,
  );
  if (origin)
    results = [...results].sort(
      (a, b) => (distanceOf(a) ?? Infinity) - (distanceOf(b) ?? Infinity),
    );
  const moreAvailable = q.hasNextPage;
  const filters = activeFilterCount(filter);
  const summary = [
    filter.sigun ? sigunName(filter.sigun) : "전남",
    filter.category ? PLACE_CATEGORY_LABEL[filter.category] : null,
    filter.subcategory,
    ...filter.moods,
    ...filter.purposes,
    filter.keyword.trim() ? `"${filter.keyword.trim()}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function toggleSelect(p: Place, on: boolean) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (on) next.set(p.id, p);
      else next.delete(p.id);
      return next;
    });
  }

  const selectedList = [...selected.values()];
  const mapPicked = results.find((p) => p.id === mapPick) ?? null;

  return (
    <PageBody
      width="xl"
      className={cn(
        "gap-4 pt-5 md:pt-8",
        selecting && selected.size > 0 ? "pb-44 md:pb-28" : "pb-8",
      )}
    >
      <Seo
        title="전남 장소"
        description="전남 시군별 카페·식당·관광지를 분위기와 목적으로 찾아보세요."
      />
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">장소</h1>
          <p className="text-muted-foreground truncate text-sm" aria-live="polite">
            {q.isPending
              ? "불러오는 중..."
              : `${summary} · ${String(results.length)}곳${moreAvailable ? " (일부 불러옴)" : ""}`}
          </p>
        </div>
        <Button
          variant={selecting ? "default" : "outline"}
          size="touch"
          onClick={() => {
            setSelecting((v) => !v);
          }}
          aria-pressed={selecting}
        >
          {selecting ? "선택 끝내기" : "여러 곳 고르기"}
        </Button>
      </div>

      {near.data ? (
        <div className="bg-primary-soft text-primary-soft-foreground flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm">
          <span>
            <strong>{near.data.name}</strong> 가까운 순 (직선거리)
          </span>
          <Button
            variant="ghost"
            size="icon-touch"
            aria-label="축제 기준 정렬 해제"
            onClick={() => {
              const p = new URLSearchParams(params);
              p.delete("near");
              setParams(p, { replace: true });
            }}
          >
            <CloseIcon size="sm" />
          </Button>
        </div>
      ) : null}

      <InputGroup className="h-12 rounded-xl">
        <InputGroupAddon>
          <SearchIcon size="sm" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder="장소 이름·동네·분위기로 찾기"
          aria-label="장소 검색"
          value={filter.keyword}
          onChange={(e) => {
            setFilter({ ...filter, keyword: e.target.value });
          }}
        />
      </InputGroup>

      <div className="-mx-4 flex scrollbar-none items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <Toggle
          variant="chip"
          size="chip"
          pressed={filters > 0}
          onPressedChange={() => {
            setFilterOpen(true);
          }}
          className="shrink-0"
          aria-label={`상세 필터${filters > 0 ? ` ${String(filters)}개 적용 중` : ""}`}
        >
          <FilterIcon size="sm" />
          필터{filters > 0 ? ` ${String(filters)}` : ""}
        </Toggle>
        <SigunPickerButton
          value={filter.sigun}
          onChange={(v) => {
            setFilter({ ...filter, sigun: v });
          }}
        />
        <ToggleGroup
          type="single"
          variant="chip"
          size="chip"
          value={filter.category ?? "all"}
          onValueChange={(v) => {
            if (v)
              setFilter({
                ...filter,
                category: v === "all" ? null : (v as Place["category"]),
                subcategory: null,
              });
          }}
          aria-label="장소 종류"
          className="flex-nowrap"
        >
          <ToggleGroupItem value="all">전체</ToggleGroupItem>
          {PLACE_CATEGORIES.map((c) => (
            <ToggleGroupItem key={c} value={c}>
              {PLACE_CATEGORY_LABEL[c]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {q.isPending ? (
        <CardGridSkeleton count={8} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : results.length === 0 ? (
        <EmptyState
          title={`${summary}에 맞는 장소가 없어요`}
          description={
            moreAvailable
              ? "아직 불러오지 않은 장소가 있어요. 더 불러오거나 조건을 바꿔 보세요."
              : "조건을 바꿔 보세요."
          }
          action={
            <Button
              variant="outline"
              size="touch"
              onClick={() => {
                setParams(new URLSearchParams(nearId ? { near: nearId } : {}), { replace: true });
              }}
            >
              조건 초기화
            </Button>
          }
        />
      ) : view === "map" ? (
        <div className="flex flex-col gap-3">
          <CourseMap
            stops={results.map((p, i) => ({
              id: p.id,
              label: String(i + 1),
              name: p.name,
              location: p.location,
            }))}
            legs={[]}
            selectedId={mapPick}
            onSelect={setMapPick}
            className="h-[60vh] w-full"
            fallbackQuery={summary}
          />
          {mapPicked ? (
            <div className="border-border rounded-xl border p-3">
              <PlaceRow
                place={mapPicked}
                note={
                  distanceOf(mapPicked) !== null
                    ? `축제에서 직선 ${formatDistance(distanceOf(mapPicked) ?? 0)}`
                    : undefined
                }
                trailing={<SaveButton placeId={mapPicked.id} placeName={mapPicked.name} />}
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              지도의 번호를 누르면 장소를 볼 수 있어요. 번호는 목록 순서예요.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((p) => {
            const d = distanceOf(p);
            return (
              <PlaceCard
                key={p.id}
                place={p}
                note={d !== null ? `축제에서 직선 ${formatDistance(d)}` : undefined}
                action={selecting ? undefined : <SaveButton placeId={p.id} placeName={p.name} />}
                selectable={selecting}
                selected={selected.has(p.id)}
                onSelectedChange={(v) => {
                  toggleSelect(p, v);
                }}
              />
            );
          })}
        </div>
      )}

      {moreAvailable ? (
        <Button
          variant="outline"
          size="touch"
          className="self-center"
          disabled={q.isFetchingNextPage}
          onClick={() => void q.fetchNextPage()}
        >
          {q.isFetchingNextPage ? "불러오는 중..." : "장소 더 불러오기"}
        </Button>
      ) : null}

      {!selecting ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center md:bottom-8">
          <Button
            size="touch"
            className="pointer-events-auto rounded-full shadow-lg"
            onClick={() => {
              const p = new URLSearchParams(params);
              if (view === "map") p.delete("view");
              else p.set("view", "map");
              setParams(p, { replace: true });
            }}
          >
            {view === "map" ? <ListIcon size="sm" /> : <MapIcon size="sm" />}
            {view === "map" ? "목록 보기" : "지도 보기"}
          </Button>
        </div>
      ) : null}

      {selecting && selected.size > 0 ? (
        <StickyActionBar
          overTabBar
          className="md:bg-background/95 md:fixed md:inset-x-0 md:bottom-0 md:border-t md:px-4"
        >
          <Button
            variant="outline"
            size="xl"
            onClick={() => {
              setSelected(new Map());
            }}
          >
            선택 해제
          </Button>
          <Button
            size="xl"
            className="flex-1"
            onClick={() => {
              setAddOpen(true);
            }}
          >
            {selected.size}곳 일정에 담기
          </Button>
        </StickyActionBar>
      ) : null}

      <PlaceFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filter={filter}
        onChange={setFilter}
        resultCount={results.length}
      />
      <AddToTripSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        items={selectedList.map(visitFromPlace)}
        newTripHref={`${paths.tripNew}?places=${selectedList.map((p) => p.id).join(",")}`}
        onAdded={() => {
          setSelected(new Map());
          setSelecting(false);
        }}
      />
    </PageBody>
  );
}
