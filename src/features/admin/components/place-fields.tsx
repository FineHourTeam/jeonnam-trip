// A05 장소 입력 — 지역·종류·태그·위치·영업구간·항목별 출처/확인일.
import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  FACT_LABEL,
  MOOD_TAGS,
  PLACE_CATEGORIES,
  PLACE_CATEGORY_LABEL,
  PURPOSE_TAGS,
  SUBCATEGORIES,
  type FactKey,
} from "@/shared/domain";
import { ChecksEditor, LocationEditor, WeeklyHoursEditor } from "./field-editors";
import type { ContentInput } from "../api/admin-api";
import { Field, Section, SigunSelect } from "./form-parts";

const FACT_VALUE = { yes: true, no: false, unknown: null } as const;

export function PlaceFields({ form }: { form: UseFormReturn<ContentInput<"places">> }) {
  const { control, register, watch } = form;
  const category = watch("category");
  return (
    <>
      <Section title="기본 정보">
        <Field label="이름">
          <Input {...register("name")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="시군">
            <Controller control={control} name="sigun" render={({ field }) => <SigunSelect value={field.value} onChange={field.onChange} />} />
          </Field>
          <Field label="종류">
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => { field.onChange(v); form.setValue("subcategory", undefined); }}>
                  <SelectTrigger className="w-full" aria-label="종류">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {PLACE_CATEGORY_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="세부 종류">
            <Controller
              control={control}
              name="subcategory"
              render={({ field }) => (
                <Select value={field.value ?? "none"} onValueChange={(v) => { field.onChange(v === "none" ? undefined : v); }}>
                  <SelectTrigger className="w-full" aria-label="세부 종류">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    {SUBCATEGORIES[category].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
        <Field label="동네·여행 권역" hint="행정구역과 별개로 운영팀이 정한 권역이에요. 주소가 없으면 비워 두세요.">
          <Input {...register("area")} />
        </Field>
        <Field label="분위기 (운영 태그)" group>
          <Controller control={control} name="moods" render={({ field }) => (
            <ToggleGroup type="multiple" variant="chip" size="chip" className="w-full flex-wrap" value={field.value} onValueChange={field.onChange} aria-label="분위기">
              {MOOD_TAGS.map((t) => <ToggleGroupItem key={t} value={t}>{t}</ToggleGroupItem>)}
            </ToggleGroup>
          )} />
        </Field>
        <Field label="목적 (운영 태그)" group>
          <Controller control={control} name="purposes" render={({ field }) => (
            <ToggleGroup type="multiple" variant="chip" size="chip" className="w-full flex-wrap" value={field.value} onValueChange={field.onChange} aria-label="목적">
              {PURPOSE_TAGS.map((t) => <ToggleGroupItem key={t} value={t}>{t}</ToggleGroupItem>)}
            </ToggleGroup>
          )} />
        </Field>
      </Section>
      <Section title="위치·연락처">
        <Field label="주소">
          <Input {...register("address")} />
        </Field>
        <Field label="좌표" group hint="비우면 위치 미확인 — 탐색·보관은 되지만 경로 계산에서 빠져요.">
          <Controller control={control} name="location" render={({ field }) => <LocationEditor value={field.value} onChange={field.onChange} />} />
        </Field>
        <Field label="전화">
          <Input {...register("phone")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(FACT_LABEL) as FactKey[]).map((k) => (
            <Field key={k} label={`${FACT_LABEL[k]} (확인된 사실만)`}>
              <Controller
                control={control}
                name={`facts.${k}`}
                render={({ field }) => (
                  <Select value={field.value === null ? "unknown" : field.value ? "yes" : "no"} onValueChange={(v) => { field.onChange(FACT_VALUE[v as keyof typeof FACT_VALUE]); }}>
                    <SelectTrigger className="w-full" aria-label={FACT_LABEL[k]}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">미확인</SelectItem>
                      <SelectItem value="yes">가능</SelectItem>
                      <SelectItem value="no">불가</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          ))}
        </div>
      </Section>
      <Section title="영업시간">
        <Controller control={control} name="hours" render={({ field }) => <WeeklyHoursEditor value={field.value} onChange={field.onChange} />} />
      </Section>
      <Section title="항목별 출처·확인일">
        <Controller control={control} name="checks" render={({ field }) => (
          <ChecksEditor value={field.value} labels={{ location: "위치", hours: "영업시간", info: "기타 정보" }} onChange={field.onChange} />
        )} />
      </Section>
    </>
  );
}
