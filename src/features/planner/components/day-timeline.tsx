// 일차 타임라인 — 요약(장소 수·이동 합계·계산 상태·충돌 N건) → 레일 + 구간 행 + 일정 카드 → 장소 넣기 (S10, PLN-09, MAP-04).
import { AddIcon, BookmarkIcon, PinIcon, SettingsIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TripDay } from "@/shared/domain";
import { formatClock, formatDistance, formatDuration } from "@/shared/lib/format";
import type { DaySchedule } from "../lib/schedule";
import { LegRow } from "./leg-row";
import { VisitCard, type VisitActions } from "./visit-card";

const STATUS_LABEL: Record<DaySchedule["status"], string> = {
  empty: "장소를 넣어 주세요",
  calculating: "경로 계산 중",
  ok: "시간 문제 없음",
  warning: "확인 필요",
  conflict: "충돌 있음",
};

export function DaySummary({ schedule, dayCount }: { schedule: DaySchedule; dayCount: number }) {
  const firstIssue = () => {
    const el = document.querySelector("[data-issue=error], [data-issue=warning]");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  return (
    <div className="border-border flex flex-col gap-2 rounded-xl border p-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          장소 <strong className="font-semibold">{dayCount}곳</strong>
          {schedule.totalDriveMin > 0 || schedule.missingLegs > 0 ? (
            <>
              {" · "}이동{" "}
              <strong className="font-semibold">{formatDuration(schedule.totalDriveMin)}</strong>
              {schedule.totalDistanceM > 0 ? ` (${formatDistance(schedule.totalDistanceM)})` : ""}
            </>
          ) : null}
          {schedule.end !== null && dayCount > 0 ? ` · ${formatClock(schedule.end)} 마침` : ""}
        </p>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-semibold",
            schedule.status === "ok" && "bg-success-soft text-success-soft-foreground",
            schedule.status === "warning" && "bg-warning-soft text-warning-soft-foreground",
            schedule.status === "conflict" &&
              "bg-destructive-soft text-destructive-soft-foreground",
            (schedule.status === "calculating" || schedule.status === "empty") &&
              "bg-muted text-muted-foreground",
          )}
        >
          {STATUS_LABEL[schedule.status]}
        </span>
      </div>
      {schedule.missingLegs > 0 ? (
        <p className="text-warning-soft-foreground text-xs">
          {schedule.missingLegs}개 구간을 계산하지 못해 일부만 더한 합계예요.
        </p>
      ) : null}
      {dayCount > 1 ? (
        <p className="text-muted-foreground text-xs">
          경로 시간은 현재 교통 기준 예상이고, 주차·이동 여유는 구간마다 따로 더했어요.
        </p>
      ) : null}
      {schedule.errorCount + schedule.warningCount > 0 ? (
        <Button size="sm" variant="outline" className="self-start" onClick={firstIssue}>
          {schedule.errorCount > 0
            ? `충돌 ${String(schedule.errorCount)}건`
            : `확인할 것 ${String(schedule.warningCount)}건`}{" "}
          보기
        </Button>
      ) : null}
    </div>
  );
}

export function DayTimeline({
  day,
  dayIndex,
  schedule,
  selectedId,
  onSelect,
  actionsFor,
  onRetryRoutes,
  onEditTimes,
  onEditPoints,
  onAddPlace,
  onAddFromLibrary,
}: {
  day: TripDay;
  dayIndex: number;
  schedule: DaySchedule;
  selectedId: string | null;
  onSelect: (id: string) => void;
  actionsFor: (itemIndex: number) => VisitActions;
  onRetryRoutes: () => void;
  onEditTimes: () => void;
  onEditPoints: () => void;
  onAddPlace: () => void;
  onAddFromLibrary: () => void;
}) {
  return (
    <section className="flex flex-col gap-4" aria-label={`${String(dayIndex + 1)}일차 일정`}>
      <DaySummary schedule={schedule} dayCount={day.items.length} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {day.startTime} {day.startPoint ? "출발" : "시작"} · {day.endTime}까지
        </p>
        <Button variant="ghost" size="touch" onClick={onEditTimes}>
          <SettingsIcon size="sm" />
          시간 설정
        </Button>
      </div>
      <button
        type="button"
        onClick={onEditPoints}
        className="border-border flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-left"
      >
        <PinIcon size="sm" className="text-muted-foreground shrink-0" />
        {day.startPoint || day.endPoint ? (
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            출발 {day.startPoint?.label ?? "없음"} · 종료 {day.endPoint?.label ?? "없음"}
          </span>
        ) : (
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-medium">출발 · 종료 위치</span>
            <span className="text-muted-foreground text-xs">
              숙소나 출발역을 넣으면 첫 이동부터 시간을 계산해요
            </span>
          </span>
        )}
        <span className="text-primary shrink-0 text-sm font-medium">
          {day.startPoint || day.endPoint ? "바꾸기" : "정하기"}
        </span>
      </button>

      {day.items.length === 0 ? (
        <div className="bg-background-subtle flex flex-col items-center gap-3 rounded-xl px-4 py-8 text-center">
          <p className="font-semibold">아직 이 일차에 장소가 없어요</p>
          <p className="text-muted-foreground text-sm">
            장소를 넣으면 영업시간과 이동시간을 맞춰 시간을 계산해요.
          </p>
        </div>
      ) : (
        <ol className="relative flex flex-col">
          <span className="bg-border absolute top-4 bottom-4 left-4 w-px" aria-hidden />
          {day.items.map((item, i) => {
            const s = schedule.items[i];
            const leg = s?.legBefore ?? null;
            return (
              <div key={item.id} className="relative flex flex-col">
                {leg ? (
                  <div className="pl-11">
                    <LegRow
                      leg={leg}
                      bufferMin={s?.bufferBeforeMin ?? 0}
                      onRetry={onRetryRoutes}
                      label={i === 0 ? `${day.startPoint?.label ?? "출발 위치"}에서` : undefined}
                    />
                  </div>
                ) : i > 0 ? (
                  <div className="h-3" />
                ) : null}
                <VisitCard
                  index={i}
                  item={item}
                  schedule={s}
                  selected={selectedId === item.id}
                  onSelect={() => {
                    onSelect(item.id);
                  }}
                  actions={actionsFor(i)}
                />
              </div>
            );
          })}
          {schedule.legToEnd ? (
            <div className="pl-11">
              <LegRow
                leg={schedule.legToEnd}
                bufferMin={0}
                onRetry={onRetryRoutes}
                label={`${day.endPoint?.label ?? "종료 위치"}까지`}
              />
            </div>
          ) : null}
        </ol>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="xl" onClick={onAddPlace}>
          <AddIcon size="sm" />
          장소 넣기
        </Button>
        <Button variant="outline" size="xl" onClick={onAddFromLibrary}>
          <BookmarkIcon size="sm" />
          보관함에서
        </Button>
      </div>
    </section>
  );
}
