// S06 저장한 장소 필터 — 지역·종류·분위기(개인 태그 + 장소 분위기 태그). 다른 축은 AND, 같은 묶음 복수 선택은 OR.
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PLACE_CATEGORIES } from "@/features/places";
import { PLACE_CATEGORY_LABEL, SIGUNS, isSigunCode } from "@/shared/domain";
import { EMPTY_LIBRARY_FILTER, isFiltered, type LibraryFilter } from "../lib/library";

const ALL = "all";

interface LibraryFiltersProps {
  value: LibraryFilter;
  moods: string[];
  onChange: (next: LibraryFilter) => void;
}

export function LibraryFilters({ value, moods, onChange }: LibraryFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="library-sigun">지역</Label>
          <Select
            value={value.sigun ?? ALL}
            onValueChange={(v) => {
              onChange({ ...value, sigun: isSigunCode(v) ? v : null });
            }}
          >
            <SelectTrigger id="library-sigun" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>전체 지역</SelectItem>
              {SIGUNS.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isFiltered(value) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(EMPTY_LIBRARY_FILTER);
            }}
          >
            조건 초기화
          </Button>
        )}
      </div>
      <ToggleGroup
        type="multiple"
        variant="outline"
        value={value.categories}
        onValueChange={(v) => {
          onChange({ ...value, categories: PLACE_CATEGORIES.filter((c) => v.includes(c)) });
        }}
        aria-label="종류 (여러 개 선택)"
        className="flex-wrap justify-start"
      >
        {PLACE_CATEGORIES.map((c) => (
          <ToggleGroupItem key={c} value={c}>
            {PLACE_CATEGORY_LABEL[c]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {moods.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-muted-foreground text-xs">
            분위기·태그 (여러 개 고르면 하나라도 맞는 곳)
          </p>
          <ToggleGroup
            type="multiple"
            variant="outline"
            size="sm"
            value={value.moods}
            onValueChange={(v) => {
              onChange({ ...value, moods: moods.filter((m) => v.includes(m)) });
            }}
            aria-label="분위기·태그 (여러 개 선택)"
            className="flex-wrap justify-start"
          >
            {moods.map((m) => (
              <ToggleGroupItem key={m} value={m}>
                {m}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
    </div>
  );
}
