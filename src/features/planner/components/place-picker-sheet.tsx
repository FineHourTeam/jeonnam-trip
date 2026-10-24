// 코스에 장소 넣기·교체하기 — 등록 장소 검색 / 보관함에서 꺼내오기 / 그날 축제 (S10 "장소 추가·보관함에서 꺼내오기", FES-05).
import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { AddIcon, CheckIcon, LockIcon, SearchIcon } from "@/components/icons";
import { EmptyState, ErrorState, RowListSkeleton } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EMPTY_PLACE_FILTER,
  matchesPlace,
  PlaceRow,
  useFestivals,
  usePlaces,
  usePlacesByIds,
} from "@/features/content";
import { useCustomPlaces, useSavedPlaces } from "@/features/library";
import { useCurrentUid, visitFromCustomPlace, visitFromFestival, visitFromPlace } from "@/features/trips";
import { sigunName, type SigunCode, type VisitItem } from "@/shared/domain";
import { formatDateShort } from "@/shared/lib/date";
import { cn } from "@/lib/utils";

function SearchTab({ siguns, inDay, onPick }: { siguns: SigunCode[]; inDay: Set<string>; onPick: (items: VisitItem[]) => void }) {
  const [sigun, setSigun] = useState<SigunCode | null>(siguns[0] ?? null);
  const [keyword, setKeyword] = useState("");
  const q = usePlaces({ sigun });
  const list = (q.data?.pages.flatMap((p) => p.items) ?? []).filter((p) => matchesPlace(p, { ...EMPTY_PLACE_FILTER, keyword }));
  return (
    <div className="flex flex-col gap-3">
      <InputGroup className="h-11 rounded-xl">
        <InputGroupAddon>
          <SearchIcon size="sm" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder="장소 이름으로 찾기"
          aria-label="등록 장소 검색"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
          }}
        />
      </InputGroup>
      {siguns.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {siguns.map((s) => (
            <Button key={s} size="sm" variant={s === sigun ? "default" : "outline"} onClick={() => { setSigun(s); }}>
              {sigunName(s)}
            </Button>
          ))}
        </div>
      ) : null}
      {q.isPending ? (
        <RowListSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} className="py-6" />
      ) : list.length === 0 ? (
        <EmptyState title="맞는 장소가 없어요" description="이름을 바꿔 찾거나 다른 지역을 골라 보세요." className="py-6" />
      ) : (
        <div className="flex flex-col gap-3">
          {list.slice(0, 40).map((p) => (
            <PlaceRow
              key={p.id}
              place={p}
              to={null}
              trailing={
                inDay.has(p.id) ? (
                  <Button size="touch" variant="outline" disabled aria-label={`${p.name} 이 일차에 있어요`}>
                    <CheckIcon size="sm" />
                    담음
                  </Button>
                ) : (
                  <Button size="touch" variant="outline" onClick={() => { onPick([visitFromPlace(p)]); }} aria-label={`${p.name} 담기`}>
                    <AddIcon size="sm" />
                    담기
                  </Button>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryTab({ single, inDay, onPick }: { single: boolean; inDay: Set<string>; onPick: (items: VisitItem[]) => void }) {
  const uid = useCurrentUid();
  const saved = useSavedPlaces();
  const custom = useCustomPlaces();
  const placeIds = (saved.data ?? []).flatMap((s) => (s.ref.kind === "place" ? [s.ref.placeId] : []));
  const places = usePlacesByIds(placeIds);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  if (!uid) {
    return <EmptyState title="로그인하면 보관함에서 꺼내올 수 있어요" description="작성 중인 코스는 그대로 남아요." className="py-6" />;
  }
  if (saved.isPending || places.isPending) return <RowListSkeleton />;
  if (saved.isError) return <ErrorState error={saved.error} onRetry={() => void saved.refetch()} className="py-6" />;
  const rows: { key: string; refId: string; label: string; note: string; item: () => VisitItem; place?: NonNullable<typeof places.data>[number] }[] = [];
  for (const s of saved.data) {
    if (s.ref.kind === "place") {
      const placeId = s.ref.placeId;
      const p = places.data?.find((x) => x.id === placeId);
      if (p) rows.push({ key: s.id, refId: p.id, label: p.name, note: s.memo, item: () => visitFromPlace(p), place: p });
    } else {
      const customId = s.ref.customPlaceId;
      const cp = custom.data?.find((x) => x.id === customId);
      if (cp)
        rows.push({
          key: s.id,
          refId: cp.id,
          label: cp.name,
          note: cp.location ? "내가 등록한 장소" : "내가 등록한 장소 · 위치 확인 필요",
          item: () => visitFromCustomPlace(cp),
        });
    }
  }
  if (rows.length === 0) return <EmptyState title="보관함이 비어 있어요" description="장소 화면에서 저장하면 여기서 꺼내올 수 있어요." className="py-6" />;
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => {
        const here = inDay.has(r.refId);
        return (
          <label key={r.key} className={cn("border-border flex items-center gap-3 rounded-xl border p-3", here ? "opacity-60" : "cursor-pointer")}>
            {single ? null : (
              <Checkbox
                disabled={here}
                checked={checked.has(r.key)}
                onCheckedChange={(v) => {
                  setChecked((prev) => {
                    const next = new Set(prev);
                    if (v === true) next.add(r.key);
                    else next.delete(r.key);
                    return next;
                  });
                }}
                aria-label={`${r.label} 선택`}
              />
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">{r.label}</span>
              {here ? (
                <span className="text-muted-foreground truncate text-sm">이 일차에 있어요</span>
              ) : r.note ? (
                <span className="text-muted-foreground truncate text-sm">{r.note}</span>
              ) : null}
            </span>
            {single ? (
              <Button size="touch" variant="outline" disabled={here} onClick={() => { onPick([r.item()]); }}>
                고르기
              </Button>
            ) : null}
          </label>
        );
      })}
      {single ? null : (
        <Button
          size="xl"
          disabled={checked.size === 0}
          onClick={() => {
            onPick(rows.filter((r) => checked.has(r.key)).map((r) => r.item()));
            setChecked(new Set());
          }}
        >
          {checked.size > 0 ? `${String(checked.size)}곳 꺼내오기` : "꺼내올 장소를 골라 주세요"}
        </Button>
      )}
    </div>
  );
}

function FestivalTab({ date, siguns, onPick }: { date: string; siguns: SigunCode[]; onPick: (items: VisitItem[]) => void }) {
  const q = useFestivals({ from: date, to: date });
  const list = (q.data ?? []).filter((f) => siguns.length === 0 || siguns.includes(f.sigun));
  if (q.isPending) return <RowListSkeleton count={2} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} className="py-6" />;
  if (list.length === 0) {
    return <EmptyState title={`${formatDateShort(date)}에 열리는 축제가 없어요`} description="축제가 없어도 일반 코스를 만들 수 있어요." className="py-6" />;
  }
  return (
    <div className="flex flex-col gap-4">
      {list.map((f) => {
        const cancelled = f.state === "cancelled";
        const programs = f.programs.filter((p) => p.date === date);
        return (
          <div key={f.id} className="border-border flex flex-col gap-2 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold">{f.name}</span>
              <span className="text-muted-foreground shrink-0 text-xs">{sigunName(f.sigun)}</span>
            </div>
            {cancelled ? (
              <p className="text-destructive-soft-foreground bg-destructive-soft rounded-lg p-2 text-sm">취소된 축제라 담을 수 없어요.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button size="touch" variant="outline" onClick={() => { onPick([visitFromFestival(f, date)]); }}>
                  일반 방문으로 담기
                </Button>
                {programs.map((p) => (
                  <Button key={p.id} size="touch" variant="outline" onClick={() => { onPick([visitFromFestival(f, date, p.id)]); }}>
                    <LockIcon size="sm" />
                    {p.start} {p.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PlacePickerSheet({
  open,
  onOpenChange,
  mode,
  date,
  siguns,
  dayItems,
  onPick,
  initialTab = "search",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialTab?: "search" | "library" | "festival";
  mode: "add" | "replace";
  date: string;
  siguns: SigunCode[];
  /** 고르는 일차에 이미 있는 방문 — 다시 담지 않게 표시한다 */
  dayItems: VisitItem[];
  onPick: (items: VisitItem[]) => void;
}) {
  const inDay = new Set(
    dayItems.flatMap((x) => (x.ref.kind === "place" ? [x.ref.placeId] : x.ref.kind === "custom" ? [x.ref.customPlaceId] : [])),
  );
  const pick = (items: VisitItem[]) => {
    onPick(items);
    onOpenChange(false);
  };
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "replace" ? "다른 장소로 바꾸기" : "장소 넣기"}
      description={`${formatDateShort(date)} 일정에 ${mode === "replace" ? "바꿔 넣고" : "넣고"} 시간을 다시 계산해요.`}
      className="h-[85dvh]"
    >
      <Tabs defaultValue={initialTab} className="pb-4">
        <TabsList className="w-full">
          <TabsTrigger value="search">장소 검색</TabsTrigger>
          <TabsTrigger value="library">보관함</TabsTrigger>
          <TabsTrigger value="festival">그날 축제</TabsTrigger>
        </TabsList>
        <TabsContent value="search" className="pt-3">
          <SearchTab siguns={siguns} inDay={inDay} onPick={pick} />
        </TabsContent>
        <TabsContent value="library" className="pt-3">
          <LibraryTab single={mode === "replace"} inDay={inDay} onPick={pick} />
        </TabsContent>
        <TabsContent value="festival" className="pt-3">
          <FestivalTab date={date} siguns={siguns} onPick={pick} />
        </TabsContent>
      </Tabs>
    </BottomSheet>
  );
}
