// S07 등록 장소 찾기 — 이름 앞부분으로 공개 장소를 찾아 링크에 연결한다 (외부 검색 API 없음).
// SNS 폼 안에 있어 Enter가 폼 저장으로 이어지지 않게 직접 검색을 실행한다.
import { useState } from "react";
import { SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlaces } from "@/features/places";
import { PLACE_CATEGORY_LABEL, sigunName, type Place } from "@/shared/domain";

interface RegisteredPlaceSearchProps {
  /** 이미 연결한 등록 장소 id */
  linkedIds: Set<string>;
  onPick: (place: Place) => void;
}

export function RegisteredPlaceSearch({ linkedIds, onPick }: RegisteredPlaceSearchProps) {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const search = () => {
    setQ(input.trim());
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="sns-place-q">등록된 장소에서 찾기</Label>
      <div className="flex gap-2">
        <Input
          id="sns-place-q"
          type="search"
          maxLength={50}
          value={input}
          placeholder="예: 유달산"
          aria-describedby="sns-place-q-hint"
          onChange={(e) => {
            setInput(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            // 한글 조합을 끝내는 Enter는 검색하지 않는다 (마지막 글자가 아직 입력값에 없다)
            if (!e.nativeEvent.isComposing) search();
          }}
        />
        <Button type="button" variant="outline" onClick={search}>
          <SearchIcon size="sm" />
          검색
        </Button>
      </div>
      <p id="sns-place-q-hint" className="text-muted-foreground text-xs">
        입력한 글자로 이름이 시작하는 장소를 찾아요.
      </p>
      {q && <SearchResults key={q} q={q} linkedIds={linkedIds} onPick={onPick} />}
    </div>
  );
}

function SearchResults({ q, linkedIds, onPick }: RegisteredPlaceSearchProps & { q: string }) {
  const places = usePlaces({ sigun: null, categories: [], subcategories: [], q });
  const list = places.data?.pages.flatMap((p) => p.places) ?? [];

  if (places.isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (places.isError && !places.isFetchNextPageError) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-destructive text-sm">장소를 찾지 못했어요. 다시 시도해 주세요.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void places.refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        「{q}」 이름으로 시작하는 등록 장소가 없어요. 아래에서 직접 입력해 연결할 수 있어요.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <ul className="border-border flex max-h-72 flex-col overflow-y-auto rounded-md border">
        {list.map((p) => {
          const linked = linkedIds.has(p.id);
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
                type="button"
                size="sm"
                variant="outline"
                disabled={linked}
                onClick={() => {
                  onPick(p);
                }}
              >
                {linked ? "연결됨" : "연결하기"}
              </Button>
            </li>
          );
        })}
      </ul>
      {places.isFetchNextPageError && (
        <p className="text-destructive text-sm">
          다음 장소를 불러오지 못했어요. 다시 시도해 주세요.
        </p>
      )}
      {places.hasNextPage && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-center"
          disabled={places.isFetchingNextPage}
          onClick={() => void places.fetchNextPage()}
        >
          {places.isFetchingNextPage ? "불러오는 중…" : "장소 더 보기"}
        </Button>
      )}
    </div>
  );
}
