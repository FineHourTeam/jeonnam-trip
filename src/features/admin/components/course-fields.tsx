// A06 크리에이터 코스 입력 — 원문·크리에이터·순서 기준·검수일, 등록 장소로 일차·순서 구성.
import { Controller, type UseFormReturn } from "react-hook-form";
import { AddIcon, DeleteIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePlaces } from "@/features/content";
import { SIGUNS } from "@/shared/domain";
import type { ContentInput } from "../api/admin-api";
import { Field, Section } from "./form-parts";

export function CourseFields({ form }: { form: UseFormReturn<ContentInput<"creators">> }) {
  const { control, register } = form;
  const places = usePlaces({});
  const all = places.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
      <Section title="원문·크리에이터">
        <Field label="코스 제목">
          <Input {...register("title")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="크리에이터 이름">
            <Input {...register("creator.name")} />
          </Field>
          <Field label="채널 주소">
            <Input placeholder="https://" {...register("creator.channelUrl")} />
          </Field>
        </div>
        <Field label="원문 링크">
          <Input placeholder="https://" {...register("sourceUrl")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="순서 기준"
            hint="영상 등장 순서만 확인했다면 실제 여행 순서로 표시하지 않아요."
          >
            <Controller
              control={control}
              name="orderBasis"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-label="순서 기준">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video_order">영상 등장 순서</SelectItem>
                    <SelectItem value="verified_trip">확인된 여행 순서</SelectItem>
                    <SelectItem value="editor_suggested">운영팀 제안 순서</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="검수일">
            <Input type="date" {...register("reviewedAt")} />
          </Field>
        </div>
        <Field label="지역" group>
          <Controller
            control={control}
            name="siguns"
            render={({ field }) => (
              <ToggleGroup
                type="multiple"
                variant="chip"
                size="chip"
                className="w-full flex-wrap"
                value={field.value}
                onValueChange={field.onChange}
                aria-label="지역"
              >
                {SIGUNS.map((s) => (
                  <ToggleGroupItem key={s.code} value={s.code}>
                    {s.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          />
        </Field>
        <Field label="태그 (쉼표로 구분)">
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <Input
                value={field.value.join(", ")}
                onChange={(e) => {
                  field.onChange(
                    e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  );
                }}
              />
            )}
          />
        </Field>
        <Field label="소개">
          <Textarea rows={3} {...register("summary")} />
        </Field>
      </Section>
      <Section title="일차·순서">
        <p className="text-muted-foreground text-sm">
          등록된 장소를 연결해요. 사용자가 복사한 코스는 여기를 고쳐도 바뀌지 않아요.
        </p>
        <Controller
          control={control}
          name="days"
          render={({ field }) => (
            <div className="flex flex-col gap-4">
              {field.value.map((d, di) => (
                <div key={d.day} className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">{d.day}일차</span>
                  {d.items.map((it, ii) => (
                    <div key={`${it.placeId}-${String(ii)}`} className="flex items-center gap-2">
                      <span className="text-muted-foreground w-6 text-sm">{ii + 1}</span>
                      <Select
                        value={it.placeId}
                        onValueChange={(v) => {
                          field.onChange(
                            field.value.map((x, k) =>
                              k === di
                                ? {
                                    ...x,
                                    items: x.items.map((y, j) =>
                                      j === ii ? { ...y, placeId: v } : y,
                                    ),
                                  }
                                : x,
                            ),
                          );
                        }}
                      >
                        <SelectTrigger
                          className="min-w-0 flex-1"
                          aria-label={`${String(d.day)}일차 ${String(ii + 1)}번째 장소`}
                        >
                          <SelectValue placeholder="장소 고르기" />
                        </SelectTrigger>
                        <SelectContent>
                          {all.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="장소 빼기"
                        onClick={() => {
                          field.onChange(
                            field.value.map((x, k) =>
                              k === di ? { ...x, items: x.items.filter((_, j) => j !== ii) } : x,
                            ),
                          );
                        }}
                      >
                        <DeleteIcon size="sm" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    disabled={all.length === 0}
                    onClick={() => {
                      field.onChange(
                        field.value.map((x, k) =>
                          k === di
                            ? { ...x, items: [...x.items, { placeId: all[0]?.id ?? "" }] }
                            : x,
                        ),
                      );
                    }}
                  >
                    <AddIcon size="sm" />
                    장소 추가
                  </Button>
                </div>
              ))}
              {field.value.length < 4 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    field.onChange([...field.value, { day: field.value.length + 1, items: [] }]);
                  }}
                >
                  일차 추가
                </Button>
              ) : null}
            </div>
          )}
        />
      </Section>
    </>
  );
}
