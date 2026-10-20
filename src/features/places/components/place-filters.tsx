// S04 기본 조회 조건 — 지역·종류·검색어. 값은 URL 검색 파라미터가 들고 있다.
import { SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PLACE_CATEGORY_LABEL, SIGUNS, isSigunCode } from "@/shared/domain";
import type { PlaceListQuery } from "../api/places-api";
import { PLACE_CATEGORIES } from "../lib/place-filter";

interface PlaceFiltersProps {
  values: PlaceListQuery;
  onChange: (next: Partial<PlaceListQuery>) => void;
  onReset: () => void;
}

const ALL = "all";

export function PlaceFilters({ values, onChange, onReset }: PlaceFiltersProps) {
  const dirty = values.sigun !== null || values.categories.length > 0 || values.q !== "";
  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        className="flex flex-col gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q");
          onChange({ q: typeof q === "string" ? q.trim() : "" });
        }}
      >
        <Label htmlFor="place-q">장소 이름</Label>
        <div className="flex gap-2">
          {/* key: 조건 초기화·뒤로 가기로 URL이 바뀌면 입력값도 따라간다 */}
          <Input
            key={values.q}
            id="place-q"
            name="q"
            type="search"
            maxLength={50}
            defaultValue={values.q}
            placeholder="예: 유달산"
            aria-describedby="place-q-hint"
          />
          <Button type="submit" variant="outline">
            <SearchIcon size="sm" />
            검색
          </Button>
        </div>
        <p id="place-q-hint" className="text-muted-foreground text-xs">
          입력한 글자로 이름이 시작하는 장소를 찾아요.
        </p>
      </form>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="place-sigun">지역</Label>
          <Select
            value={values.sigun ?? ALL}
            onValueChange={(v) => {
              onChange({ sigun: isSigunCode(v) ? v : null });
            }}
          >
            <SelectTrigger id="place-sigun" className="w-36">
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
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup
          type="multiple"
          variant="outline"
          value={values.categories}
          onValueChange={(v) => {
            onChange({ categories: PLACE_CATEGORIES.filter((c) => v.includes(c)) });
          }}
          aria-label="종류 (여러 개 선택)"
          className="flex-wrap"
        >
          {PLACE_CATEGORIES.map((c) => (
            <ToggleGroupItem key={c} value={c}>
              {PLACE_CATEGORY_LABEL[c]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {dirty && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            조건 초기화
          </Button>
        )}
      </div>
    </div>
  );
}
