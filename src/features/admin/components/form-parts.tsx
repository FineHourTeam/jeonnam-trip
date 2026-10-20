// 관리자 폼 공용 부품 — 각 폼의 FormProvider 안에서 이름(path)으로 연결한다.
import type { ReactNode } from "react";
import { Controller, get, useFieldArray, useFormContext } from "react-hook-form";
import { AddIcon, DeleteIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function Section({
  title,
  children,
  hint,
}: {
  title: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <fieldset className="border-border flex flex-col gap-4 rounded-lg border p-4">
      <legend className="px-1 font-semibold">{title}</legend>
      {hint && <p className="text-muted-foreground -mt-2 text-sm">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function FieldError({ name }: { name: string }) {
  const { formState } = useFormContext();
  // 배열 전체에 건 검사(refine)는 요소가 있으면 `.root`에 오류가 붙는다
  const error = get(formState.errors, name) as
    { message?: string; root?: { message?: string } } | undefined;
  const message = error?.message ?? error?.root?.message;
  if (!message) return null;
  return <p className="text-destructive text-sm">{message}</p>;
}

export function TextField({
  name,
  label,
  type = "text",
  placeholder,
  className,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  const { register } = useFormContext();
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type} placeholder={placeholder} {...register(name)} />
      <FieldError name={name} />
    </div>
  );
}

export function TextAreaField({
  name,
  label,
  rows = 4,
}: {
  name: string;
  label: string;
  rows?: number;
}) {
  const { register } = useFormContext();
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} rows={rows} {...register(name)} />
      <FieldError name={name} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  options,
  className,
}: {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  className?: string;
}) {
  const { control } = useFormContext();
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value as string} onValueChange={field.onChange}>
            <SelectTrigger id={name} className="w-full">
              <SelectValue placeholder="선택해 주세요" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError name={name} />
    </div>
  );
}

const CHECK_STATES = [
  { value: "verified", label: "확인됨" },
  { value: "unverified", label: "미확인" },
  { value: "conflict", label: "정보 상충" },
] as const;

/** 항목별 확인 상태·출처·확인일 (ADM-03). "확인됨"은 확인 당시 상태일 뿐이다 */
export function CheckEditor({ name, label }: { name: string; label: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SelectField name={`${name}.state`} label={`${label} 확인 상태`} options={CHECK_STATES} />
      <TextField name={`${name}.source`} label="출처" placeholder="공식 홈페이지, 전화 확인 등" />
      <TextField name={`${name}.checkedAt`} label="확인일" type="date" />
    </div>
  );
}

export function LocationFields({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField name={`${name}.lat`} label="위도" placeholder="34.8118" />
        <TextField name={`${name}.lng`} label="경도" placeholder="126.3922" />
      </div>
      <p className="text-muted-foreground text-sm">
        비워 두면 좌표 미확인으로 저장돼요. 미확인 장소는 경로 계산에서 빠져요.
      </p>
    </div>
  );
}

const HOUR_MODES = [
  { value: "unknown", label: "미확인" },
  { value: "closed", label: "휴무" },
  { value: "open", label: "영업" },
] as const;

/** 영업 구간 목록 — 여러 구간이면 그 사이가 브레이크타임. 주문·입장 마감은 선택 */
export function RangesEditor({ name }: { name: string }) {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  return (
    <div className="flex flex-col gap-2">
      {fields.map((f, i) => (
        <div key={f.id} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${name}.${String(i)}.open`}>시작</Label>
            <Input
              id={`${name}.${String(i)}.open`}
              type="time"
              className="w-auto"
              {...register(`${name}.${String(i)}.open`)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${name}.${String(i)}.close`}>종료</Label>
            <Input
              id={`${name}.${String(i)}.close`}
              type="time"
              className="w-auto"
              {...register(`${name}.${String(i)}.close`)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${name}.${String(i)}.lastOrder`}>주문·입장 마감</Label>
            <Input
              id={`${name}.${String(i)}.lastOrder`}
              type="time"
              className="w-auto"
              {...register(`${name}.${String(i)}.lastOrder`)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="구간 삭제"
            onClick={() => {
              remove(i);
            }}
          >
            <DeleteIcon size="sm" />
          </Button>
          <FieldError name={`${name}.${String(i)}.open`} />
          <FieldError name={`${name}.${String(i)}.close`} />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => {
          append({ open: "10:00", close: "20:00", lastOrder: "" });
        }}
      >
        <AddIcon size="sm" />
        구간 추가
      </Button>
    </div>
  );
}

/** 하루 영업 — 미확인/휴무/영업(구간). 값이 아직 없는 날(새로 늘린 기간)도 모드를 고르면 통째로 채운다 */
export function DayHoursEditor({ name, label }: { name: string; label: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      defaultValue={{ mode: "unknown", ranges: [] }}
      render={({ field }) => {
        const value = (field.value as { mode: string; ranges: unknown[] } | undefined) ?? {
          mode: "unknown",
          ranges: [],
        };
        return (
          <div className="border-border flex flex-col gap-2 border-b pb-3 last:border-b-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-28 text-sm font-medium">{label}</span>
              <Select
                value={value.mode}
                onValueChange={(mode) => {
                  const ranges =
                    mode === "open" && value.ranges.length === 0
                      ? [{ open: "10:00", close: "20:00", lastOrder: "" }]
                      : value.ranges;
                  field.onChange({ mode, ranges });
                }}
              >
                <SelectTrigger className="w-28" aria-label={`${label} 영업 여부`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_MODES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {value.mode === "open" && <RangesEditor name={`${name}.ranges`} />}
          </div>
        );
      }}
    />
  );
}
