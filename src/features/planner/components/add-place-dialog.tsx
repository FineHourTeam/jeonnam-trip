// 일정 화면에서 바로 장소 담기 — 지역·종류·이름으로 걸러 이 일차 끝에 담는다. 지역 기본값은 여행 지역(첫 지역).
// 창이 열린 상태와 조건은 주소(?add=일차&aq=&acat=&asig=)에 둔다: 장소 이름을 눌러 상세에 다녀와도 뒤로 가기로 같은 창이 다시 열린다.
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { AddIcon, SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type { TripEdit } from "../hooks/use-trip-editor";

const ALL = "all";
type FilterKey = "add" | "aq" | "acat" | "asig";

interface AddPlaceDialogProps {
  dayIndex: number;
  dayLabel: string;
  /** 이 일차에 이미 담은 등록 장소 id */
  addedIds: Set<string>;
  /** 지역 조건의 기본값 — 여행 지역(첫 지역) */
  sigun: SigunCode | null;
  update: (edit: TripEdit) => void;
}

export function AddPlaceDialog({
  dayIndex,
  dayLabel,
  addedIds,
  sigun,
  update,
}: AddPlaceDialogProps) {
  const { t, i18n } = useTranslation("planner");
  const [params, setParams] = useSearchParams();
  const open = params.get("add") === String(dayIndex);
  const q = (params.get("aq") ?? "").trim().slice(0, 50);
  const category = PLACE_CATEGORIES.find((c) => c === params.get("acat")) ?? null;
  const sigParam = params.get("asig");
  const filterSigun =
    sigParam === ALL ? null : sigParam && isSigunCode(sigParam) ? sigParam : sigun;

  const setParam = (next: Partial<Record<FilterKey, string | null>>) => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(next)) {
          if (v) p.set(k, v);
          else p.delete(k);
        }
        return p;
      },
      { replace: true },
    );
  };

  const add = (place: Place) => {
    update((trip) => addItemsToDay(trip, dayIndex, [visitFromPlace(place)]).trip);
    toast(t("addPlace.added", { name: placeText(place, i18n.language).name, day: dayLabel }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setParam(o ? { add: String(dayIndex) } : { add: null, aq: null, acat: null, asig: null });
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <AddIcon size="sm" />
          {t("addPlace.open")}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col">
        <DialogHeader>
          <DialogTitle>{t("addPlace.title", { day: dayLabel })}</DialogTitle>
          <DialogDescription>{t("addPlace.description")}</DialogDescription>
        </DialogHeader>
        <form
          role="search"
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("aq");
            setParam({ aq: typeof value === "string" ? value.trim() : null });
          }}
        >
          {/* key: 뒤로 가기로 주소가 바뀌면 입력값도 따라간다 */}
          <Input
            key={q}
            name="aq"
            type="search"
            maxLength={50}
            defaultValue={q}
            placeholder={t("addPlace.placeholder")}
            aria-label={t("addPlace.nameLabel")}
            onChange={(e) => {
              if (e.target.value.trim() === "") setParam({ aq: null });
            }}
          />
          <Button type="submit" variant="outline">
            <SearchIcon size="sm" />
            {t("addPlace.search")}
          </Button>
        </form>
        <div className="flex flex-col gap-2">
          <Select
            value={filterSigun ?? ALL}
            onValueChange={(v) => {
              setParam({ asig: v });
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
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={category ?? ALL}
            onValueChange={(v) => {
              if (v) setParam({ acat: v === ALL ? null : v });
            }}
            className="flex-wrap justify-start"
            aria-label={t("addPlace.category")}
          >
            <ToggleGroupItem
              value={ALL}
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:hover:bg-primary/90"
            >
              {t("addPlace.allCategories")}
            </ToggleGroupItem>
            {PLACE_CATEGORIES.map((c) => (
              <ToggleGroupItem
                key={c}
                value={c}
                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:hover:bg-primary/90"
              >
                {t(`placeCategory.${c}`, { ns: "common" })}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <PlaceResults
          key={`${q}|${category ?? ""}|${filterSigun ?? ""}`}
          q={q}
          sigun={filterSigun}
          category={category}
          addedIds={addedIds}
          onAdd={add}
        />
      </DialogContent>
    </Dialog>
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
