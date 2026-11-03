// 일차 하나 — 요약·시작/종료 시각·시간표(모바일은 일정/지도 전환, PC는 2단).
import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CourseMap, type CourseMapPoint } from "@/features/map";
import { usePlacesByIds } from "@/features/places";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import type { LatLng, TripDay, TripDraft } from "@/shared/domain";
import { formatDay } from "@/shared/lib/date";
import type { TripEdit } from "../hooks/use-trip-editor";
import { useDaySchedule } from "../hooks/use-day-schedule";
import {
  insertItem,
  moveItem,
  moveItemToDay,
  removeItem,
  setDayTimes,
  updateItem,
} from "../lib/trip-edits";
import { AddPlaceDialog } from "./add-place-dialog";
import { LegRow } from "./leg-row";
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

  const nameOf = (id: string) => day.items.find((x) => x.id === id)?.snapshot.name;
  const otherDays = trip.days
    .map((d, index) => ({
      index,
      label: t("dayWithDate", { day: index + 1, date: formatDay(d.date, i18n.language) }),
    }))
    .filter((d) => d.index !== dayIndex);
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
  const timeError = day.endTime <= day.startTime;
  const addedIds = useMemo(
    () => new Set(day.items.flatMap((x) => (x.ref.kind === "place" ? [x.ref.placeId] : []))),
    [day.items],
  );
  // 카드 사진 — 사본(snapshot)에는 사진이 없어 등록 장소의 대표 사진을 함께 읽는다. 못 읽어도 카드는 그대로 쓴다
  const placeIds = useMemo(() => [...addedIds].sort(), [addedIds]);
  const placesById = usePlacesByIds(placeIds);
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
      <div className="bg-background-subtle text-foreground flex flex-col gap-1 rounded-lg p-4 text-sm">
        <p className="font-medium">
          {t("day.summary", { count: day.items.length, drive: schedule.driveMin })}
          {!schedule.routesComplete && day.items.length > 1 && t("day.routesIncomplete")} ·{" "}
          {t(`status.${schedule.status}`)}
        </p>
        <p className="text-muted-foreground">{t("day.estimateNote")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`day-${String(dayIndex)}-start`}>{t("day.start")}</Label>
          <Input
            id={`day-${String(dayIndex)}-start`}
            type="time"
            className="w-auto"
            value={day.startTime}
            onChange={(e) => {
              update((trip) =>
                setDayTimes(trip, dayIndex, { startTime: e.target.value, endTime: day.endTime }),
              );
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`day-${String(dayIndex)}-end`}>{t("day.end")}</Label>
          <Input
            id={`day-${String(dayIndex)}-end`}
            type="time"
            className="w-auto"
            value={day.endTime}
            aria-invalid={timeError || undefined}
            onChange={(e) => {
              update((trip) =>
                setDayTimes(trip, dayIndex, { startTime: day.startTime, endTime: e.target.value }),
              );
            }}
          />
        </div>
        {timeError && <p className="text-destructive text-sm">{t("day.timeError")}</p>}
      </div>

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
        {/* 숨긴 상태로 그리면 지도 크기가 0이 되므로 보일 때만 마운트한다 */}
        {(isDesktop || view === "map") && (
          <CourseMap
            points={points}
            paths={paths_}
            selectedId={selectedId}
            onSelect={setSelectedId}
            className="h-96 lg:sticky lg:top-20 lg:h-160 lg:flex-1"
          />
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
