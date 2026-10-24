// S10 코스 편집 — sticky 일차 탭 → 일차 요약·타임라인(목록) / 지도. 모바일은 전환, PC(lg)는 일정+지도 분할.
// 모든 편집은 저장 전까지 이 기기에 보존되고, 경로·시간은 바뀐 구간만 다시 계산한다 (PLN-03, MAP-03).
import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { ListIcon, MapIcon } from "@/components/icons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CourseMap, type CourseMapLeg } from "@/features/map";
import { cn } from "@/lib/utils";
import { PACE_LABEL, sigunName, type VisitItem } from "@/shared/domain";
import { diffDays, formatDateShort } from "@/shared/lib/date";
import { tripLengthLabel } from "@/shared/lib/format";
import { useTripSchedule } from "../hooks/use-trip-schedule";
import {
  changeDates,
  DuplicateInDayError,
  InvalidPeriodError,
  insertItem,
  moveItem,
  moveItemToDay,
  placeUnplaced,
  removeItem,
  removeUnplaced,
  replaceItem,
  setDayTimes,
  unplaceItem,
  updateItem,
  type EditableTrip,
} from "../lib/edit-ops";
import { acknowledge, applyLatest, ContentChangesBanner, useContentChanges } from "./content-changes";
import { DayPickSheet } from "./day-pick-sheet";
import { DayTimeline } from "./day-timeline";
import { PlacePickerSheet } from "./place-picker-sheet";
import { DayTimesSheet, TripSettingsSheet } from "./trip-settings-sheets";
import { UnplacedList } from "./unplaced-list";
import { VisitSettingsSheet } from "./visit-settings-sheet";

interface Picker {
  mode: "add" | "replace";
  day: number;
  index?: number;
  tab: "search" | "library" | "festival";
}

export function TripEditor({
  trip,
  update,
  banners,
}: {
  trip: EditableTrip;
  update: (fn: (t: EditableTrip) => EditableTrip) => void;
  banners?: React.ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const dayParam = Number(params.get("day") ?? "1") - 1;
  const day = Math.min(Math.max(0, Number.isFinite(dayParam) ? dayParam : 0), trip.days.length - 1);
  const view = params.get("view") === "map" ? "map" : "list";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<{ day: number; item: VisitItem } | null>(null);
  const [movePick, setMovePick] = useState<{ day: number; index: number } | null>(null);
  const [placePick, setPlacePick] = useState<number | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [dayTimesOpen, setDayTimesOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const { schedules, legViews, retryFailed } = useTripSchedule(trip.days);
  const changes = useContentChanges(trip);

  function setParam(k: string, v: string | null) {
    const p = new URLSearchParams(params);
    if (v === null) p.delete(k);
    else p.set(k, v);
    setParams(p, { replace: true });
  }

  /** 편집 적용 + 실패 안내 (같은 일차 중복 등) */
  function apply(fn: (t: EditableTrip) => EditableTrip): boolean {
    try {
      const next = fn(trip);
      update(() => next);
      return true;
    } catch (e) {
      if (e instanceof DuplicateInDayError || e instanceof InvalidPeriodError) toast.error(e.message);
      else throw e;
      return false;
    }
  }

  const current = trip.days[day];
  const schedule = schedules[day];
  if (!current || !schedule) return null;

  const actionsFor = (i: number) => {
    const n = current.items.length;
    const item = current.items[i];
    return {
      onSettings: () => {
        if (item) setSettings({ day, item });
      },
      onMoveUp: i > 0 ? () => { apply((t) => moveItem(t, day, i, -1)); } : null,
      onMoveDown: i < n - 1 ? () => { apply((t) => moveItem(t, day, i, 1)); } : null,
      onMoveDay: trip.days.length > 1 ? () => { setMovePick({ day, index: i }); } : null,
      onReplace: () => {
        setPicker({ mode: "replace", day, index: i, tab: "search" });
      },
      onUnplace: () => {
        if (apply((t) => unplaceItem(t, day, i, "직접 일정에서 뺐어요."))) toast.success("미배치 후보로 옮겼어요.");
      },
      onRemove: () => {
        const before = trip;
        if (apply((t) => removeItem(t, day, i))) {
          toast.success(`${item?.snapshot.name ?? "장소"} 방문을 지웠어요.`, {
            action: { label: "되돌리기", onClick: () => { update(() => before); } },
          });
        }
      },
      onRetryRoutes: retryFailed,
    };
  };

  const located = current.items.map((it, i) => ({ id: it.id, label: String(i + 1), name: it.snapshot.name, location: it.snapshot.location }));
  const mapLegs: CourseMapLeg[] = (legViews[day] ?? []).flatMap((lv) =>
    lv.from && lv.to ? [{ from: lv.from, to: lv.to, path: lv.state.status === "ok" ? lv.state.path : null }] : [],
  );

  return (
    <div className="flex flex-col">
      <div className="border-border bg-background/95 sticky top-14 z-20 border-b backdrop-blur md:top-28">
        <div className="mx-auto flex max-w-screen-xl items-center gap-2 px-4">
          <Tabs value={String(day)} onValueChange={(v) => { setParam("day", String(Number(v) + 1)); setSelectedId(null); }} className="min-w-0 flex-1">
            <TabsList variant="line" className="scrollbar-none h-12 w-full justify-start overflow-x-auto">
              {trip.days.map((d, i) => {
                const st = schedules[i]?.status;
                return (
                  <TabsTrigger key={d.date} value={String(i)} className="h-11 flex-none px-3">
                    <span className="font-semibold">{i + 1}일차</span>
                    <span className="text-muted-foreground text-xs">{formatDateShort(d.date)}</span>
                    {st === "conflict" ? <span className="bg-destructive size-1.5 rounded-full" aria-label="충돌 있음" /> : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="mx-auto w-full max-w-screen-xl px-4 pt-4 pb-32 lg:grid lg:grid-cols-2 lg:gap-8 lg:pb-12">
        <div className={cn("flex-col gap-6", view === "map" ? "hidden lg:flex" : "flex")}>
          <button type="button" className="flex flex-col gap-1 text-left" onClick={() => { setTripOpen(true); }}>
            <h1 className="text-xl font-bold tracking-tight text-balance">{trip.title}</h1>
            <p className="text-muted-foreground text-sm">
              {formatDateShort(trip.startDate)} ~ {formatDateShort(trip.endDate)} · {tripLengthLabel(trip.days.length)} · 자동차
              {trip.pace ? ` · ${PACE_LABEL[trip.pace]}` : ""}
              {trip.siguns.length > 0 ? ` · ${trip.siguns.map(sigunName).join("·")}` : ""}
              <span className="text-primary"> · 설정</span>
            </p>
          </button>
          {banners}
          <ContentChangesBanner
            changes={changes}
            onApply={(c) => {
              apply((t) => applyLatest(t, c));
              toast.success("최신 정보로 바꿨어요. 시간을 다시 계산해요.");
            }}
            onAck={(c) => {
              apply((t) => acknowledge(t, c));
            }}
          />
          <DayTimeline
            day={current}
            dayIndex={day}
            schedule={schedule}
            selectedId={selectedId}
            onSelect={setSelectedId}
            actionsFor={actionsFor}
            onRetryRoutes={retryFailed}
            onEditTimes={() => { setDayTimesOpen(true); }}
            onAddPlace={() => { setPicker({ mode: "add", day, tab: "search" }); }}
            onAddFromLibrary={() => { setPicker({ mode: "add", day, tab: "library" }); }}
          />
          <UnplacedList
            items={trip.unplaced}
            onPlace={setPlacePick}
            onRemove={(i) => {
              const before = trip;
              if (apply((t) => removeUnplaced(t, i))) {
                toast.success(`${trip.unplaced[i]?.snapshot.name ?? "장소"} 후보를 지웠어요.`, {
                  action: { label: "되돌리기", onClick: () => { update(() => before); } },
                });
              }
            }}
          />
        </div>

        <aside className={cn(view === "map" ? "flex flex-col gap-3" : "hidden lg:flex lg:flex-col lg:gap-3")}>
          <div className="lg:sticky lg:top-44">
            <CourseMap
              stops={located}
              legs={mapLegs}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                if (view === "list") document.getElementById(`visit-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="h-[62dvh] w-full lg:h-[calc(100dvh-13rem)]"
              fallbackQuery={trip.siguns.map(sigunName).join(" ")}
            />
            <p className="text-muted-foreground mt-2 text-xs">
              실선은 조회한 자동차 경로, 점선은 아직 조회하지 못한 구간이에요. 번호는 방문 순서예요.
            </p>
          </div>
        </aside>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center lg:hidden">
        <Button
          size="touch"
          className="pointer-events-auto rounded-full shadow-lg"
          onClick={() => { setParam("view", view === "map" ? null : "map"); }}
        >
          {view === "map" ? <ListIcon size="sm" /> : <MapIcon size="sm" />}
          {view === "map" ? "일정 보기" : "지도 보기"}
        </Button>
      </div>

      {settings ? (
        <VisitSettingsSheet
          item={settings.item}
          open
          onOpenChange={(v) => { if (!v) setSettings(null); }}
          onSave={(s) => {
            apply((t) =>
              updateItem(t, settings.day, settings.item.id, {
                stayMin: s.stayMin,
                stayLocked: s.stayLocked,
                memo: s.memo || undefined,
                ...(settings.item.ref.kind === "festival" && settings.item.fixedEnd ? {} : { fixedStart: s.fixedStart }),
              }),
            );
          }}
        />
      ) : null}
      <DayPickSheet
        open={movePick !== null}
        onOpenChange={(v) => { if (!v) setMovePick(null); }}
        title="다른 일차로 옮기기"
        days={trip.days}
        currentDay={movePick?.day ?? null}
        onPick={(to) => {
          if (!movePick) return;
          if (apply((t) => moveItemToDay(t, movePick.day, movePick.index, to))) toast.success(`${String(to + 1)}일차로 옮겼어요.`);
        }}
      />
      <DayPickSheet
        open={placePick !== null}
        onOpenChange={(v) => { if (!v) setPlacePick(null); }}
        title="미배치 후보 넣기"
        days={trip.days}
        currentDay={null}
        onPick={(to) => {
          if (placePick === null) return;
          if (apply((t) => placeUnplaced(t, placePick, to))) toast.success(`${String(to + 1)}일차에 넣었어요.`);
        }}
      />
      {picker ? (
        <PlacePickerSheet
          open
          onOpenChange={(v) => { if (!v) setPicker(null); }}
          mode={picker.mode}
          initialTab={picker.tab}
          date={trip.days[picker.day]?.date ?? trip.startDate}
          siguns={trip.siguns}
          dayItems={trip.days[picker.day]?.items ?? []}
          onPick={(items) => {
            const first = items[0];
            if (picker.mode === "replace" && picker.index !== undefined && first) {
              const at = picker.index;
              apply((t) => replaceItem(t, picker.day, at, first));
              toast.success("장소를 바꿨어요.");
              return;
            }
            const dup = items.filter((it) => trip.days[picker.day]?.items.some((x) => JSON.stringify(x.ref) === JSON.stringify(it.ref)));
            const fresh = items.filter((it) => !dup.includes(it));
            if (fresh.length > 0) {
              apply((t) => fresh.reduce((acc, it) => insertItem(acc, picker.day, acc.days[picker.day]?.items.length ?? 0, it), t));
              toast.success(`${String(picker.day + 1)}일차에 ${String(fresh.length)}곳을 넣었어요.`);
            }
            if (dup.length > 0) toast.info(`이미 이 일차에 있는 ${String(dup.length)}곳은 뺐어요.`);
          }}
        />
      ) : null}
      <DayTimesSheet
        day={current}
        dayIndex={day}
        open={dayTimesOpen}
        onOpenChange={setDayTimesOpen}
        onSave={(s, e) => { apply((t) => setDayTimes(t, day, s, e)); }}
      />
      <TripSettingsSheet
        title={trip.title}
        startDate={trip.startDate}
        endDate={trip.endDate}
        open={tripOpen}
        onOpenChange={setTripOpen}
        onSave={(v) => {
          const keep = diffDays(v.startDate, v.endDate) + 1;
          const overflow = trip.days.slice(keep).reduce((n, d) => n + d.items.length, 0);
          if (apply((t) => ({ ...changeDates(t, v.startDate, v.endDate), title: v.title })) && overflow > 0) {
            toast.info(`기간을 줄여 ${String(overflow)}곳을 미배치 후보로 옮겼어요.`);
          }
        }}
      />
    </div>
  );
}
