// 일차 하나 — 경고 한 줄·시간표(모바일은 일정/지도 전환, PC는 2단).
import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { ErrorIcon, WarningIcon } from "@/components/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CourseMap, type CourseMapPoint } from "@/features/map";
import { usePlacesByIds } from "@/features/places";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import type { LatLng, TripDay, TripDraft } from "@/shared/domain";
import { formatDay } from "@/shared/lib/date";
import type { TripEdit } from "../hooks/use-trip-editor";
import { useDaySchedule } from "../hooks/use-day-schedule";
import { CONFLICT_KINDS } from "../lib/schedule";
import {
  insertItem,
  moveItem,
  moveItemToDay,
  nudgeArrive,
  nudgeDepart,
  removeItem,
  setItemMemo,
  unpinArrive,
  updateItem,
} from "../lib/trip-edits";
import { AddPlaceDialog } from "./add-place-dialog";
import { LegRow } from "./leg-row";
import { type PlaceSearchFilters } from "./place-search-panel";
import { RouteSearchPanel, type NearRadius, type SearchDay } from "./route-search-panel";
import { StayDialog } from "./stay-dialog";
import { VisitCard } from "./visit-card";

interface DayPanelProps {
  trip: TripDraft;
  day: TripDay;
  dayIndex: number;
  update: (edit: TripEdit) => void;
}

export function DayPanel({ trip, day, dayIndex, update }: DayPanelProps) {
  const { t, i18n } = useTranslation("planner");
  const isDesktop = useMediaQuery("(min-width: 64rem)");
  const { schedule, legs, retryFailed } = useDaySchedule(day);
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // 지도 옆 "검색" 탭 — 조건은 화면 상태로 둬서 장소 추가 창(주소 ?aq= 등)과 섞이지 않게 한다
  const [sideTab, setSideTab] = useState("route");
  const [search, setSearch] = useState<PlaceSearchFilters>({
    q: "",
    category: null,
    sigun: trip.siguns[0] ?? null,
  });
  const [near, setNear] = useState(true);
  const [radiusKm, setRadiusKm] = useState<NearRadius>(3);

  const conflictCount = schedule.items.filter((s) =>
    s.issues.some((i) => CONFLICT_KINDS.has(i.kind)),
  ).length;
  const checkCount = schedule.items.filter((s) =>
    s.issues.some((i) => i.kind !== "route_pending"),
  ).length;
  const nameOf = (id: string) => day.items.find((x) => x.id === id)?.snapshot.name;
  const otherDays = trip.days
    .map((d, index) => ({
      index,
      label: t("dayWithDate", { day: index + 1, date: formatDay(d.date, i18n.language) }),
    }))
    .filter((d) => d.index !== dayIndex);
  // 검색 탭에서 담을 일차 고르기 — 일차마다 이미 담긴 등록 장소를 함께 넘긴다
  const searchDays = useMemo<SearchDay[]>(
    () =>
      trip.days.map((d, index) => ({
        label: t("dayLabel", { day: index + 1 }),
        fullLabel: t("dayWithDate", { day: index + 1, date: formatDay(d.date, i18n.language) }),
        placeIds: new Set(d.items.flatMap((x) => (x.ref.kind === "place" ? [x.ref.placeId] : []))),
      })),
    [trip.days, t, i18n.language],
  );
  const points = useMemo<CourseMapPoint[]>(
    () =>
      day.items.map((x, i) => ({
        id: x.id,
        label: x.snapshot.name,
        order: i + 1,
        location: x.snapshot.location,
      })),
    [day.items],
  );
  const paths_ = useMemo<LatLng[][]>(
    () => legs.flatMap((l) => (l.status === "ok" ? [l.path] : [])),
    [legs],
  );
  const addedIds = useMemo(
    () => new Set(day.items.flatMap((x) => (x.ref.kind === "place" ? [x.ref.placeId] : []))),
    [day.items],
  );
  // 카드 사진 — 사본(snapshot)에는 사진이 없어 등록 장소의 대표 사진을 함께 읽는다. 못 읽어도 카드는 그대로 쓴다
  const placeIds = useMemo(() => [...addedIds].sort(), [addedIds]);
  const placesById = usePlacesByIds(placeIds);
  // "내 경로 근처" 검색 범위 — 그날 담은 등록 장소들의 지역. 모르면(축제·직접 입력만) 여행 지역, 확인 중이면 null
  const routeSiguns = useMemo(() => {
    if (placeIds.length > 0 && !placesById.data && !placesById.isError) return null;
    const found = new Set(
      (placesById.data ?? []).filter((p) => addedIds.has(p.id)).map((p) => p.sigun),
    );
    return found.size > 0 ? [...found] : trip.siguns;
  }, [placeIds.length, placesById.data, placesById.isError, addedIds, trip.siguns]);
  const photoOf = ({ ref }: TripDay["items"][number]) =>
    ref.kind === "place"
      ? placesById.data?.find((p) => p.id === ref.placeId)?.photos[0]
      : undefined;
  const addPlace = (
    <AddPlaceDialog
      dayIndex={dayIndex}
      dayLabel={t("dayLabel", { day: dayIndex + 1 })}
      addedIds={addedIds}
      sigun={trip.siguns[0] ?? null}
      update={update}
    />
  );

  const remove = (itemId: string) => {
    const index = day.items.findIndex((x) => x.id === itemId);
    const item = day.items[index];
    if (!item) return;
    update((trip) => removeItem(trip, dayIndex, itemId));
    toast(t("day.removed", { name: item.snapshot.name }), {
      action: {
        label: t("day.undo"),
        onClick: () => {
          update((trip) => insertItem(trip, dayIndex, index, item));
        },
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 정상이면 아무것도 보이지 않는다 — 충돌·확인 필요(경로 실패 포함)가 있을 때만 한 줄로 알린다 */}
      {conflictCount > 0 ? (
        <p role="status" className="text-destructive flex items-center gap-1 text-sm">
          <ErrorIcon size="sm" />
          {t("day.conflictWarning", { count: conflictCount })}
        </p>
      ) : (
        checkCount > 0 && (
          <p role="status" className="flex items-center gap-1 text-sm">
            <WarningIcon size="sm" />
            {t("day.checkWarning", { count: checkCount })}
          </p>
        )
      )}

      <ToggleGroup
        type="single"
        variant="outline"
        value={view}
        onValueChange={(v) => {
          if (v === "list" || v === "map") setView(v);
        }}
        className="justify-start lg:hidden"
        aria-label={t("day.viewMode")}
      >
        <ToggleGroupItem value="list">{t("day.viewList")}</ToggleGroupItem>
        <ToggleGroupItem value="map">{t("day.viewMap")}</ToggleGroupItem>
      </ToggleGroup>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className={cn("flex flex-col lg:flex-1", view === "map" && "hidden lg:flex")}>
          {day.items.length === 0 ? (
            <div className="border-border flex flex-col gap-2 rounded-lg border border-dashed p-6 text-center text-sm">
              <p>{t("day.empty")}</p>
              <p className="text-muted-foreground">
                <Trans
                  t={t}
                  i18nKey="day.emptyHint"
                  components={{
                    festivals: (
                      <Link
                        to={paths.festivals}
                        className="text-primary underline-offset-4 hover:underline"
                      />
                    ),
                    places: (
                      <Link
                        to={paths.places}
                        className="text-primary underline-offset-4 hover:underline"
                      />
                    ),
                  }}
                />
              </p>
              <div className="mx-auto mt-2 w-full max-w-xs">{addPlace}</div>
            </div>
          ) : (
            day.items.map((item, i) => {
              const scheduled = schedule.items[i];
              if (!scheduled) return null;
              const leg = i > 0 ? legs[i - 1] : undefined;
              return (
                <div key={item.id} className="flex flex-col">
                  {leg && (
                    <LegRow
                      leg={leg}
                      toFixed={item.fixedStart !== undefined}
                      onRetry={retryFailed}
                    />
                  )}
                  <VisitCard
                    order={i + 1}
                    item={item}
                    photo={photoOf(item)}
                    scheduled={scheduled}
                    isFirst={i === 0}
                    isLast={i === day.items.length - 1}
                    otherDays={otherDays}
                    selected={selectedId === item.id}
                    onSelect={() => {
                      setSelectedId(item.id);
                    }}
                    nameOf={nameOf}
                    onEditStay={() => {
                      setEditingId(item.id);
                    }}
                    onSetStay={(stayMin) => {
                      update((trip) =>
                        updateItem(trip, dayIndex, item.id, { stayMin, stayLocked: true }),
                      );
                    }}
                    onSetMemo={(memo) => {
                      update((trip) => setItemMemo(trip, dayIndex, item.id, memo));
                    }}
                    onNudgeArrive={(arrive, delta) => {
                      update((trip) => nudgeArrive(trip, dayIndex, item.id, arrive, delta));
                    }}
                    onNudgeDepart={(stayMin, delta) => {
                      update((trip) => nudgeDepart(trip, dayIndex, item.id, stayMin, delta));
                    }}
                    onUnpinArrive={() => {
                      update((trip) => unpinArrive(trip, dayIndex, item.id));
                    }}
                    onMove={(dir) => {
                      update((trip) => moveItem(trip, dayIndex, item.id, dir));
                    }}
                    onMoveToDay={(to) => {
                      update((trip) => moveItemToDay(trip, dayIndex, item.id, to));
                      toast(t("day.moved", { name: item.snapshot.name, day: to + 1 }));
                    }}
                    onRemove={() => {
                      remove(item.id);
                    }}
                  />
                </div>
              );
            })
          )}
          {day.items.length > 0 && <div className="mt-3">{addPlace}</div>}
        </div>
        {/* 숨긴 상태로 그리면 지도 크기가 0이 되므로 보일 때만 마운트한다(탭 내용도 고른 탭만 마운트된다) */}
        {(isDesktop || view === "map") && (
          <Tabs
            value={sideTab}
            onValueChange={setSideTab}
            className="min-w-0 lg:sticky lg:top-20 lg:flex-1 lg:self-start"
          >
            <TabsList aria-label={t("day.sideTabs")}>
              <TabsTrigger value="route">{t("day.tabRoute")}</TabsTrigger>
              <TabsTrigger value="search">{t("day.tabSearch")}</TabsTrigger>
            </TabsList>
            {/* TabsContent 기본 flex-1(기준 0%)은 높이 없는 세로 flex 안에서 h-*를 무시해 지도가 0 높이가 된다 —
                flex-none으로 높이를 살리고, 지도(검색 탭은 탭 내용)에 직접 높이를 준다. 검색 탭 지도는 그 안에서 조건 줄을 뺀
                나머지를 채운다. 비활성 탭은 언마운트돼 탭을 바꾸면 새로 그린다 */}
            <TabsContent value="route" className="flex-none">
              <CourseMap
                points={points}
                paths={paths_}
                selectedId={selectedId}
                onSelect={setSelectedId}
                className="h-96 lg:h-160"
              />
            </TabsContent>
            <TabsContent value="search" className="flex h-160 min-h-0 flex-none flex-col">
              <RouteSearchPanel
                filters={search}
                onFiltersChange={(next) => {
                  setSearch((s) => ({ ...s, ...next }));
                }}
                near={near}
                onNearChange={setNear}
                radiusKm={radiusKm}
                onRadiusChange={setRadiusKm}
                routeSiguns={routeSiguns}
                points={points}
                paths={paths_}
                dayIndex={dayIndex}
                days={searchDays}
                addedIds={addedIds}
                update={update}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <StayDialog
        item={day.items.find((x) => x.id === editingId) ?? null}
        onClose={() => {
          setEditingId(null);
        }}
        onSubmit={(v) => {
          if (editingId) update((trip) => updateItem(trip, dayIndex, editingId, v));
          setEditingId(null);
        }}
      />
    </div>
  );
}
