// 보관함 · 저장한 장소 — 지역·종류·개인 태그로 다시 찾고, 여러 곳을 골라 일차에 꺼내온다 (S06, PLC-03·04).
// 필터를 바꿔도 고른 장소는 유지한다. 저장 해제는 이미 담은 코스에 영향을 주지 않는다 (PLC-06).
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { CategoryIcon } from "@/components/content-meta";
import { BookmarkIcon, MoreIcon, PinIcon } from "@/components/icons";
import { StickyActionBar } from "@/components/page-chrome";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PlaceCard, usePlacesByIds } from "@/features/content";
import { AddToTripSheet, visitFromCustomPlace, visitFromPlace } from "@/features/trips";
import { errorMessage } from "@/lib/errors";
import {
  PERSONAL_TAGS,
  PLACE_CATEGORIES,
  PLACE_CATEGORY_LABEL,
  sigunName,
  type CustomPlace,
  type Place,
  type PlaceCategory,
  type SavedPlace,
  type SigunCode,
  type VisitItem,
} from "@/shared/domain";
import { useCustomPlaces, useSavedPlaces, useUnsavePlace } from "../hooks/use-library";
import { SavedPlaceEditSheet } from "./saved-place-edit-sheet";

interface Row {
  saved: SavedPlace;
  name: string;
  sigun: SigunCode | null;
  category: PlaceCategory | null;
  place?: Place;
  custom?: CustomPlace;
  toVisit: () => VisitItem;
}

export function LibraryPlaces() {
  const saved = useSavedPlaces();
  const custom = useCustomPlaces();
  const ids = (saved.data ?? []).flatMap((s) => (s.ref.kind === "place" ? [s.ref.placeId] : []));
  const places = usePlacesByIds(ids);
  const unsave = useUnsavePlace();
  const [sigun, setSigun] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [tag, setTag] = useState<string>("");
  const [selected, setSelected] = useState<Map<string, Row>>(new Map());
  const [editing, setEditing] = useState<Row | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  if (saved.isPending || (ids.length > 0 && places.isPending)) return <CardGridSkeleton count={4} />;
  if (saved.isError) return <ErrorState error={saved.error} onRetry={() => void saved.refetch()} />;

  const rows: Row[] = saved.data.flatMap((s): Row[] => {
    if (s.ref.kind === "place") {
      const id = s.ref.placeId;
      const p = places.data?.find((x) => x.id === id);
      // 공개가 중지된 장소는 보관함 목록에서만 빠진다 (담은 코스는 그대로)
      return p ? [{ saved: s, name: p.name, sigun: p.sigun, category: p.category, place: p, toVisit: () => visitFromPlace(p) }] : [];
    }
    const id = s.ref.customPlaceId;
    const c = custom.data?.find((x) => x.id === id);
    return c ? [{ saved: s, name: c.name, sigun: c.sigun, category: c.category, custom: c, toVisit: () => visitFromCustomPlace(c) }] : [];
  });

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<BookmarkIcon />}
        title="아직 저장한 장소가 없어요"
        description="장소 화면에서 저장하거나 SNS 링크로 장소를 모아 보세요."
        action={
          <Button asChild size="touch">
            <Link to={paths.places}>장소 둘러보기</Link>
          </Button>
        }
      />
    );
  }

  const siguns = [...new Set(rows.flatMap((r) => (r.sigun ? [r.sigun] : [])))];
  const list = rows.filter(
    (r) =>
      (sigun === "all" || r.sigun === sigun) &&
      (category === "all" || r.category === category) &&
      (!tag || r.saved.tags.includes(tag)),
  );

  function toggle(r: Row, on: boolean) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (on) next.set(r.saved.id, r);
      else next.delete(r.saved.id);
      return next;
    });
  }

  function onUnsave(r: Row) {
    unsave.mutate(r.saved.id, {
      onSuccess: () => {
        toggle(r, false);
        toast.success(`${r.name} 저장을 해제했어요. 담아 둔 코스는 그대로예요.`);
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  }

  const menu = (r: Row) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-touch" aria-label={`${r.name} 더보기`} className="bg-background/90 rounded-full border-0 shadow-sm">
          <MoreIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => { setEditing(r); }}>메모·태그 고치기</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => { onUnsave(r); }}>
          저장 해제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const selectedRows = [...selected.values()];
  return (
    <div className={selected.size > 0 ? "flex flex-col gap-4 pb-40 md:pb-24" : "flex flex-col gap-4"}>
      <div className="scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ToggleGroup type="single" variant="chip" size="chip" value={sigun} onValueChange={(v) => { if (v) setSigun(v); }} aria-label="지역" className="flex-nowrap">
          <ToggleGroupItem value="all">전체 지역</ToggleGroupItem>
          {siguns.map((s) => (
            <ToggleGroupItem key={s} value={s}>
              {sigunName(s)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ToggleGroup type="single" variant="chip" size="chip" value={category} onValueChange={(v) => { if (v) setCategory(v); }} aria-label="종류" className="flex-nowrap">
          <ToggleGroupItem value="all">전체 종류</ToggleGroupItem>
          {PLACE_CATEGORIES.map((c) => (
            <ToggleGroupItem key={c} value={c}>
              {PLACE_CATEGORY_LABEL[c]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup type="single" variant="chip" size="chip" value={tag} onValueChange={setTag} aria-label="개인 태그" className="flex-nowrap">
          {PERSONAL_TAGS.map((t) => (
            <ToggleGroupItem key={t} value={t}>
              #{t}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {list.length}곳{selected.size > 0 ? ` · ${String(selected.size)}곳 고름 (필터를 바꿔도 유지돼요)` : " · 카드를 골라 일정에 꺼내올 수 있어요"}
      </p>

      {list.length === 0 ? (
        <EmptyState
          title="조건에 맞는 저장 장소가 없어요"
          action={
            <Button variant="outline" size="touch" onClick={() => { setSigun("all"); setCategory("all"); setTag(""); }}>
              조건 초기화
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((r) =>
            r.place ? (
              <div key={r.saved.id} className="flex flex-col gap-1">
                <PlaceCard
                  place={r.place}
                  note={r.saved.memo || undefined}
                  action={menu(r)}
                  selectable
                  selected={selected.has(r.saved.id)}
                  onSelectedChange={(v) => { toggle(r, v); }}
                />
                {r.saved.tags.length > 0 ? <p className="text-primary px-0.5 text-xs">{r.saved.tags.map((t) => `#${t}`).join(" ")}</p> : null}
              </div>
            ) : (
              <article key={r.saved.id} className="border-border relative flex flex-col gap-2 rounded-xl border border-dashed p-3">
                <div className="bg-background-subtle text-muted-foreground flex aspect-4/3 items-center justify-center rounded-lg">
                  <CategoryIcon category={r.category ?? "attraction"} size="lg" />
                </div>
                <label htmlFor={`pick-${r.saved.id}`} className="flex items-start gap-2">
                  <Checkbox id={`pick-${r.saved.id}`} checked={selected.has(r.saved.id)} onCheckedChange={(v) => { toggle(r, v === true); }} aria-label={`${r.name} 선택`} className="mt-1" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{r.name}</span>
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <PinIcon size="sm" />
                      {r.custom?.location ? "내가 등록한 장소" : "위치 확인 필요"}
                      {r.sigun ? ` · ${sigunName(r.sigun)}` : " · 지역 미분류"}
                    </span>
                  </span>
                </label>
                <div className="absolute top-4 right-4">{menu(r)}</div>
              </article>
            ),
          )}
        </div>
      )}

      {selected.size > 0 ? (
        <StickyActionBar overTabBar className="md:fixed md:inset-x-0 md:bottom-0 md:border-t md:bg-background/95 md:px-4">
          <Button variant="outline" size="xl" onClick={() => { setSelected(new Map()); }}>
            선택 해제
          </Button>
          <Button size="xl" className="flex-1" onClick={() => { setAddOpen(true); }}>
            {selected.size}곳 일정에 담기
          </Button>
        </StickyActionBar>
      ) : null}
      <AddToTripSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        items={selectedRows.map((r) => r.toVisit())}
        newTripHref={`${paths.tripNew}?places=${selectedRows.flatMap((r) => (r.place ? [r.place.id] : [])).join(",")}`}
        onAdded={() => { setSelected(new Map()); }}
      />
      {editing ? (
        <SavedPlaceEditSheet
          saved={editing.saved}
          placeName={editing.name}
          open
          onOpenChange={(v) => { if (!v) setEditing(null); }}
        />
      ) : null}
    </div>
  );
}
