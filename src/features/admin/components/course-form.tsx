// A03·A06 크리에이터 코스 편집 — 원문·등록 장소·일차·순서와 순서 확인 기준을 입력한다.
// 영상 등장 순서만 확인했으면 "영상 등장 순서"로 두어 실제 여행 순서로 표현되지 않게 한다 (기능명세 §5).
import { Controller, FormProvider, useFieldArray, useForm, useFormContext } from "react-hook-form";
import { AddIcon, ChevronDownIcon, ChevronUpIcon, DeleteIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SIGUNS, type CreatorCourse, type Place } from "@/shared/domain";
import {
  courseDraftSchema,
  courseSchema,
  valuesToCourse,
  type CourseValues,
} from "../lib/content-form";
import { useIsUploading, type ContentAction } from "../hooks/use-admin";
import { notifyInvalid, useSaveModeResolver } from "../hooks/use-save-mode-resolver";
import type { ContentFormProps } from "./content-form-props";
import { ContentPreview } from "./content-preview";
import { EditActions } from "./edit-actions";
import { FieldError, Section, SelectField, TextAreaField, TextField } from "./form-parts";
import { PlacePicker } from "./place-picker";

const ORDER_OPTIONS = [
  { value: "video_order", label: "영상 등장 순서 (실제 방문 순서 아님)" },
  { value: "verified_trip", label: "제작자가 확인한 실제 여행 순서" },
  { value: "editor_suggested", label: "운영팀이 구성한 순서" },
] as const;

export function CourseForm(
  props: ContentFormProps<CreatorCourse, CourseValues> & { places: Place[] },
) {
  const { contentId, initial, base, places } = props;
  const { resolver, mode } = useSaveModeResolver(courseSchema, courseDraftSchema);
  const form = useForm<CourseValues>({ resolver, defaultValues: initial });
  const days = useFieldArray({ control: form.control, name: "days" });
  const v = form.watch();
  const uploading = useIsUploading("creators", contentId);
  const placeName = (id: string) => {
    const p = places.find((x) => x.id === id);
    if (!p) return "삭제됐거나 없는 장소";
    return p.name === "" ? "이름 없음" : p.name;
  };
  const run = (action: ContentAction) => {
    // 비공개·초안 버리기는 입력 검사와 무관하다 — 저장된 본문으로 바로 처리한다
    if (action === "hide" || action === "discard") {
      if (base) props.onAction(action, base);
      return;
    }
    mode.current = action === "draft" ? "draft" : "publish";
    void form.handleSubmit((values) => {
      props.onAction(action, valuesToCourse(contentId, values, base));
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
          <Section title="원문·크리에이터">
            <TextField name="title" label="코스 제목" />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField name="creatorName" label="크리에이터" />
              <TextField name="channelUrl" label="채널 주소" placeholder="https://" />
            </div>
            <TextField name="sourceUrl" label="원문 주소" placeholder="https://" />
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField name="orderBasis" label="순서 확인 기준" options={ORDER_OPTIONS} />
              <TextField name="reviewedAt" label="검수일" type="date" />
            </div>
            <TextField name="tags" label="태그 (쉼표로 구분)" placeholder="1박2일, 바다" />
            <TextAreaField name="summary" label="소개" rows={3} />
          </Section>

          <Section title="지역">
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
                  aria-label="코스 지역"
                >
                  {SIGUNS.map((s) => (
                    <ToggleGroupItem key={s.code} value={s.code}>
                      {s.name}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
            />
            <FieldError name="siguns" />
          </Section>

          <Section
            title="일차별 장소"
            hint="등록된 장소만 넣을 수 있어요. 순서는 위·아래 버튼으로 바꿔요."
          >
            {days.fields.map((d, i) => (
              <DayItems
                key={d.id}
                dayIndex={i}
                places={places}
                placeName={placeName}
                onRemoveDay={
                  days.fields.length > 1
                    ? () => {
                        days.remove(i);
                      }
                    : undefined
                }
              />
            ))}
            <FieldError name="days" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => {
                days.append({ items: [] });
              }}
            >
              <AddIcon size="sm" />
              일차 추가
            </Button>
          </Section>

          <ContentPreview
            title={v.title}
            lines={[
              v.creatorName ? `크리에이터 ${v.creatorName}` : undefined,
              ORDER_OPTIONS.find((o) => o.value === v.orderBasis)?.label,
              v.days.map((d, i) => `${String(i + 1)}일차 ${String(d.items.length)}곳`).join(" · "),
            ]}
            checks={[
              {
                label: "검수",
                check: { state: v.reviewedAt ? "verified" : "unverified", checkedAt: v.reviewedAt },
              },
            ]}
          />

          <p className="text-muted-foreground text-sm">
            여기서 고치는 것은 원본 코스예요. 사용자가 이미 복사해 간 개인 코스는 바뀌지 않아요.
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

interface DayItemsProps {
  dayIndex: number;
  places: Place[];
  placeName: (id: string) => string;
  onRemoveDay?: () => void;
}

function DayItems({ dayIndex, places, placeName, onRemoveDay }: DayItemsProps) {
  const { control } = useFormContext<CourseValues>();
  const items = useFieldArray({
    control,
    name: `days.${String(dayIndex)}.items` as `days.${number}.items`,
  });
  return (
    <div className="border-border flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">{dayIndex + 1}일차</p>
        {onRemoveDay && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemoveDay}>
            일차 삭제
          </Button>
        )}
      </div>
      {items.fields.length === 0 && (
        <p className="text-muted-foreground text-sm">아직 장소가 없어요.</p>
      )}
      <ol className="flex flex-col gap-1">
        {items.fields.map((f, i) => (
          <li key={f.id} className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-5 text-right">{i + 1}</span>
            <span className="min-w-0 flex-1">{placeName(f.placeId)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="위로"
              disabled={i === 0}
              onClick={() => {
                items.move(i, i - 1);
              }}
            >
              <ChevronUpIcon size="sm" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="아래로"
              disabled={i === items.fields.length - 1}
              onClick={() => {
                items.move(i, i + 1);
              }}
            >
              <ChevronDownIcon size="sm" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="장소 빼기"
              onClick={() => {
                items.remove(i);
              }}
            >
              <DeleteIcon size="sm" />
            </Button>
          </li>
        ))}
      </ol>
      <PlacePicker
        places={places}
        onPick={(p) => {
          items.append({ placeId: p.id, note: "" });
        }}
      />
    </div>
  );
}
