// S08 크리에이터 코스 목록 — 지역·일수·태그로 거른다. 운영팀이 원문과 장소를 확인한 코스만 공개된다.
import { useSearchParams } from "react-router";
import { RouteIcon } from "@/components/icons";
import { PageBody } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { SigunPickerButton } from "@/components/sigun-picker";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CourseCard, useCreatorCourses, usePlacesByIds } from "@/features/content";
import { isSigunCode, sigunName } from "@/shared/domain";
import { tripLengthLabel } from "@/shared/lib/format";

export default function CreatorListPage() {
  const [params, setParams] = useSearchParams();
  const rawSigun = params.get("sigun") ?? "";
  const sigun = isSigunCode(rawSigun) ? rawSigun : null;
  const days = Number(params.get("days") ?? "0");
  const tag = params.get("tag");
  const q = useCreatorCourses();
  const all = q.data ?? [];
  const tags = [...new Set(all.flatMap((c) => c.tags))].sort((a, b) => a.localeCompare(b, "ko"));
  const list = all.filter(
    (c) =>
      (!sigun || c.siguns.includes(sigun)) &&
      (!days || c.days.length === days) &&
      (!tag || c.tags.includes(tag)),
  );
  const covers = usePlacesByIds(list.flatMap((c) => c.days[0]?.items[0]?.placeId ?? []));

  function patch(k: string, v: string | null) {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  }

  return (
    <PageBody width="xl" className="gap-5 pt-5 pb-8 md:pt-8">
      <Seo
        title="크리에이터 코스"
        description="크리에이터가 다녀온 전남 코스를 내 여행으로 복사해 날짜에 맞게 고쳐 보세요."
      />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">크리에이터 코스</h1>
        <p className="text-muted-foreground text-sm text-pretty">
          운영팀이 원문과 장소를 확인한 코스예요. 복사하면 내 날짜에 맞춰 영업시간·이동을 다시
          검토해요.
        </p>
      </div>
      <div className="-mx-4 flex scrollbar-none items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <SigunPickerButton
          value={sigun}
          onChange={(v) => {
            patch("sigun", v);
          }}
        />
        <ToggleGroup
          type="single"
          variant="chip"
          size="chip"
          value={days ? String(days) : "all"}
          onValueChange={(v) => {
            if (v) patch("days", v === "all" ? null : v);
          }}
          aria-label="일수"
          className="flex-nowrap"
        >
          <ToggleGroupItem value="all">전체 일정</ToggleGroupItem>
          {[1, 2, 3, 4].map((n) => (
            <ToggleGroupItem key={n} value={String(n)}>
              {tripLengthLabel(n)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {tags.length > 0 ? (
        <ToggleGroup
          type="single"
          variant="chip"
          size="chip"
          value={tag ?? ""}
          onValueChange={(v) => {
            patch("tag", v || null);
          }}
          aria-label="태그"
          className="-mx-4 w-auto scrollbar-none flex-nowrap overflow-x-auto px-4 md:mx-0 md:px-0"
        >
          {tags.map((t) => (
            <ToggleGroupItem key={t} value={t}>
              #{t}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : null}
      {q.isPending ? (
        <CardGridSkeleton count={6} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<RouteIcon />}
          title={`${sigun ? sigunName(sigun) : "전남"}${days ? ` · ${tripLengthLabel(days)}` : ""} 코스가 아직 없어요`}
          action={
            sigun || days || tag ? (
              <Button
                variant="outline"
                size="touch"
                onClick={() => {
                  setParams(new URLSearchParams(), { replace: true });
                }}
              >
                조건 초기화
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              cover={covers.data?.find((p) => p.id === c.days[0]?.items[0]?.placeId)?.photos[0]}
            />
          ))}
        </div>
      )}
    </PageBody>
  );
}
