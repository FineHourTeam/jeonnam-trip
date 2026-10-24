// A04 축제 입력 — 개최 기간과 날짜별 운영시간(방문 시간과 구분)·프로그램·변경/취소.
import { Controller, type UseFormReturn } from "react-hook-form";
import { AddIcon, DeleteIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Festival } from "@/shared/domain";
import { dateRange } from "@/shared/lib/date";
import { ChecksEditor, LocationEditor, RangesEditor } from "./field-editors";
import type { ContentInput } from "../api/admin-api";
import { Field, Section, SigunSelect } from "./form-parts";

export function FestivalFields({ form }: { form: UseFormReturn<ContentInput<"festivals">> }) {
  const { control, register, watch, setValue } = form;
  const [start, end, days] = watch(["startDate", "endDate", "days"]);
  function syncDays() {
    if (!start || !end || end < start) return;
    const prev = new Map(days.map((d) => [d.date, d.ranges]));
    setValue("days", dateRange(start, end).map((date) => ({ date, ranges: prev.get(date) ?? null })), { shouldDirty: true });
  }
  return (
    <>
      <Section title="기본 정보">
        <Field label="축제 이름">
          <Input {...register("name")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="시군">
            <Controller control={control} name="sigun" render={({ field }) => <SigunSelect value={field.value} onChange={field.onChange} />} />
          </Field>
          <Field label="개최 시작일">
            <Input type="date" {...register("startDate")} />
          </Field>
          <Field label="개최 종료일">
            <Input type="date" {...register("endDate")} />
          </Field>
        </div>
        <Field label="소개">
          <Textarea rows={3} {...register("summary")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="진행 상태" hint="취소는 상세는 보이되 새 일정에 담을 수 없어요.">
            <Controller control={control} name="state" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full" aria-label="진행 상태">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">예정대로</SelectItem>
                  <SelectItem value="changed">일정 변경</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </Field>
          <Field label="변경·취소 안내">
            <Input {...register("stateNote")} />
          </Field>
        </div>
      </Section>
      <Section title="날짜별 운영시간">
        <p className="text-muted-foreground text-sm">개최 기간과 방문 시간은 다르게 다뤄요. 하루 운영시간 안에서 사용자가 머무를 시간을 정해요.</p>
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={syncDays}>
          개최 기간으로 날짜 목록 맞추기
        </Button>
        <Controller control={control} name="days" render={({ field }) => (
          <div className="flex flex-col gap-3">
            {field.value.map((d, i) => (
              <RangesEditor
                key={d.date}
                label={d.date.slice(5)}
                closedLabel="운영 안 함"
                value={d.ranges}
                onChange={(r) => { field.onChange(field.value.map((x, k) => (k === i ? { ...x, ranges: r } : x))); }}
              />
            ))}
          </div>
        )} />
      </Section>
      <Section title="프로그램 (고정 시각)">
        <Controller control={control} name="programs" render={({ field }) => (
          <div className="flex flex-col gap-3">
            {field.value.map((p, i) => {
              const set = (patch: Partial<Festival["programs"][number]>) => { field.onChange(field.value.map((x, k) => (k === i ? { ...x, ...patch } : x))); };
              return (
                <div key={p.id} className="border-border grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_9rem_7rem_7rem_auto]">
                  <Input placeholder="프로그램 이름" aria-label="프로그램 이름" value={p.name} onChange={(e) => { set({ name: e.target.value }); }} />
                  <Input type="date" aria-label="날짜" value={p.date} onChange={(e) => { set({ date: e.target.value }); }} />
                  <Input type="time" aria-label="시작" value={p.start} onChange={(e) => { set({ start: e.target.value }); }} />
                  <Input type="time" aria-label="종료" value={p.end} onChange={(e) => { set({ end: e.target.value }); }} />
                  <Button type="button" size="icon-sm" variant="ghost" aria-label="프로그램 지우기" onClick={() => { field.onChange(field.value.filter((_, k) => k !== i)); }}>
                    <DeleteIcon size="sm" />
                  </Button>
                  <Input className="sm:col-span-5" placeholder="장소 (예: 주무대)" aria-label="프로그램 장소" value={p.place ?? ""} onChange={(e) => { set({ place: e.target.value }); }} />
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => {
              field.onChange([...field.value, { id: crypto.randomUUID().slice(0, 8), name: "", date: start || "", start: "14:00", end: "15:00" }]);
            }}>
              <AddIcon size="sm" />
              프로그램 추가
            </Button>
          </div>
        )} />
      </Section>
      <Section title="위치·이용 정보">
        <Field label="주소">
          <Input {...register("address")} />
        </Field>
        <Field label="좌표" group>
          <Controller control={control} name="location" render={({ field }) => <LocationEditor value={field.value} onChange={field.onChange} />} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="주차">
            <Input {...register("parking")} />
          </Field>
          <Field label="문의">
            <Input {...register("contact")} />
          </Field>
        </div>
        <Field label="공식 홈페이지">
          <Input placeholder="https://" {...register("officialUrl")} />
        </Field>
      </Section>
      <Section title="항목별 출처·확인일">
        <Controller control={control} name="checks" render={({ field }) => (
          <ChecksEditor value={field.value} labels={{ schedule: "일정·운영시간", location: "위치", info: "이용 정보" }} onChange={field.onChange} />
        )} />
      </Section>
    </>
  );
}
