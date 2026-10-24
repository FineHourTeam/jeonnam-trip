// 방문 설정 — 체류 시간(직접 정하면 고정), 시작 시각 고정, 개인 메모.
// 사용자가 정한 체류·시각은 계산이 임의로 줄이거나 옮기지 않는다 (기능명세 §6-3, PLN-04).
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MIN_STAY_MIN, type VisitItem } from "@/shared/domain";
import { formatDuration } from "@/shared/lib/format";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const schema = z
  .object({
    stayMin: z.number().int().min(0, "0분 이상으로 넣어 주세요.").max(720, "체류는 12시간까지 정할 수 있어요."),
    fixStart: z.boolean(),
    fixedStart: z.string(),
    memo: z.string().max(500, "메모는 500자까지 쓸 수 있어요."),
  })
  .refine((v) => !v.fixStart || HHMM.test(v.fixedStart), {
    path: ["fixedStart"],
    message: "시작 시각을 10:30처럼 넣어 주세요.",
  });
type Values = z.infer<typeof schema>;

export interface VisitSettings {
  stayMin: number;
  stayLocked: boolean;
  fixedStart: string | undefined;
  memo: string;
}

export function VisitSettingsSheet({
  item,
  open,
  onOpenChange,
  onSave,
}: {
  item: VisitItem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (s: VisitSettings) => void;
}) {
  const isProgram = Boolean(item.fixedStart && item.fixedEnd && item.ref.kind === "festival");
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      stayMin: item.stayMin,
      fixStart: Boolean(item.fixedStart),
      fixedStart: item.fixedStart ?? "",
      memo: item.memo ?? "",
    },
  });
  const fixStart = form.watch("fixStart");
  const errors = form.formState.errors;
  const minStay = MIN_STAY_MIN[item.snapshot.category];
  const submit = form.handleSubmit((v) => {
    const stayChanged = v.stayMin !== item.stayMin;
    onSave({
      stayMin: v.stayMin,
      stayLocked: item.stayLocked || stayChanged,
      fixedStart: v.fixStart ? v.fixedStart : undefined,
      memo: v.memo.trim(),
    });
    onOpenChange(false);
  });

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item.snapshot.name}
      description="직접 정한 체류와 시각은 계산이 바꾸지 않아요. 맞지 않으면 충돌로 알려 드려요."
      footer={
        <Button size="xl" onClick={() => void submit()}>
          적용하기
        </Button>
      }
    >
      <form
        className="flex flex-col gap-6 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {isProgram ? (
          <p className="bg-primary-soft text-primary-soft-foreground rounded-xl p-3 text-sm">
            프로그램 시간({item.fixedStart}~{item.fixedEnd})에 맞춰 고정돼 있어요.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="stay-min" className="text-sm font-semibold">
                체류 시간 (분)
              </Label>
              <Controller
                control={form.control}
                name="stayMin"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    {[-15, 15].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant="outline"
                        size="icon-touch"
                        aria-label={d < 0 ? "15분 줄이기" : "15분 늘리기"}
                        onClick={() => {
                          field.onChange(Math.max(0, field.value + d));
                        }}
                        className={d < 0 ? "order-first" : "order-last"}
                      >
                        {d < 0 ? "−" : "+"}
                      </Button>
                    ))}
                    <Input
                      id="stay-min"
                      type="number"
                      inputMode="numeric"
                      inputSize="touch"
                      className="text-center"
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(Number(e.target.value || "0"));
                      }}
                      aria-invalid={Boolean(errors.stayMin)}
                    />
                  </div>
                )}
              />
              <p className="text-muted-foreground text-xs">
                지금 {formatDuration(form.watch("stayMin"))}
                {item.stayLocked ? " · 직접 정한 체류" : " · 기본값 (영업 종료·다음 일정에 맞춰 줄 수 있어요)"} · 최소{" "}
                {formatDuration(minStay)}
              </p>
              {errors.stayMin?.message ? <p className="text-destructive text-sm">{errors.stayMin.message}</p> : null}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="fix-start" className="text-sm font-semibold">
                  시작 시각 고정
                </Label>
                <Controller
                  control={form.control}
                  name="fixStart"
                  render={({ field }) => (
                    <Switch id="fix-start" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
              {fixStart ? (
                <Input
                  type="time"
                  inputSize="touch"
                  aria-label="고정할 시작 시각"
                  aria-invalid={Boolean(errors.fixedStart)}
                  {...form.register("fixedStart")}
                />
              ) : null}
              {errors.fixedStart?.message ? <p className="text-destructive text-sm">{errors.fixedStart.message}</p> : null}
            </div>
          </>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="visit-memo" className="text-sm font-semibold">
            개인 메모 <span className="text-muted-foreground font-normal">(공유할 때 빠져요)</span>
          </Label>
          <Textarea id="visit-memo" rows={3} {...form.register("memo")} />
          {errors.memo?.message ? <p className="text-destructive text-sm">{errors.memo.message}</p> : null}
        </div>
      </form>
    </BottomSheet>
  );
}
