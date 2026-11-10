// 지도 옆 "검색" 탭 — 찾은 장소를 지도 위 후보 마커로 보여 주고, 마커·목록에서 골라 이 일차에 담는다.
// "내 경로 근처"를 켜면 그날 방문지가 있는 지역들을 모두 읽어 경로에서 반경 안의 후보만 가까운 순으로 보여 준다.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";
import { paths as routes } from "@/app/paths";
import { CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  dayLabel: string;
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
  dayLabel,
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
          {...{ filters, visits, points, paths, dayIndex, dayLabel, addedIds, update }}
        />
      ) : (
        <PlaceFeeds queries={queries} fetchAll={nearOn}>
          {(feeds) => (
            <SearchBody
              feeds={feeds}
              nearKm={nearOn ? radiusKm : null}
              {...{ filters, visits, points, paths, dayIndex, dayLabel, addedIds, update }}
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
  added: boolean;
}

function SearchBody({
  feeds,
  nearKm,
  filters,
  visits,
  points,
  paths,
  dayIndex,
  dayLabel,
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
  dayLabel: string;
  addedIds: Set<string>;
  update: (edit: TripEdit) => void;
}) {
  const { t, i18n } = useTranslation("planner");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const pending = feeds.some((f) => f.pending);
  const failed = feeds.filter((f) => f.error);
  const loadingMore = feeds.some((f) => f.loadingMore);
  const more = feeds.find((f) => f.hasMore);

  const lines = useMemo(() => routeLines(visits, paths), [visits, paths]);
  const all = feeds.flatMap((f) => f.places);
  const rows: Row[] = (
    nearKm === null
      ? all.map((place) => ({
          place,
          km: place.location && lines.length > 0 ? distanceToRouteKm(place.location, lines) : null,
        }))
      : nearRoute(all, lines, nearKm).map(({ item, km }) => ({ place: item, km }))
  )
    .map((r) => ({ ...r, added: addedIds.has(r.place.id) }))
    // 이미 담은 곳은 경로 위(0km)라 맨 위로 오므로 뒤로 보낸다
    .sort((a, b) => Number(a.added) - Number(b.added));

  const nameOf = (p: Place) => placeText(p, i18n.language).name;
  const categoryOf = (p: Place) => t(`placeCategory.${p.category}`, { ns: "common" });
  const fresh: CourseMapCandidate[] = rows.flatMap(({ place, added }) =>
    place.location && !added
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
  const onSelectCandidate = useCallback((id: string) => {
    setSelectedId(id);
    listRef.current
      ?.querySelector(`[data-place="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, []);
  const selected = rows.find((r) => r.place.id === selectedId);

  const add = (place: Place) => {
    update((trip) => addItemsToDay(trip, dayIndex, [visitFromPlace(place)]).trip);
    toast(t("addPlace.added", { name: nameOf(place), day: dayLabel }));
  };
  const distanceText = (km: number | null) =>
    km === null ? null : t("routeSearch.fromRoute", { km: Math.max(0.1, km).toFixed(1) });

  return (
    <>
      <div className="relative h-56 shrink-0 lg:h-64">
        <CourseMap
          points={points}
          paths={paths}
          candidates={candidates}
          selectedCandidateId={selectedId}
          onSelectCandidate={onSelectCandidate}
          className="h-full"
        />
        {selected && (
          <div className="bg-background text-foreground absolute inset-x-2 bottom-2 flex items-center gap-3 rounded-lg p-2 shadow-md">
            <Thumb photo={selected.place.photos[0]} />
            <div className="flex min-w-0 flex-1 flex-col">
              <Link
                to={routes.placeDetail(selected.place.id)}
                className="truncate text-sm font-medium underline-offset-4 hover:underline"
              >
                {nameOf(selected.place)}
              </Link>
              <span className="text-muted-foreground truncate text-xs">
                {[categoryOf(selected.place), distanceText(selected.km)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <Button
              size="sm"
              variant={selected.added ? "ghost" : "default"}
              disabled={selected.added}
              onClick={() => {
                add(selected.place);
              }}
            >
              {selected.added ? t("addPlace.addedShort") : t("routeSearch.addToDay")}
            </Button>
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
        )}
      </div>

      {pending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : failed.length > 0 && rows.length === 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-destructive text-sm">{t("addPlace.error")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              for (const f of failed) f.retry();
            }}
          >
            {t("retry", { ns: "common" })}
          </Button>
        </div>
      ) : rows.length === 0 && !loadingMore ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          {nearKm !== null
            ? t("routeSearch.emptyNear", { km: nearKm })
            : filters.q
              ? t("addPlace.emptyQuery", { q: filters.q })
              : t("addPlace.empty")}
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <ul
            ref={listRef}
            className="border-border flex min-h-0 flex-col overflow-y-auto rounded-md border"
          >
            {rows.map(({ place, km, added }) => (
              <li
                key={place.id}
                data-place={place.id}
                className={cn(
                  "border-border flex items-center gap-2 border-b px-2 py-2 last:border-b-0",
                  place.id === selectedId && "bg-background-subtle",
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left"
                  aria-pressed={place.id === selectedId}
                  aria-label={t("routeSearch.showOnMap", { name: nameOf(place) })}
                  onClick={() => {
                    setSelectedId(place.id);
                  }}
                >
                  <Thumb photo={place.photos[0]} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{nameOf(place)}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {[
                        t(`sigun.${place.sigun}`, { ns: "common" }),
                        categoryOf(place),
                        distanceText(km),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
                <Button
                  size="sm"
                  variant={added ? "ghost" : "outline"}
                  disabled={added}
                  onClick={() => {
                    add(place);
                  }}
                >
                  {added ? t("addPlace.addedShort") : t("addPlace.add")}
                </Button>
              </li>
            ))}
          </ul>
          {failed.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-destructive text-sm">{t("routeSearch.partialError")}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  for (const f of failed) f.retry();
                }}
              >
                {t("retry", { ns: "common" })}
              </Button>
            </div>
          )}
          {loadingMore && !more && (
            <p className="text-muted-foreground text-center text-xs">{t("addPlace.loading")}</p>
          )}
          {more && (
            <Button variant="ghost" size="sm" disabled={loadingMore} onClick={more.loadMore}>
              {loadingMore ? t("addPlace.loading") : t("addPlace.more")}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function Thumb({ photo }: { photo: string | undefined }) {
  return photo ? (
    <img src={photo} alt="" loading="lazy" className="size-12 shrink-0 rounded-md object-cover" />
  ) : (
    <div className="bg-background-subtle size-12 shrink-0 rounded-md" />
  );
}
