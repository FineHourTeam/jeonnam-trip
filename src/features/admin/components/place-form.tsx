// A03·A05 장소 편집 — 요일별 영업구간·예외일, 확정 사실과 주관 태그를 나눠 입력한다.
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useFieldArray, useForm } from "react-hook-form";
import { AddIcon, DeleteIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  PLACE_CATEGORY_LABEL,
  SIGUNS,
  sigunName,
  type Place,
  type SigunCode,
} from "@/shared/domain";
import {
  PLACE_CATEGORIES,
  placeSchema,
  valuesToPlace,
  type PlaceValues,
} from "../lib/content-form";
import type { ContentAction } from "../hooks/use-admin";
import type { ContentFormProps } from "./content-form-props";
import { ContentPreview } from "./content-preview";
import { EditActions } from "./edit-actions";
import {
  CheckEditor,
  DayHoursEditor,
  FieldError,
  LocationFields,
  RangesEditor,
  Section,
  SelectField,
  TextAreaField,
  TextField,
} from "./form-parts";
import { PhotosEditor } from "./photos-editor";

const SIGUN_OPTIONS = SIGUNS.map((s) => ({ value: s.code, label: s.name }));
const CATEGORY_OPTIONS = PLACE_CATEGORIES.map((c) => ({
  value: c,
  label: PLACE_CATEGORY_LABEL[c],
}));
const TRI_OPTIONS = [
  { value: "unknown", label: "미확인" },
  { value: "yes", label: "가능" },
  { value: "no", label: "불가" },
] as const;
const PLATFORM_OPTIONS = [
  { value: "official", label: "공식" },
  { value: "instagram", label: "인스타그램" },
  { value: "youtube", label: "유튜브" },
  { value: "blog", label: "블로그" },
  { value: "other", label: "기타" },
] as const;
const WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

export function PlaceForm(props: ContentFormProps<Place, PlaceValues>) {
  const { contentId, initial, base } = props;
  const form = useForm<PlaceValues>({ resolver: zodResolver(placeSchema), defaultValues: initial });
  const exceptions = useFieldArray({ control: form.control, name: "exceptions" });
  const sources = useFieldArray({ control: form.control, name: "sources" });
  const v = form.watch();
  const run = (action: ContentAction) => {
    void form.handleSubmit((values) => {
      props.onAction(action, valuesToPlace(contentId, values, base));
    })();
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
        <Section title="기본 정보">
          <TextField name="name" label="장소 이름" />
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField name="sigun" label="지역(시군)" options={SIGUN_OPTIONS} />
            <SelectField name="category" label="종류" options={CATEGORY_OPTIONS} />
            <TextField name="subcategory" label="세부 종류" placeholder="한식, 역사·문화…" />
          </div>
          <TextField
            name="area"
            label="동네·여행 권역"
            placeholder="행정구역과 별개로 운영팀이 정해요. 주소가 없으면 비워 두세요."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="moods" label="분위기 태그 (쉼표로 구분)" placeholder="오션뷰, 한옥" />
            <TextField name="purposes" label="목적 태그 (쉼표로 구분)" placeholder="사진, 데이트" />
          </div>
          <TextAreaField name="summary" label="소개" />
        </Section>

        <Section title="위치·연락">
          <TextField name="address" label="주소" />
          <LocationFields name="location" />
          <TextField name="phone" label="전화" />
        </Section>

        <Section
          title="영업시간"
          hint="모르면 미확인으로 두세요. 미확인 요일은 자동 시간 배정에서 빠지고 수동 후보로만 담겨요."
        >
          {WEEKDAYS.map((label, i) => (
            <DayHoursEditor key={label} name={`weekly.${String(i)}`} label={label} />
          ))}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">특정 날짜 예외 (임시 휴무·명절·단축 영업)</p>
            {exceptions.fields.map((f, i) => (
              <div key={f.id} className="border-border flex flex-col gap-2 rounded-md border p-3">
                <div className="flex flex-wrap items-end gap-3">
                  <TextField name={`exceptions.${String(i)}.date`} label="날짜" type="date" />
                  <Controller
                    control={form.control}
                    name={`exceptions.${String(i)}.closed` as `exceptions.${number}.closed`}
                    render={({ field }) => (
                      <div className="flex items-center gap-2 pb-2">
                        <Checkbox
                          id={`exceptions.${String(i)}.closed`}
                          checked={field.value}
                          onCheckedChange={(c) => {
                            field.onChange(c === true);
                          }}
                        />
                        <Label htmlFor={`exceptions.${String(i)}.closed`}>그날 휴무</Label>
                      </div>
                    )}
                  />
                  <TextField
                    name={`exceptions.${String(i)}.note`}
                    label="메모"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="예외일 삭제"
                    onClick={() => {
                      exceptions.remove(i);
                    }}
                  >
                    <DeleteIcon size="sm" />
                  </Button>
                </div>
                {!v.exceptions[i]?.closed && (
                  <RangesEditor name={`exceptions.${String(i)}.ranges`} />
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => {
                exceptions.append({ date: "", closed: true, ranges: [], note: "" });
              }}
            >
              <AddIcon size="sm" />
              예외일 추가
            </Button>
          </div>
        </Section>

        <Section title="확인된 사실" hint="확인된 것만 가능·불가로 두고, 모르면 미확인으로 두세요.">
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField name="parking" label="주차" options={TRI_OPTIONS} />
            <SelectField name="reservation" label="예약" options={TRI_OPTIONS} />
            <SelectField name="pets" label="반려동물" options={TRI_OPTIONS} />
          </div>
        </Section>

        <Section title="원문 출처">
          {sources.fields.map((f, i) => (
            <div key={f.id} className="grid gap-3 sm:grid-cols-6">
              <SelectField
                name={`sources.${String(i)}.platform`}
                label="종류"
                options={PLATFORM_OPTIONS}
              />
              <TextField name={`sources.${String(i)}.url`} label="주소" className="sm:col-span-3" />
              <div className="flex items-end gap-2 sm:col-span-2">
                <TextField
                  name={`sources.${String(i)}.label`}
                  label="표시 이름"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="출처 삭제"
                  onClick={() => {
                    sources.remove(i);
                  }}
                >
                  <DeleteIcon size="sm" />
                </Button>
              </div>
            </div>
          ))}
          <FieldError name="sources" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => {
              sources.append({ platform: "official", url: "", label: "" });
            }}
          >
            <AddIcon size="sm" />
            출처 추가
          </Button>
        </Section>

        <Section title="사진">
          <PhotosEditor kind="places" contentId={contentId} />
        </Section>

        <Section
          title="확인 상태"
          hint="미확인·정보 상충이어도 공개해 탐색·보관은 할 수 있어요. 해당 조건이 필요한 자동 배정과 경로 판정에서는 빠져요."
        >
          <CheckEditor name="checks.location" label="위치" />
          <CheckEditor name="checks.hours" label="영업시간" />
          <CheckEditor name="checks.info" label="기타 정보" />
        </Section>

        <ContentPreview
          title={v.name}
          photo={v.photos[0]}
          lines={[
            [
              v.sigun ? sigunName(v.sigun as SigunCode) : "",
              PLACE_CATEGORY_LABEL[v.category],
              v.subcategory,
            ]
              .filter(Boolean)
              .join(" · "),
            v.address || undefined,
            v.summary ? v.summary.slice(0, 80) : undefined,
          ]}
          checks={[
            {
              label: "위치",
              check: { state: v.checks.location.state, checkedAt: v.checks.location.checkedAt },
            },
            {
              label: "영업시간",
              check: { state: v.checks.hours.state, checkedAt: v.checks.hours.checkedAt },
            },
          ]}
        />

        <EditActions
          status={props.status}
          hasDraft={props.hasDraft}
          pending={props.pending}
          onAction={run}
        />
      </form>
    </FormProvider>
  );
}
