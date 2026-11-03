// 일정 화면에서 바로 장소 담기 — 이름으로 찾거나(전 지역) 여행 지역의 장소를 둘러보고 이 일차 끝에 담는다.
// 이름 검색과 지역 목록을 한 쿼리로 섞지 않는다: 이름 앞부분 검색은 전 지역, 검색어가 없을 때만 여행 지역 목록을 보여 준다.
import { useState } from "react";
import { toast } from "sonner";
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
import { Skeleton } from "@/components/ui/skeleton";
import { usePlaces } from "@/features/places";
import { addItemsToDay, visitFromPlace } from "@/features/trips";
import { PLACE_CATEGORY_LABEL, sigunName, type Place, type SigunCode } from "@/shared/domain";
import type { TripEdit } from "../hooks/use-trip-editor";

interface AddPlaceDialogProps {
  dayIndex: number;
  dayLabel: string;
  /** 이 일차에 이미 담은 등록 장소 id */
  addedIds: Set<string>;
  /** 검색어가 없을 때 보여 줄 여행 지역 (첫 지역) */
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
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");

  const add = (place: Place) => {
    update((t) => addItemsToDay(t, dayIndex, [visitFromPlace(place)]).trip);
    toast(`「${place.name}」 장소를 ${dayLabel}에 담았어요.`);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <AddIcon size="sm" />
          장소 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col">
        <DialogHeader>
          <DialogTitle>{dayLabel}에 장소 추가</DialogTitle>
          <DialogDescription>이름으로 찾거나 여행 지역의 장소를 골라 담아요.</DialogDescription>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(input.trim());
          }}
        >
          <Input
            type="search"
            maxLength={50}
            value={input}
            placeholder="예: 유달산"
            aria-label="장소 이름"
            onChange={(e) => {
              setInput(e.target.value);
              if (e.target.value.trim() === "") setQ("");
            }}
          />
          <Button type="submit" variant="outline">
            <SearchIcon size="sm" />
            검색
          </Button>
        </form>
        <PlaceResults key={q} q={q} sigun={sigun} addedIds={addedIds} onAdd={add} />
      </DialogContent>
    </Dialog>
  );
}

function PlaceResults({
  q,
  sigun,
  addedIds,
  onAdd,
}: {
  q: string;
  sigun: SigunCode | null;
  addedIds: Set<string>;
  onAdd: (place: Place) => void;
}) {
  const places = usePlaces({ sigun: q ? null : sigun, categories: [], subcategories: [], q });
  const list = places.data?.pages.flatMap((p) => p.places) ?? [];

  if (places.isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (places.isError && !places.isFetchNextPageError) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-destructive text-sm">장소를 불러오지 못했어요. 다시 시도해 주세요.</p>
        <Button variant="outline" size="sm" onClick={() => void places.refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        {q ? `「${q}」 이름으로 시작하는 장소가 없어요.` : "등록된 장소가 아직 없어요."}
      </p>
    );
  }
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <p className="text-muted-foreground text-xs">
        {q ? `「${q}」 검색 결과` : sigun ? `${sigunName(sigun)} 장소` : "전남 장소"}
      </p>
      <ul className="border-border flex min-h-0 flex-col overflow-y-auto rounded-md border">
        {list.map((p) => {
          const added = addedIds.has(p.id);
          return (
            <li
              key={p.id}
              className="border-border flex items-center gap-2 border-b px-3 py-2 last:border-b-0"
            >
              <span className="min-w-0 flex-1 text-sm">
                {p.name}
                <span className="text-muted-foreground">
                  {" "}
                  · {sigunName(p.sigun)} · {PLACE_CATEGORY_LABEL[p.category]}
                </span>
              </span>
              <Button
                size="sm"
                variant={added ? "ghost" : "outline"}
                disabled={added}
                onClick={() => {
                  onAdd(p);
                }}
              >
                {added ? "담았어요" : "담기"}
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
          {places.isFetchingNextPage ? "불러오는 중…" : "더 보기"}
        </Button>
      )}
    </div>
  );
}
