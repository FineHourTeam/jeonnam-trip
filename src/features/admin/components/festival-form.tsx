// A03·A04 축제 편집 — 개최 기간과 날짜별 운영시간(방문 가능 시간)을 구분해 입력한다.
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { AddIcon, DeleteIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { SIGUNS, sigunName, type Festival, type SigunCode } from "@/shared/domain";
import { dateRange, formatDay } from "@/shared/lib/date";
import {
  MAX_DAY_ROWS,
  festivalDraftSchema,
  festivalSchema,
  valuesToFestival,
  type FestivalValues,
} from "../lib/content-form";
import { useIsUploading, type ContentAction } from "../hooks/use-admin";
import { notifyInvalid, useSaveModeResolver } from "../hooks/use-save-mode-resolver";
import type { ContentFormProps } from "./content-form-props";
import { ContentPreview } from "./content-preview";
import { EditActions } from "./edit-actions";
import {
  CheckEditor,
  DayHoursEditor,
  FieldError,
  LocationFields,
  Section,
  SelectField,
  TextAreaField,
  TextField,
} from "./form-parts";
import { PhotosEditor } from "./photos-editor";

const SIGUN_OPTIONS = SIGUNS.map((s) => ({ value: s.code, label: s.name }));
const STATE_OPTIONS = [
  { value: "scheduled", label: "예정대로" },
  { value: "changed", label: "일정 변경" },
  { value: "cancelled", label: "취소" },
] as const;

export function FestivalForm(props: ContentFormProps<Festival, FestivalValues>) {
  const { contentId, initial, base } = props;
  const { resolver, mode } = useSaveModeResolver(festivalSchema, festivalDraftSchema);
  const form = useForm<FestivalValues>({ resolver, defaultValues: initial });
  const programs = useFieldArray({ control: form.control, name: "programs" });
  const v = form.watch();
  const uploading = useIsUploading("festivals", contentId);
  const days = v.startDate && v.endDate ? dateRange(v.startDate, v.endDate) : [];
  const run = (action: ContentAction) => {
    // 비공개·초안 버리기는 입력 검사와 무관하다 — 저장된 본문으로 바로 처리한다
    if (action === "hide" || action === "discard") {
      if (base) props.onAction(action, base);
      return;
    }
    mode.current = action === "draft" ? "draft" : "publish";
    void form.handleSubmit((values) => {
      props.onAction(action, valuesToFestival(contentId, values, base));
    }, notifyInvalid)();
  };

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        {/* 저장 중에는 입력을 잠근다 — 저장 뒤 서버 값으로 폼을 다시 그릴 때 그 사이 입력이 사라지지 않게 */}
        <fieldset disabled={props.pending !== null} className="contents">
          <Section title="기본 정보">
            <TextField name="name" label="축제 이름" />
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField name="sigun" label="지역" options={SIGUN_OPTIONS} />
              <SelectField name="state" label="진행 상태" options={STATE_OPTIONS} />
            </div>
            <TextField
              name="stateNote"
              label="변경·취소 안내"
              placeholder="예: 우천으로 10월 25일 일정 취소"
            />
            <TextAreaField name="summary" label="소개" />
          </Section>

          <Section
            title="개최 기간과 날짜별 운영"
            hint="개최 기간 전체를 체류로 쓰지 않아요. 날짜마다 방문 가능한 운영시간을 넣고, 모르면 미확인으로 두세요."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField name="startDate" label="시작일" type="date" />
              <TextField name="endDate" label="종료일" type="date" />
            </div>
            {days.length > MAX_DAY_ROWS && (
              <p className="text-muted-foreground text-sm">
                기간이 {days.length}일이라 날짜별 입력은 {MAX_DAY_ROWS}일까지만 보여요. 나머지
                날짜는 미확인으로 저장돼요.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {days.slice(0, MAX_DAY_ROWS).map((d) => (
                <DayHoursEditor key={d} name={`days.${d}`} label={formatDay(d, "ko")} />
              ))}
            </div>
          </Section>

          <Section title="프로그램" hint="프로그램을 고르면 사용자 일정에서 그 시간이 고정돼요.">
            {programs.fields.map((p, i) => (
              <div key={p.id} className="border-border grid gap-3 border-b pb-3 sm:grid-cols-6">
                <TextField
                  name={`programs.${String(i)}.name`}
                  label="이름"
                  className="sm:col-span-2"
                />
                <TextField name={`programs.${String(i)}.date`} label="날짜" type="date" />
                <TextField name={`programs.${String(i)}.start`} label="시작" type="time" />
                <TextField name={`programs.${String(i)}.end`} label="종료" type="time" />
                <div className="flex items-end gap-2">
                  <TextField name={`programs.${String(i)}.place`} label="장소" className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="프로그램 삭제"
                    onClick={() => {
                      programs.remove(i);
                    }}
                  >
                    <DeleteIcon size="sm" />
                  </Button>
                </div>
              </div>
            ))}
            <FieldError name="programs" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => {
                programs.append({
                  id: crypto.randomUUID(),
                  name: "",
                  date: v.startDate,
                  start: "14:00",
                  end: "15:00",
                  place: "",
                });
              }}
            >
              <AddIcon size="sm" />
              프로그램 추가
            </Button>
          </Section>

          <Section title="위치·문의">
            <TextField name="address" label="주소" />
            <LocationFields name="location" />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField name="parking" label="주차 안내" />
              <TextField name="contact" label="문의" />
            </div>
            <TextField name="officialUrl" label="공식 안내 주소" placeholder="https://" />
          </Section>

          <Section title="사진">
            <PhotosEditor kind="festivals" contentId={contentId} />
            <TextField
              name="photoCredit"
              label="사진 출처"
              placeholder="예: 사진: 신안군청 · 공공누리 제4유형"
            />
          </Section>

          <Section
            title="확인 상태"
            hint="자료 출처가 있어도 정확성을 보증하지 않아요. 주최 측·지자체 공식 안내로 확인한 항목만 확인됨으로 두세요."
          >
            <CheckEditor name="checks.schedule" label="기간·프로그램" />
            <CheckEditor name="checks.location" label="위치" />
            <CheckEditor name="checks.info" label="기타 정보" />
          </Section>

          <ContentPreview
            title={v.name}
            photo={v.photos[0]}
            lines={[
              v.sigun ? sigunName(v.sigun as SigunCode) : undefined,
              v.startDate && v.endDate
                ? `${formatDay(v.startDate, "ko")} ~ ${formatDay(v.endDate, "ko")}`
                : undefined,
              v.state === "cancelled"
                ? `취소된 축제예요. ${v.stateNote}`
                : v.stateNote || undefined,
              v.address || undefined,
            ]}
            checks={[
              {
                label: "기간",
                check: { state: v.checks.schedule.state, checkedAt: v.checks.schedule.checkedAt },
              },
              {
                label: "위치",
                check: { state: v.checks.location.state, checkedAt: v.checks.location.checkedAt },
              },
            ]}
          />

          <p className="text-muted-foreground text-sm">
            사용자가 이미 저장한 코스는 담을 당시 사본을 갖고 있어요. 여기서 바꾼 내용은 사용자가
            코스를 다시 열 때 변경 안내로 보여요.
          </p>
          <EditActions
            status={props.status}
            hasDraft={props.hasDraft}
            pending={props.pending}
            uploading={uploading}
            onAction={run}
          />
        </fieldset>
      </form>
    </FormProvider>
  );
}
