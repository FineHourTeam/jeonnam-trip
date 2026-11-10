// 지도 옆 "검색" 탭 — 찾은 장소를 지도 위 이름 마커로 보여 주고, 마커를 누르면 지도 아래 카드에서 고른 일차에 담는다.
// "내 경로 근처"를 켜면 그날 방문지가 있는 지역들을 모두 읽어 경로에서 반경 안의 후보만 보여 준다.
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";
import { paths as routes } from "@/app/paths";
import { CloseIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CourseMap, type CourseMapCandidate, type CourseMapPoint } from "@/features/map";
import { usePlaces, type PlaceListQuery } from "@/features/places";
import { addItemsToDay, visitFromPlace } from "@/features/trips";
import type { LatLng, Place, SigunCode } from "@/shared/domain";
import { placeText } from "@/shared/lib/content-text";
import { cn } from "@/lib/utils";
import type { TripEdit } from "../hooks/use-trip-editor";
import { distanceToRouteKm, nearRoute, routeLines } from "../lib/route-distance";
import { PlaceSearchFilterBar, type PlaceSearchFilters } from "./place-search-panel";

export const NEAR_RADII = [1, 3, 5] as const;
export type NearRadius = (typeof NEAR_RADII)[number];

/** 담을 수 있는 일차 — 배열 순서가 일차 순서 */
export interface SearchDay {
  /** "1일차" */
  label: string;
  /** "1일차 · 11월 10일 (화)" */
  fullLabel: string;
  /** 그 일차에 이미 담긴 등록 장소 */
  placeIds: Set<string>;
}

// ponytail: 근처 모드는 지역마다 이름순 페이지를 끝까지 읽어 거리로 거른다 — 지역당 24×10곳을 넘으면 뒤쪽은 빠진다. 많아지면 geohash 범위 조회로
const NEAR_MAX_PAGES = 10;

interface RouteSearchPanelProps {
  filters: PlaceSearchFilters;
  onFiltersChange: (next: Partial<PlaceSearchFilters>) => void;
  near: boolean;
  onNearChange: (near: boolean) => void;
  radiusKm: NearRadius;
  onRadiusChange: (km: NearRadius) => void;
  /** 그날 방문지가 있는 지역 — null이면 아직 확인 중 */
  routeSiguns: SigunCode[] | null;
  /** 그날 방문지(번호 마커)와 조회된 경로 */
  points: CourseMapPoint[];
  paths: LatLng[][];
  dayIndex: number;
  days: SearchDay[];
  addedIds: Set<string>;
  update: (edit: TripEdit) => void;
}

export function RouteSearchPanel({
  filters,
  onFiltersChange,
  near,
  onNearChange,
  radiusKm,
  onRadiusChange,
  routeSiguns,
  points,
  paths,
  dayIndex,
  days,
  addedIds,
  update,
}: RouteSearchPanelProps) {
  const { t } = useTranslation("planner");
  const visits = useMemo(() => points.flatMap((p) => (p.location ? [p.location] : [])), [points]);
  const nearAvailable = visits.length > 0;
  const nearOn = near && nearAvailable;
  const base = {
    categories: filters.category ? [filters.category] : [],
    subcategories: [],
    q: filters.q,
  };
  // 근처 모드: 방문지 지역들(모르면 전체 지역)을 모두 읽는다. 아니면 고른 지역 한 곳
  const queries: PlaceListQuery[] | null = !nearOn
    ? [{ ...base, sigun: filters.sigun }]
    : routeSiguns === null
      ? null
      : routeSiguns.length > 0
        ? routeSiguns.map((sigun) => ({ ...base, sigun }))
        : [{ ...base, sigun: null }];

  const nearControls = nearAvailable && (
    <>
      <div className="flex items-center gap-2">
        <Switch id={`near-${String(dayIndex)}`} checked={near} onCheckedChange={onNearChange} />
        <Label htmlFor={`near-${String(dayIndex)}`} className="text-sm">
          {t("routeSearch.near")}
        </Label>
      </div>
      {nearOn && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={String(radiusKm)}
          onValueChange={(v) => {
            const km = NEAR_RADII.find((r) => String(r) === v);
            if (km) onRadiusChange(km);
          }}
          aria-label={t("routeSearch.radius")}
        >
          {NEAR_RADII.map((r) => (
            <ToggleGroupItem
              key={r}
              value={String(r)}
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
            >
              {t("routeSearch.radiusKm", { km: r })}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PlaceSearchFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        hideSigun={nearOn}
        extra={nearControls}
      />
      {queries === null ? (
        <SearchBody
          feeds={[{ ...EMPTY_FEED, pending: true }]}
          nearKm={radiusKm}
          {...{ filters, visits, points, paths, dayIndex, days, addedIds, update }}
        />
      ) : (
        <PlaceFeeds queries={queries} fetchAll={nearOn}>
          {(feeds) => (
            <SearchBody
              feeds={feeds}
              nearKm={nearOn ? radiusKm : null}
              {...{ filters, visits, points, paths, dayIndex, days, addedIds, update }}
            />
          )}
        </PlaceFeeds>
      )}
    </div>
  );
}

interface Feed {
  places: Place[];
  pending: boolean;
  error: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  retry: () => void;
}

const EMPTY_FEED: Feed = {
  places: [],
  pending: false,
  error: false,
  hasMore: false,
  loadingMore: false,
  loadMore: () => undefined,
  retry: () => undefined,
};

/** 조회 여러 개(지역마다 하나)를 한 목록으로 — 훅 개수가 바뀌어도 되도록 조회마다 컴포넌트를 하나씩 겹친다 */
function PlaceFeeds({
  queries,
  fetchAll,
  children,
}: {
  queries: PlaceListQuery[];
  fetchAll: boolean;
  children: (feeds: Feed[]) => ReactNode;
}) {
  const [head, ...rest] = queries;
  if (!head) return children([]);
  return (
    <PlaceFeed query={head} fetchAll={fetchAll}>
      {(feed) => (
        <PlaceFeeds queries={rest} fetchAll={fetchAll}>
          {(feeds) => children([feed, ...feeds])}
        </PlaceFeeds>
      )}
    </PlaceFeed>
  );
}

function PlaceFeed({
  query,
  fetchAll,
  children,
}: {
  query: PlaceListQuery;
  fetchAll: boolean;
  children: (feed: Feed) => ReactNode;
}) {
  const places = usePlaces(query);
  const pages = places.data?.pages.length ?? 0;
  const { hasNextPage, isFetching, isError, fetchNextPage } = places;
  // 근처 모드는 거리로 거르기 전에 그 지역을 끝까지 읽는다 (실패하면 멈추고 다시 시도를 기다린다)
  useEffect(() => {
    if (fetchAll && hasNextPage && !isFetching && !isError && pages < NEAR_MAX_PAGES) {
      void fetchNextPage();
    }
  }, [fetchAll, hasNextPage, isFetching, isError, pages, fetchNextPage]);

  return children({
    places: places.data?.pages.flatMap((p) => p.places) ?? [],
    pending: places.isPending,
    error: places.isError,
    hasMore: !fetchAll && places.hasNextPage,
    loadingMore: places.isFetchingNextPage,
    loadMore: () => void places.fetchNextPage(),
    retry: () => void (places.isFetchNextPageError ? places.fetchNextPage() : places.refetch()),
  });
}

interface Row {
  place: Place;
  km: number | null;
}

function SearchBody({
  feeds,
  nearKm,
  filters,
  visits,
  points,
  paths,
  dayIndex,
  days,
  addedIds,
  update,
}: {
  feeds: Feed[];
  /** null = 근처 모드 아님 */
  nearKm: NearRadius | null;
  filters: PlaceSearchFilters;
  visits: LatLng[];
  points: CourseMapPoint[];
  paths: LatLng[][];
  dayIndex: number;
  days: SearchDay[];
  addedIds: Set<string>;
  update: (edit: TripEdit) => void;
}) {
  const { t, i18n } = useTranslation("planner");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 담을 일차 — 고른 장소마다 따로 기억하고, 다른 장소를 고르면 보고 있는 일차로 돌아간다
  const [pick, setPick] = useState<{ id: string | null; day: number }>({ id: null, day: dayIndex });

  const pending = feeds.some((f) => f.pending);
  const failed = feeds.filter((f) => f.error);
  const loadingMore = feeds.some((f) => f.loadingMore);
  const more = feeds.find((f) => f.hasMore);

  const lines = useMemo(() => routeLines(visits, paths), [visits, paths]);
  const all = feeds.flatMap((f) => f.places);
  const rows: Row[] =
    nearKm === null
      ? all.map((place) => ({
          place,
          km: place.location && lines.length > 0 ? distanceToRouteKm(place.location, lines) : null,
        }))
      : nearRoute(all, lines, nearKm).map(({ item, km }) => ({ place: item, km }));

  const nameOf = (p: Place) => placeText(p, i18n.language).name;
  const categoryOf = (p: Place) => t(`placeCategory.${p.category}`, { ns: "common" });
  // 이 일차에 이미 담은 곳은 번호 마커로 보이므로 후보에서 뺀다
  const fresh: CourseMapCandidate[] = rows.flatMap(({ place }) =>
    place.location && !addedIds.has(place.id)
      ? [
          {
            id: place.id,
            label: nameOf(place),
            glyph: categoryOf(place).charAt(0),
            location: place.location,
          },
        ]
      : [],
  );
  // 목록은 렌더마다 새로 만들어지므로 내용이 같으면 같은 배열을 넘겨 지도가 마커를 다시 그리지 않게 한다
  const candidatesKey = fresh.map((c) => `${c.id}:${c.label}`).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- candidatesKey가 fresh 내용을 대표한다
  const candidates = useMemo(() => fresh, [candidatesKey]);
  const selected = rows.find((r) => r.place.id === selectedId);
  const to = pick.id === selectedId && days[pick.day] ? pick.day : dayIndex;
  const targetDay = days[to];

  const add = (place: Place, day: SearchDay) => {
    update((trip) => addItemsToDay(trip, to, [visitFromPlace(place)]).trip);
    toast(t("addPlace.added", { name: nameOf(place), day: day.label }));
  };
  const distanceText = (km: number | null) =>
    km === null ? null : t("routeSearch.fromRoute", { km: Math.max(0.1, km).toFixed(1) });

  // 목록이 없으므로 불러오는 중·실패·빈 결과는 지도 위 작은 안내로, 평소에는 개수 배지로 알린다
  const status = pending ? (
    <Notice aria-busy="true">{t("addPlace.loading")}</Notice>
  ) : failed.length > 0 ? (
    <Notice tone="error">
      {t(candidates.length > 0 ? "routeSearch.partialError" : "addPlace.error")}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          for (const f of failed) f.retry();
        }}
      >
        {t("retry", { ns: "common" })}
      </Button>
    </Notice>
  ) : candidates.length === 0 && !loadingMore ? (
    <Notice>
      {nearKm !== null
        ? t("routeSearch.emptyNear", { km: nearKm })
        : filters.q
          ? t("addPlace.emptyQuery", { q: filters.q })
          : t("addPlace.empty")}
    </Notice>
  ) : (
    <Badge variant="outline" className="bg-background shadow-sm">
      {loadingMore ? t("addPlace.loading") : t("routeSearch.count", { count: candidates.length })}
    </Badge>
  );

  return (
    // 검색 조건 줄을 뺀 나머지를 지도가 채운다 — 부모(탭 내용)가 높이를 정해 주므로 flex-1이 0으로 접히지 않는다
    <div className="relative min-h-64 flex-1">
      <CourseMap
        points={points}
        paths={paths}
        candidates={candidates}
        selectedCandidateId={selectedId}
        onSelectCandidate={setSelectedId}
        className="h-full"
      />
      <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-2 *:pointer-events-auto">
        {status}
        {more && !pending && (
          <Button
            variant="outline"
            size="sm"
            className="bg-background shadow-sm"
            disabled={loadingMore}
            onClick={more.loadMore}
          >
            {loadingMore ? t("addPlace.loading") : t("routeSearch.more")}
          </Button>
        )}
      </div>
      <div className="absolute inset-x-2 bottom-2">
        {selected && targetDay ? (
          <div className="bg-background text-foreground flex flex-col gap-2 rounded-lg p-2 shadow-md">
            <div className="flex items-center gap-3">
              <Thumb photo={selected.place.photos[0]} />
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  to={routes.placeDetail(selected.place.id)}
                  className="truncate text-sm font-medium underline-offset-4 hover:underline"
                >
                  {nameOf(selected.place)}
                </Link>
                <span className="text-muted-foreground truncate text-xs">
                  {[
                    categoryOf(selected.place),
                    t(`sigun.${selected.place.sigun}`, { ns: "common" }),
                    distanceText(selected.km),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={t("close", { ns: "common" })}
                onClick={() => {
                  setSelectedId(null);
                }}
              >
                <CloseIcon size="sm" />
              </Button>
            </div>
            {/* [N일차 ▾][에 추가] — 일차를 눌러 이 여행의 다른 일차로 바꿀 수 있다 */}
            <div className="flex justify-end">
              <Select
                value={String(to)}
                onValueChange={(v) => {
                  setPick({ id: selectedId, day: Number(v) });
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="rounded-r-none"
                  aria-label={t("routeSearch.pickDay")}
                >
                  <SelectValue>{targetDay.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {days.map((d, i) => (
                    <SelectItem key={d.fullLabel} value={String(i)}>
                      {d.fullLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetDay.placeIds.has(selected.place.id) ? (
                <Button size="sm" variant="outline" className="rounded-l-none" disabled>
                  {t("routeSearch.addedToDay", { day: targetDay.label })}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="rounded-l-none"
                  aria-label={t("routeSearch.addToDay", { day: targetDay.label })}
                  onClick={() => {
                    add(selected.place, targetDay);
                  }}
                >
                  {t("routeSearch.addTo")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          candidates.length > 0 && (
            <p className="bg-background text-muted-foreground rounded-md px-3 py-2 text-center text-xs shadow-sm">
              {t("routeSearch.hint")}
            </p>
          )
        )}
      </div>
    </div>
  );
}

function Notice({ tone, className, ...props }: { tone?: "error" } & ComponentProps<"div">) {
  return (
    <div
      role="status"
      className={cn(
        "bg-background flex max-w-full flex-wrap items-center gap-2 rounded-md px-3 py-2 text-sm shadow-sm",
        tone === "error" ? "text-destructive" : "text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function Thumb({ photo }: { photo: string | undefined }) {
  return photo ? (
    <img src={photo} alt="" loading="lazy" className="size-12 shrink-0 rounded-md object-cover" />
  ) : (
    <div className="bg-background-subtle size-12 shrink-0 rounded-md" />
  );
}
