// 일차 하나 — 요약·시작/종료 시각·시간표(모바일은 일정/지도 전환, PC는 2단).
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CourseMap, type CourseMapPoint } from "@/features/map";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import type { LatLng, TripDay, TripDraft } from "@/shared/domain";
import { formatDateKo } from "@/shared/lib/date";
import type { TripEdit } from "../hooks/use-trip-editor";
import { useDaySchedule } from "../hooks/use-day-schedule";
import { DAY_STATUS_LABEL } from "../lib/issue-labels";
import {
  insertItem,
  moveItem,
  moveItemToDay,
  removeItem,
  setDayTimes,
  updateItem,
} from "../lib/trip-edits";
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
  const isDesktop = useMediaQuery("(min-width: 64rem)");
  const { schedule, legs, retryFailed } = useDaySchedule(day);
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const nameOf = (id: string) => day.items.find((x) => x.id === id)?.snapshot.name;
  const otherDays = trip.days
    .map((d, index) => ({ index, label: `${String(index + 1)}일차 · ${formatDateKo(d.date)}` }))
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

  const remove = (itemId: string) => {
    const index = day.items.findIndex((x) => x.id === itemId);
    const item = day.items[index];
    if (!item) return;
    update((t) => removeItem(t, dayIndex, itemId));
    toast(`「${item.snapshot.name}」 장소를 일정에서 뺐어요.`, {
      action: {
        label: "되돌리기",
        onClick: () => {
          update((t) => insertItem(t, dayIndex, index, item));
        },
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-background-subtle text-foreground flex flex-col gap-1 rounded-lg p-4 text-sm">
        <p className="font-medium">
          방문 {day.items.length}곳 · 이동 합계 {schedule.driveMin}분
          {!schedule.routesComplete && day.items.length > 1 && " (일부 구간 미확인)"} ·{" "}
          {DAY_STATUS_LABEL[schedule.status]}
        </p>
        <p className="text-muted-foreground">
          이동시간은 조회 시점의 교통 상황을 기준으로 한 예상치예요.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`day-${String(dayIndex)}-start`}>하루 시작</Label>
          <Input
            id={`day-${String(dayIndex)}-start`}
            type="time"
            className="w-auto"
            value={day.startTime}
            onChange={(e) => {
              update((t) =>
                setDayTimes(t, dayIndex, { startTime: e.target.value, endTime: day.endTime }),
              );
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`day-${String(dayIndex)}-end`}>하루 종료</Label>
          <Input
            id={`day-${String(dayIndex)}-end`}
            type="time"
            className="w-auto"
            value={day.endTime}
            aria-invalid={timeError || undefined}
            onChange={(e) => {
              update((t) =>
                setDayTimes(t, dayIndex, { startTime: day.startTime, endTime: e.target.value }),
              );
            }}
          />
        </div>
        {timeError && (
          <p className="text-destructive text-sm">종료 시각은 시작 시각보다 늦어야 해요.</p>
        )}
      </div>

      <ToggleGroup
        type="single"
        variant="outline"
        value={view}
        onValueChange={(v) => {
          if (v === "list" || v === "map") setView(v);
        }}
        className="justify-start lg:hidden"
        aria-label="보기 방식"
      >
        <ToggleGroupItem value="list">일정 보기</ToggleGroupItem>
        <ToggleGroupItem value="map">지도 보기</ToggleGroupItem>
      </ToggleGroup>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className={cn("flex flex-col lg:flex-1", view === "map" && "hidden lg:flex")}>
          {day.items.length === 0 ? (
            <div className="border-border flex flex-col gap-2 rounded-lg border border-dashed p-6 text-center text-sm">
              <p>아직 이 날 담은 장소가 없어요.</p>
              <p className="text-muted-foreground">
                <Link
                  to={paths.festivals}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  축제
                </Link>
                나{" "}
                <Link to={paths.places} className="text-primary underline-offset-4 hover:underline">
                  장소
                </Link>
                에서 &lsquo;일정에 추가&rsquo;로 담을 수 있어요.
              </p>
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
                    onMove={(dir) => {
                      update((t) => moveItem(t, dayIndex, item.id, dir));
                    }}
                    onMoveToDay={(to) => {
                      update((t) => moveItemToDay(t, dayIndex, item.id, to));
                      toast(`「${item.snapshot.name}」 장소를 ${String(to + 1)}일차로 옮겼어요.`);
                    }}
                    onRemove={() => {
                      remove(item.id);
                    }}
                  />
                </div>
              );
            })
          )}
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
          if (editingId) update((t) => updateItem(t, dayIndex, editingId, v));
          setEditingId(null);
        }}
      />
    </div>
  );
}
