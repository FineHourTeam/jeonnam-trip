// S09 여행 시작 폼 — 날짜(최대 4일)·지역·여행 속도. 이동수단은 자동차만이라 안내만 한다.
// 추천 코스 자동 배치는 아직 없어서 "직접 만들기"로만 시작한다.
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MAX_TRIP_DAYS, SIGUNS, isSigunCode, type SigunCode, type TripPace } from "@/shared/domain";
import { addDays, diffDays, todayKst } from "@/shared/lib/date";

const schema = z
  .object({
    title: z.string().trim().max(40, "제목은 40자까지 쓸 수 있어요."),
    startDate: z.string().min(1, "시작일을 골라 주세요."),
    endDate: z.string().min(1, "종료일을 골라 주세요."),
    siguns: z.array(z.string()),
    pace: z.enum(["relaxed", "packed", "none"]),
  })
  .refine((v) => v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "종료일은 시작일과 같거나 그 뒤여야 해요.",
  })
  .refine((v) => diffDays(v.startDate, v.endDate) < MAX_TRIP_DAYS, {
    path: ["endDate"],
    message: `여행 기간은 최대 ${String(MAX_TRIP_DAYS)}일까지 만들 수 있어요.`,
  });

type FormValues = z.infer<typeof schema>;

export interface TripSetupValues {
  title: string;
  startDate: string;
  endDate: string;
  siguns: SigunCode[];
  pace: TripPace;
}

export function TripSetupForm({
  onSubmit,
  defaultDate,
}: {
  onSubmit: (values: TripSetupValues) => void;
  /** 축제에서 왔을 때 방문일로 시작·종료일을 채운다 */
  defaultDate?: string;
}) {
  const today = todayKst();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      startDate: defaultDate ?? today,
      endDate: defaultDate ?? addDays(today, 1),
      siguns: [],
      pace: "none",
    },
  });
  const { errors } = form.formState;

  const submit = form.handleSubmit((v) => {
    onSubmit({
      title: v.title || "새 여행",
      startDate: v.startDate,
      endDate: v.endDate,
      siguns: v.siguns.filter(isSigunCode),
      pace: v.pace === "none" ? null : v.pace,
    });
  });

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-8" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="trip-title">여행 제목 (선택)</Label>
        <Input id="trip-title" placeholder="새 여행" {...form.register("title")} />
        {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">여행 날짜</legend>
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="trip-start" className="sr-only">
            시작일
          </Label>
          <Input id="trip-start" type="date" className="w-auto" {...form.register("startDate")} />
          <span className="text-muted-foreground text-sm">부터</span>
          <Label htmlFor="trip-end" className="sr-only">
            종료일
          </Label>
          <Input id="trip-end" type="date" className="w-auto" {...form.register("endDate")} />
          <span className="text-muted-foreground text-sm">까지</span>
        </div>
        <p className="text-muted-foreground text-sm">
          당일부터 최대 {MAX_TRIP_DAYS}일까지 만들 수 있어요.
        </p>
        {(errors.startDate ?? errors.endDate) && (
          <p className="text-destructive text-sm">
            {errors.startDate?.message ?? errors.endDate?.message}
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">지역 (선택, 여러 곳 가능)</legend>
        <Controller
          control={form.control}
          name="siguns"
          render={({ field }) => (
            <ToggleGroup
              type="multiple"
              variant="outline"
              value={field.value}
              onValueChange={field.onChange}
              className="flex flex-wrap justify-start gap-2"
              aria-label="여행 지역"
            >
              {SIGUNS.map((s) => (
                <ToggleGroupItem key={s.code} value={s.code}>
                  {s.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">여행 속도</legend>
        <Controller
          control={form.control}
          name="pace"
          render={({ field }) => (
            <ToggleGroup
              type="single"
              variant="outline"
              value={field.value}
              onValueChange={(v) => {
                if (v) field.onChange(v);
              }}
              className="justify-start"
              aria-label="여행 속도"
            >
              <ToggleGroupItem value="relaxed">여유롭게</ToggleGroupItem>
              <ToggleGroupItem value="packed">알차게</ToggleGroupItem>
              <ToggleGroupItem value="none">정하지 않음</ToggleGroupItem>
            </ToggleGroup>
          )}
        />
      </fieldset>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">이동수단</p>
        <p className="text-muted-foreground text-sm">
          자동차 기준으로 실제 경로의 예상 이동시간을 계산해요.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
        코스 만들기
      </Button>
    </form>
  );
}
