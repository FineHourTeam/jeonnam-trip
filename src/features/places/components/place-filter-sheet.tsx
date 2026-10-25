// 장소 상세 필터 — 세부 종류·분위기·목적·이용 조건. 같은 묶음 안은 OR, 묶음끼리는 AND (기능명세 §3).
// 세부 종류는 상위 종류를 골라야 고를 수 있다 (맞지 않는 세부 종류는 화면이 초기화한다).
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PlaceFilter } from "@/features/content";
import {
  FACT_LABEL,
  MOOD_TAGS,
  PLACE_CATEGORY_LABEL,
  PURPOSE_TAGS,
  SUBCATEGORIES,
  type FactKey,
} from "@/shared/domain";

export function PlaceFilterSheet({
  open,
  onOpenChange,
  filter,
  onChange,
  resultCount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filter: PlaceFilter;
  onChange: (f: PlaceFilter) => void;
  resultCount: number;
}) {
  const subs = filter.category ? SUBCATEGORIES[filter.category] : [];
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="상세 필터"
      description="분위기·목적 태그는 운영팀이 붙인 주관적 태그예요. 이용 조건은 확인된 정보만 걸러요."
      footer={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="xl"
            className="flex-1"
            onClick={() => {
              onChange({ ...filter, subcategory: null, moods: [], purposes: [], facts: [] });
            }}
          >
            초기화
          </Button>
          <Button
            size="xl"
            className="flex-[1.4]"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {resultCount}곳 보기
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 pb-2">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">세부 종류</h3>
          {filter.category ? (
            <ToggleGroup
              type="single"
              variant="chip"
              size="chip"
              className="w-full flex-wrap"
              value={filter.subcategory ?? ""}
              onValueChange={(v) => {
                onChange({ ...filter, subcategory: v || null });
              }}
              aria-label={`${PLACE_CATEGORY_LABEL[filter.category]} 세부 종류`}
            >
              {subs.map((s) => (
                <ToggleGroupItem key={s} value={s}>
                  {s}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          ) : (
            <p className="text-muted-foreground text-sm">
              종류(카페·식당 등)를 먼저 고르면 세부 종류를 고를 수 있어요.
            </p>
          )}
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">분위기</h3>
          <ToggleGroup
            type="multiple"
            variant="chip"
            size="chip"
            className="w-full flex-wrap"
            value={filter.moods}
            onValueChange={(v) => {
              onChange({ ...filter, moods: v });
            }}
            aria-label="분위기"
          >
            {MOOD_TAGS.map((t) => (
              <ToggleGroupItem key={t} value={t}>
                {t}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">목적</h3>
          <ToggleGroup
            type="multiple"
            variant="chip"
            size="chip"
            className="w-full flex-wrap"
            value={filter.purposes}
            onValueChange={(v) => {
              onChange({ ...filter, purposes: v });
            }}
            aria-label="목적"
          >
            {PURPOSE_TAGS.map((t) => (
              <ToggleGroupItem key={t} value={t}>
                {t}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">이용 조건 (확인된 정보만)</h3>
          <ToggleGroup
            type="multiple"
            variant="chip"
            size="chip"
            className="w-full flex-wrap"
            value={filter.facts}
            onValueChange={(v) => {
              onChange({ ...filter, facts: v as FactKey[] });
            }}
            aria-label="이용 조건"
          >
            {(Object.keys(FACT_LABEL) as FactKey[]).map((k) => (
              <ToggleGroupItem key={k} value={k}>
                {FACT_LABEL[k]} 가능
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>
      </div>
    </BottomSheet>
  );
}
