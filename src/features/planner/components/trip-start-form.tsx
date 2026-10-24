// S09 여행 시작 폼 — 날짜(최대 4일)·지역·시작 방식·여행 속도(선택)·접는 상세 설정(하루 시작·종료 시각·제목).
// 이동수단은 자동차 하나라 고르는 칸 없이 표시만 한다 (작업지시서: 도보 제외).
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ko } from "react-day-picker/locale";
import { z } from "zod";
import { CarIcon, ChevronDownIcon } from "@/components/icons";
import { SigunMultiPicker } from "@/components/sigun-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DEFAULT_DAY_END, DEFAULT_DAY_START } from "@/features/trips";
import { cn } from "@/lib/utils";
import { MAX_TRIP_DAYS, type SigunCode, type TripPace } from "@/shared/domain";
import { diffDays, formatDateShort, todayKst } from "@/shared/lib/date";
import { tripLengthLabel } from "@/shared/lib/format";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z
  .object({
    startDate: z.string().min(1, "여행 날짜를 골라 주세요."),
    endDate: z.string().min(1, "여행 날짜를 골라 주세요."),
    siguns: z.array(z.string()).min(1, "여행할 지역을 하나 이상 골라 주세요."),
    startMode: z.enum(["recommend", "direct"]),
    pace: z.enum(["relaxed", "packed", "none"]),
    dayStart: z.string().regex(HHMM, "시작 시각을 09:00처럼 넣어 주세요."),
    dayEnd: z.string().regex(HHMM, "종료 시각을 21:00처럼 넣어 주세요."),
    title: z.string().max(40, "제목은 40자까지 쓸 수 있어요."),
  })
  .refine((v) => !v.startDate || !v.endDate || diffDays(v.startDate, v.endDate) < MAX_TRIP_DAYS, {
    path: ["endDate"],
    message: `여행 기간은 최대 ${String(MAX_TRIP_DAYS)}일까지 만들 수 있어요.`,
  })
  .refine((v) => v.dayEnd > v.dayStart, { path: ["dayEnd"], message: "종료 시각이 시작 시각보다 늦어야 해요." });

export type TripStartValues = z.infer<typeof schema>;

export interface TripStartSubmit {
  startDate: string;
  endDate: string;
  siguns: SigunCode[];
  startMode: "recommend" | "direct";
  pace: TripPace;
  dayStart: string;
  dayEnd: string;
  title: string;
}

function toDate(ymd: string): Date {
  const [y = 0, m = 1, d = 1] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fromDate(d: Date): string {
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TripStartForm({
  defaults,
  showStartMode,
  mustInclude,
  submitLabel,
  pending,
  onSubmit,
}: {
  defaults: Partial<TripStartValues>;
  /** 크리에이터 코스 복사는 시작 방식을 고르지 않는다 */
  showStartMode: boolean;
  /** 이 날짜가 기간에 들어가야 한다 (축제 방문일) */
  mustInclude?: string;
  submitLabel: string;
  pending: boolean;
  onSubmit: (v: TripStartSubmit) => void;
}) {
  const today = todayKst();
  const [detailOpen, setDetailOpen] = useState(false);
  const form = useForm<TripStartValues>({
    resolver: zodResolver(
      mustInclude
        ? schema.refine((v) => !v.startDate || (v.startDate <= mustInclude && v.endDate >= mustInclude), {
            path: ["endDate"],
            message: `축제 방문일(${formatDateShort(mustInclude)})이 여행 기간에 들어가야 해요.`,
          })
        : schema,
    ),
    defaultValues: {
      startDate: "",
      endDate: "",
      siguns: [],
      startMode: "recommend",
      pace: "none",
      dayStart: DEFAULT_DAY_START,
      dayEnd: DEFAULT_DAY_END,
      title: "",
      ...defaults,
    },
  });
  const errors = form.formState.errors;
  const start = form.watch("startDate");
  const end = form.watch("endDate");
  const days = start && end ? diffDays(start, end) + 1 : 0;

  const submit = form.handleSubmit(
    (v) => {
      onSubmit({
        startDate: v.startDate,
        endDate: v.endDate,
        siguns: v.siguns as SigunCode[],
        startMode: v.startMode,
        pace: v.pace === "none" ? null : v.pace,
        dayStart: v.dayStart,
        dayEnd: v.dayEnd,
        title: v.title,
      });
    },
    (e) => {
      // 달력·지역 칩은 포커스할 입력이 없어 맨 아래 버튼에서는 오류가 안 보인다 — 첫 오류 칸으로 옮긴다
      const section = e.startDate || e.endDate ? "start-dates" : e.siguns ? "start-region" : null;
      if (section) document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "center" });
      else setDetailOpen(true);
    },
  );

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      noValidate
    >
      <section className="flex flex-col gap-3" aria-labelledby="start-dates">
        <div className="flex items-end justify-between gap-2">
          <h2 id="start-dates" className="text-lg font-bold">
            언제 가요?
          </h2>
          <span className="text-muted-foreground text-sm" aria-live="polite">
            {start && end
              ? `${formatDateShort(start)} ~ ${formatDateShort(end)} · ${tripLengthLabel(days)}`
              : start
                ? `${formatDateShort(start)}부터 · 끝나는 날을 골라 주세요`
                : `최대 ${String(MAX_TRIP_DAYS)}일`}
          </span>
        </div>
        <div className="border-border rounded-xl border p-2">
          <Calendar
            mode="range"
            locale={ko}
            numberOfMonths={1}
            defaultMonth={start ? toDate(start) : mustInclude ? toDate(mustInclude) : undefined}
            selected={start ? { from: toDate(start), to: end ? toDate(end) : undefined } : undefined}
            onSelect={(r, picked) => {
              let from = r?.from ? fromDate(r.from) : "";
              let to = r?.to ? fromDate(r.to) : "";
              // 최대 기간을 넘기는 클릭은 그 날부터 새로 고르는 것으로 본다 (오류 문구 대신)
              if (from && to && diffDays(from, to) >= MAX_TRIP_DAYS) from = to = fromDate(picked);
              form.setValue("startDate", from, { shouldValidate: false });
              form.setValue("endDate", to, { shouldValidate: Boolean(to) });
            }}
            disabled={{ before: toDate(today) }}
            className="w-full [--cell-size:--spacing(11)]"
          />
        </div>
        {errors.startDate?.message || errors.endDate?.message ? (
          <p className="text-destructive text-sm" role="alert">
            {errors.endDate?.message ?? errors.startDate?.message}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="start-region">
        <h2 id="start-region" className="text-lg font-bold">
          어디로 가요?
        </h2>
        <Controller
          control={form.control}
          name="siguns"
          render={({ field }) => (
            <SigunMultiPicker value={field.value as SigunCode[]} onChange={field.onChange} />
          )}
        />
        {errors.siguns?.message ? (
          <p className="text-destructive text-sm" role="alert">
            {errors.siguns.message}
          </p>
        ) : null}
      </section>

      {showStartMode ? (
        <section className="flex flex-col gap-3" aria-labelledby="start-mode">
          <h2 id="start-mode" className="text-lg font-bold">
            어떻게 시작할까요?
          </h2>
          <Controller
            control={form.control}
            name="startMode"
            render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} aria-labelledby="start-mode" className="sm:grid-cols-2">
                {(
                  [
                    ["recommend", "추천으로 시작", "고른 장소와 지역 장소로 영업시간·이동을 맞춰 일정을 채워요. 넣지 못한 장소는 이유와 함께 남겨요."],
                    ["direct", "직접 만들기", "빈 일차에서 시작해 장소를 직접 넣어요. 넣을 때마다 시간을 다시 계산해요."],
                  ] as const
                ).map(([value, label, desc]) => (
                  <label
                    key={value}
                    htmlFor={`start-${value}`}
                    className={cn(
                      "border-border flex cursor-pointer items-start gap-3 rounded-xl border p-4",
                      field.value === value && "border-primary bg-primary-soft text-primary-soft-foreground",
                    )}
                  >
                    <RadioGroupItem id={`start-${value}`} value={value} className="mt-1" />
                    <span className="flex flex-col gap-1">
                      <span className="font-semibold">{label}</span>
                      <span className="text-muted-foreground text-sm leading-relaxed">{desc}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )}
          />
        </section>
      ) : null}

      <section className="flex flex-col gap-3" aria-labelledby="start-pace">
        <div className="flex flex-col gap-1">
          <h2 id="start-pace" className="text-lg font-bold">
            여행 속도 <span className="text-muted-foreground text-sm font-normal">(선택)</span>
          </h2>
          <p className="text-muted-foreground text-sm">추천 일정의 장소 수와 여유시간에만 쓰여요. 직접 만든 일정은 바꾸지 않아요.</p>
        </div>
        <Controller
          control={form.control}
          name="pace"
          render={({ field }) => (
            <ToggleGroup
              type="single"
              variant="chip"
              size="chip"
              value={field.value}
              onValueChange={(v) => {
                if (v) field.onChange(v);
              }}
              aria-labelledby="start-pace"
              className="flex-wrap"
            >
              <ToggleGroupItem value="relaxed">여유롭게</ToggleGroupItem>
              <ToggleGroupItem value="packed">알차게</ToggleGroupItem>
              <ToggleGroupItem value="none">고르지 않기</ToggleGroupItem>
            </ToggleGroup>
          )}
        />
      </section>

      <div className="bg-background-subtle flex items-center gap-3 rounded-xl px-4 py-3 text-sm">
        <CarIcon size="sm" className="text-muted-foreground" />
        <span>
          이동수단 <strong className="font-semibold">자동차</strong> · 장소 사이 이동시간은 실제 자동차 경로로 계산해요.
        </span>
      </div>

      <Collapsible open={detailOpen} onOpenChange={setDetailOpen}>
        <CollapsibleTrigger className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
          상세 설정
          <ChevronDownIcon size="sm" className={cn("transition-transform", detailOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="day-start">하루 시작</Label>
              <Input id="day-start" type="time" inputSize="touch" aria-invalid={Boolean(errors.dayStart)} {...form.register("dayStart")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="day-end">하루 종료</Label>
              <Input id="day-end" type="time" inputSize="touch" aria-invalid={Boolean(errors.dayEnd)} {...form.register("dayEnd")} />
            </div>
          </div>
          {errors.dayStart?.message || errors.dayEnd?.message ? (
            <p className="text-destructive text-sm" role="alert">
              {errors.dayStart?.message ?? errors.dayEnd?.message}
            </p>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trip-title">여행 제목</Label>
            <Input id="trip-title" inputSize="touch" placeholder="비워 두면 자동으로 정해요" {...form.register("title")} />
            {errors.title?.message ? <p className="text-destructive text-sm">{errors.title.message}</p> : null}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Button type="submit" size="xl" disabled={pending} className="w-full">
        {pending ? "만드는 중..." : submitLabel}
      </Button>
    </form>
  );
}
