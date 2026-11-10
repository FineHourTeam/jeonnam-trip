// 장소 찾아 담기 — 이름 검색·지역·종류 조건과 결과 목록. 조건 상태는 부모가 갖는다(대화상자=주소, 지도 옆 탭=화면 상태).
// 조건 줄(PlaceSearchFilterBar)은 지도 옆 "검색" 탭(RouteSearchPanel)도 함께 쓴다.
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PLACE_CATEGORIES, usePlaces } from "@/features/places";
import { addItemsToDay, visitFromPlace } from "@/features/trips";
import {
  SIGUNS,
  isSigunCode,
  type Place,
  type PlaceCategory,
  type SigunCode,
} from "@/shared/domain";
import { placeText } from "@/shared/lib/content-text";
import { cn } from "@/lib/utils";
import type { TripEdit } from "../hooks/use-trip-editor";

const ALL = "all";
const chipOn =
  "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:hover:bg-primary/90";

export interface PlaceSearchFilters {
  q: string;
  category: PlaceCategory | null;
  /** null = 전체 지역 */
  sigun: SigunCode | null;
}

interface PlaceSearchPanelProps {
  filters: PlaceSearchFilters;
  onFiltersChange: (next: Partial<PlaceSearchFilters>) => void;
  dayIndex: number;
  dayLabel: string;
  /** 이 일차에 이미 담은 등록 장소 id */
  addedIds: Set<string>;
  update: (edit: TripEdit) => void;
  className?: string;
}

export function PlaceSearchPanel({
  filters: { q, category, sigun },
  onFiltersChange,
  dayIndex,
  dayLabel,
  addedIds,
  update,
  className,
}: PlaceSearchPanelProps) {
  const { t, i18n } = useTranslation("planner");

  const add = (place: Place) => {
    update((trip) => addItemsToDay(trip, dayIndex, [visitFromPlace(place)]).trip);
    toast(t("addPlace.added", { name: placeText(place, i18n.language).name, day: dayLabel }));
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}>
      <PlaceSearchFilterBar filters={{ q, category, sigun }} onFiltersChange={onFiltersChange} />
      <PlaceResults
        key={`${q}|${category ?? ""}|${sigun ?? ""}`}
        q={q}
        sigun={sigun}
        category={category}
        addedIds={addedIds}
        onAdd={add}
      />
    </div>
  );
}

/** 이름 검색·지역·종류 조건 줄. extra는 지역 고르기 옆에 붙고, hideSigun이면 지역 고르기를 숨긴다(경로 근처 모드) */
export function PlaceSearchFilterBar({
  filters: { q, category, sigun },
  onFiltersChange,
  extra,
  hideSigun = false,
}: {
  filters: PlaceSearchFilters;
  onFiltersChange: (next: Partial<PlaceSearchFilters>) => void;
  extra?: ReactNode;
  hideSigun?: boolean;
}) {
  const { t } = useTranslation("planner");
  return (
    <>
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("aq");
          onFiltersChange({ q: typeof value === "string" ? value.trim() : "" });
        }}
      >
        {/* key: 바깥에서 조건이 바뀌면(뒤로 가기 등) 입력값도 따라간다 */}
        <Input
          key={q}
          name="aq"
          type="search"
          maxLength={50}
          defaultValue={q}
          placeholder={t("addPlace.placeholder")}
          aria-label={t("addPlace.nameLabel")}
          onChange={(e) => {
            if (e.target.value.trim() === "") onFiltersChange({ q: "" });
          }}
        />
        <Button type="submit" variant="outline">
          <SearchIcon size="sm" />
          {t("addPlace.search")}
        </Button>
      </form>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {!hideSigun && (
            <Select
              value={sigun ?? ALL}
              onValueChange={(v) => {
                onFiltersChange({ sigun: isSigunCode(v) ? v : null });
              }}
            >
              <SelectTrigger className="w-36" aria-label={t("addPlace.region")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("addPlace.allRegions")}</SelectItem>
                {SIGUNS.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {t(`sigun.${s.code}`, { ns: "common" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {extra}
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={category ?? ALL}
          onValueChange={(v) => {
            if (v) onFiltersChange({ category: PLACE_CATEGORIES.find((c) => c === v) ?? null });
          }}
          className="flex-wrap justify-start"
          aria-label={t("addPlace.category")}
        >
          <ToggleGroupItem value={ALL} className={chipOn}>
            {t("addPlace.allCategories")}
          </ToggleGroupItem>
          {PLACE_CATEGORIES.map((c) => (
            <ToggleGroupItem key={c} value={c} className={chipOn}>
              {t(`placeCategory.${c}`, { ns: "common" })}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </>
  );
}

function PlaceResults({
  q,
  sigun,
  category,
  addedIds,
  onAdd,
}: {
  q: string;
  sigun: SigunCode | null;
  category: PlaceCategory | null;
  addedIds: Set<string>;
  onAdd: (place: Place) => void;
}) {
  const { t, i18n } = useTranslation("planner");
  const places = usePlaces({
    sigun,
    categories: category ? [category] : [],
    subcategories: [],
    q,
  });
  const list = places.data?.pages.flatMap((p) => p.places) ?? [];

  if (places.isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (places.isError && !places.isFetchNextPageError) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-destructive text-sm">{t("addPlace.error")}</p>
        <Button variant="outline" size="sm" onClick={() => void places.refetch()}>
          {t("retry", { ns: "common" })}
        </Button>
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        {q ? t("addPlace.emptyQuery", { q }) : t("addPlace.empty")}
      </p>
    );
  }
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <ul className="border-border flex min-h-0 flex-col overflow-y-auto rounded-md border">
        {list.map((p) => {
          const added = addedIds.has(p.id);
          const photo = p.photos[0];
          return (
            <li
              key={p.id}
              className="border-border flex items-center gap-3 border-b px-3 py-2 last:border-b-0"
            >
              {photo ? (
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  className="size-12 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="bg-background-subtle size-12 shrink-0 rounded-md" />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  to={paths.placeDetail(p.id)}
                  className="truncate text-sm font-medium underline-offset-4 hover:underline"
                >
                  {placeText(p, i18n.language).name}
                </Link>
                <span className="text-muted-foreground text-xs">
                  {t(`sigun.${p.sigun}`, { ns: "common" })} ·{" "}
                  {t(`placeCategory.${p.category}`, { ns: "common" })}
                </span>
              </div>
              <Button
                size="sm"
                variant={added ? "ghost" : "outline"}
                disabled={added}
                onClick={() => {
                  onAdd(p);
                }}
              >
                {added ? t("addPlace.addedShort") : t("addPlace.add")}
              </Button>
            </li>
          );
        })}
      </ul>
      {places.hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          disabled={places.isFetchingNextPage}
          onClick={() => void places.fetchNextPage()}
        >
          {places.isFetchingNextPage ? t("addPlace.loading") : t("addPlace.more")}
        </Button>
      )}
    </div>
  );
}
