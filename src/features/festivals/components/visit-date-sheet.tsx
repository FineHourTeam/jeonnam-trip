// 축제 방문일·프로그램 고르기 — 일반 방문은 그날 운영시간 안에서 배치, 프로그램을 고르면 그 구간을 고정한다.
// 개최 기간 전체나 하루 운영시간 전체를 체류로 쓰지 않는다 (기능명세 §2).
import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { LockIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { Festival } from "@/shared/domain";
import { dateRange, formatDateShort, todayKst } from "@/shared/lib/date";

export function festivalVisitDates(f: Festival, today: string): string[] {
  const from = f.startDate > today ? f.startDate : today;
  return from > f.endDate ? [] : dateRange(from, f.endDate);
}

export function dayHoursLabel(f: Festival, date: string): string {
  const day = f.days.find((d) => d.date === date);
  if (!day?.ranges) return "운영시간 확인 필요";
  if (day.ranges.length === 0) return "이날은 운영하지 않아요";
  return day.ranges.map((r) => `${r.open}~${r.close}`).join(", ");
}

export function VisitDateSheet({
  festival,
  open,
  onOpenChange,
  confirmLabel,
  onConfirm,
}: {
  festival: Festival;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  confirmLabel: string;
  onConfirm: (date: string, programId: string | undefined) => void;
}) {
  const dates = festivalVisitDates(festival, todayKst());
  const [date, setDate] = useState<string | null>(null);
  const [program, setProgram] = useState<string>("general");
  const current = date && dates.includes(date) ? date : (dates[0] ?? null);
  const programs = festival.programs.filter((p) => p.date === current);
  const dayRanges = festival.days.find((d) => d.date === current)?.ranges;
  const closedThatDay = Array.isArray(dayRanges) && dayRanges.length === 0;
  const chosenProgram = programs.find((p) => p.id === program);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="방문일 고르기"
      description="일반 방문은 그날 운영시간 안에서 시간을 맞추고, 프로그램을 고르면 그 시간을 고정해요."
      footer={
        <Button
          size="xl"
          disabled={!current || (closedThatDay && !chosenProgram)}
          onClick={() => {
            if (current) onConfirm(current, chosenProgram?.id);
          }}
        >
          {confirmLabel}
        </Button>
      }
    >
      <div className="flex flex-col gap-6 pb-2">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">방문일</h3>
          <ToggleGroup
            type="single"
            variant="chip"
            size="chip"
            className="w-full flex-wrap"
            value={current ?? ""}
            onValueChange={(v) => {
              if (v) {
                setDate(v);
                setProgram("general");
              }
            }}
            aria-label="방문일"
          >
            {dates.map((d) => (
              <ToggleGroupItem key={d} value={d}>
                {formatDateShort(d)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {current ? (
            <p
              className={cn(
                "rounded-lg p-3 text-sm",
                dayRanges ? "bg-background-subtle text-foreground" : "bg-warning-soft text-warning-soft-foreground",
              )}
            >
              {formatDateShort(current)} 운영 · {dayHoursLabel(festival, current)}
              {!dayRanges ? " — 시간 계산 없이 후보로 담기고, 방문 전에 확인이 필요해요." : ""}
            </p>
          ) : null}
        </section>

        {current ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">방문 방식</h3>
            <RadioGroup value={program} onValueChange={setProgram} aria-label="방문 방식">
              <label htmlFor="visit-general" className="border-border flex cursor-pointer items-start gap-3 rounded-xl border p-3">
                <RadioGroupItem id="visit-general" value="general" className="mt-0.5" disabled={closedThatDay} />
                <span className="flex flex-col">
                  <span className="font-semibold">일반 방문</span>
                  <span className="text-muted-foreground text-sm">운영시간 안에서 머무를 시간을 맞춰요 (기본 2시간 30분)</span>
                </span>
              </label>
              {programs.map((p) => (
                <label key={p.id} htmlFor={`visit-${p.id}`} className="border-border flex cursor-pointer items-start gap-3 rounded-xl border p-3">
                  <RadioGroupItem id={`visit-${p.id}`} value={p.id} className="mt-0.5" />
                  <span className="flex flex-col">
                    <span className="flex items-center gap-1 font-semibold">
                      <LockIcon size="sm" />
                      {p.start}~{p.end} {p.name}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      시간이 고정돼요{p.place ? ` · ${p.place}` : ""}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </section>
        ) : null}
      </div>
    </BottomSheet>
  );
}
