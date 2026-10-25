// 일차 시간 설정·여행 설정(제목·날짜) 시트. 날짜를 줄이면 넘치는 일차 장소는 미배치 후보로 보존한다.
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_TRIP_DAYS, type TripDay } from "@/shared/domain";
import { diffDays, formatDateShort } from "@/shared/lib/date";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const daySchema = z
  .object({
    startTime: z.string().regex(HHMM, "09:00처럼 넣어 주세요."),
    endTime: z.string().regex(HHMM, "21:00처럼 넣어 주세요."),
  })
  .refine((v) => v.endTime > v.startTime, {
    path: ["endTime"],
    message: "종료 시각이 시작 시각보다 늦어야 해요.",
  });

export function DayTimesSheet({
  day,
  dayIndex,
  open,
  onOpenChange,
  onSave,
}: {
  day: TripDay;
  dayIndex: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (startTime: string, endTime: string) => void;
}) {
  const form = useForm<z.infer<typeof daySchema>>({
    resolver: zodResolver(daySchema),
    values: { startTime: day.startTime, endTime: day.endTime },
  });
  const e = form.formState.errors;
  const submit = form.handleSubmit((v) => {
    onSave(v.startTime, v.endTime);
    onOpenChange(false);
  });
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${String(dayIndex + 1)}일차 시간`}
      description={`${formatDateShort(day.date)} · 첫 장소 도착과 마지막 장소 출발 기준이에요.`}
      footer={
        <Button size="xl" onClick={() => void submit()}>
          적용하기
        </Button>
      }
    >
      <form
        className="grid grid-cols-2 gap-3 pb-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="d-start">하루 시작</Label>
          <Input
            id="d-start"
            type="time"
            inputSize="touch"
            aria-invalid={Boolean(e.startTime)}
            {...form.register("startTime")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="d-end">하루 종료</Label>
          <Input
            id="d-end"
            type="time"
            inputSize="touch"
            aria-invalid={Boolean(e.endTime)}
            {...form.register("endTime")}
          />
        </div>
        {e.startTime?.message || e.endTime?.message ? (
          <p className="text-destructive col-span-2 text-sm" role="alert">
            {e.startTime?.message ?? e.endTime?.message}
          </p>
        ) : null}
      </form>
    </BottomSheet>
  );
}

const tripSchema = z
  .object({
    title: z.string().trim().min(1, "제목을 넣어 주세요.").max(40, "제목은 40자까지 쓸 수 있어요."),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜를 골라 주세요."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜를 골라 주세요."),
  })
  .refine((v) => v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "끝나는 날이 시작하는 날보다 빨라요.",
  })
  .refine((v) => diffDays(v.startDate, v.endDate) < MAX_TRIP_DAYS, {
    path: ["endDate"],
    message: `여행 기간은 최대 ${String(MAX_TRIP_DAYS)}일까지 만들 수 있어요.`,
  });

export function TripSettingsSheet({
  title,
  startDate,
  endDate,
  open,
  onOpenChange,
  onSave,
}: {
  title: string;
  startDate: string;
  endDate: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (v: { title: string; startDate: string; endDate: string }) => void;
}) {
  const form = useForm<z.infer<typeof tripSchema>>({
    resolver: zodResolver(tripSchema),
    values: { title, startDate, endDate },
  });
  const e = form.formState.errors;
  const submit = form.handleSubmit((v) => {
    onSave(v);
    onOpenChange(false);
  });
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="여행 설정"
      description="날짜를 바꾸면 일차 순서대로 날짜만 옮겨요. 기간이 줄면 넘치는 일차 장소는 미배치 후보로 남겨요."
      footer={
        <Button size="xl" onClick={() => void submit()}>
          적용하기
        </Button>
      }
    >
      <form
        className="flex flex-col gap-4 pb-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="t-title">제목</Label>
          <Input
            id="t-title"
            inputSize="touch"
            aria-invalid={Boolean(e.title)}
            {...form.register("title")}
          />
          {e.title?.message ? <p className="text-destructive text-sm">{e.title.message}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-start">시작일</Label>
            <Input id="t-start" type="date" inputSize="touch" {...form.register("startDate")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-end">종료일</Label>
            <Input
              id="t-end"
              type="date"
              inputSize="touch"
              aria-invalid={Boolean(e.endDate)}
              {...form.register("endDate")}
            />
          </div>
        </div>
        {e.startDate?.message || e.endDate?.message ? (
          <p className="text-destructive text-sm" role="alert">
            {e.endDate?.message ?? e.startDate?.message}
          </p>
        ) : null}
      </form>
    </BottomSheet>
  );
}
