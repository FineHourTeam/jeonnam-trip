// S09 여행 시작 폼 — 날짜(최대 4일)·지역·여행 속도. 이동수단은 자동차만이라 안내만 한다.
// 추천 코스 자동 배치는 아직 없어서 "직접 만들기"로만 시작한다.
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import i18n from "@/lib/i18n";
import { MAX_TRIP_DAYS, SIGUNS, isSigunCode, type SigunCode, type TripPace } from "@/shared/domain";
import { addDays, diffDays, todayKst } from "@/shared/lib/date";

// 검증 메시지는 검사하는 순간의 언어로 (error 콜백)
const msg = (key: "errorTitleMax" | "errorStart" | "errorEnd" | "errorOrder") => ({
  error: () => i18n.t(`setup.${key}`, { ns: "planner" }),
});

const schema = z
  .object({
    title: z.string().trim().max(40, msg("errorTitleMax")),
    startDate: z.string().min(1, msg("errorStart")),
    endDate: z.string().min(1, msg("errorEnd")),
    siguns: z.array(z.string()),
    pace: z.enum(["relaxed", "packed", "none"]),
  })
  .refine((v) => v.endDate >= v.startDate, {
    path: ["endDate"],
    ...msg("errorOrder"),
  })
  .refine((v) => diffDays(v.startDate, v.endDate) < MAX_TRIP_DAYS, {
    path: ["endDate"],
    error: () => i18n.t("setup.errorMaxDays", { ns: "planner", max: MAX_TRIP_DAYS }),
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
  defaultDays,
}: {
  onSubmit: (values: TripSetupValues) => void;
  /** 축제에서 왔을 때 방문일로 시작·종료일을 채운다 */
  defaultDate?: string;
  /** 크리에이터 코스에서 왔을 때 코스 일수 — 종료일을 아직 고치지 않았으면 이 일수에 맞춘다 */
  defaultDays?: number;
}) {
  const { t } = useTranslation("planner");
  const today = todayKst();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      startDate: defaultDate ?? today,
      endDate: defaultDate ?? addDays(today, (defaultDays ?? 2) - 1),
      siguns: [],
      pace: "none",
    },
  });
  const { errors, dirtyFields } = form.formState;
  const endDirty = Boolean(dirtyFields.endDate);

  // 코스 일수가 늦게 도착하면 사용자가 고치지 않은 종료일만 맞춘다 (입력값은 지우지 않는다)
  useEffect(() => {
    if (defaultDays === undefined || endDirty) return;
    form.setValue("endDate", addDays(form.getValues("startDate"), defaultDays - 1));
  }, [defaultDays, endDirty, form]);

  const submit = form.handleSubmit((v) => {
    onSubmit({
      title: v.title || t("setup.defaultTitle"),
      startDate: v.startDate,
      endDate: v.endDate,
      siguns: v.siguns.filter(isSigunCode),
      pace: v.pace === "none" ? null : v.pace,
    });
  });

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-8" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="trip-title">{t("setup.titleLabel")}</Label>
        <Input id="trip-title" placeholder={t("setup.defaultTitle")} {...form.register("title")} />
        {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("setup.dates")}</legend>
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="trip-start" className="sr-only">
            {t("setup.startDate")}
          </Label>
          <Input id="trip-start" type="date" className="w-auto" {...form.register("startDate")} />
          <span className="text-muted-foreground text-sm">{t("setup.from")}</span>
          <Label htmlFor="trip-end" className="sr-only">
            {t("setup.endDate")}
          </Label>
          <Input id="trip-end" type="date" className="w-auto" {...form.register("endDate")} />
          {t("setup.until") && (
            <span className="text-muted-foreground text-sm">{t("setup.until")}</span>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {t("setup.datesHelp", { max: MAX_TRIP_DAYS })}
        </p>
        {(errors.startDate ?? errors.endDate) && (
          <p className="text-destructive text-sm">
            {errors.startDate?.message ?? errors.endDate?.message}
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("setup.regions")}</legend>
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
              aria-label={t("setup.regionsLabel")}
            >
              {SIGUNS.map((s) => (
                <ToggleGroupItem key={s.code} value={s.code}>
                  {t(`sigun.${s.code}`, { ns: "common" })}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("setup.pace")}</legend>
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
              aria-label={t("setup.pace")}
            >
              <ToggleGroupItem value="relaxed">{t("setup.paceRelaxed")}</ToggleGroupItem>
              <ToggleGroupItem value="packed">{t("setup.pacePacked")}</ToggleGroupItem>
              <ToggleGroupItem value="none">{t("setup.paceNone")}</ToggleGroupItem>
            </ToggleGroup>
          )}
        />
      </fieldset>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{t("setup.transport")}</p>
        <p className="text-muted-foreground text-sm">{t("setup.transportHelp")}</p>
      </div>

      <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
        {t("setup.submit")}
      </Button>
    </form>
  );
}
