// S07 등록 장소 찾기 — 이름 앞부분으로 공개 장소를 찾아 링크에 연결한다 (외부 검색 API 없음).
// SNS 폼 안에 있어 Enter가 폼 저장으로 이어지지 않게 직접 검색을 실행한다.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlaces } from "@/features/places";
import type { Place } from "@/shared/domain";

interface RegisteredPlaceSearchProps {
  /** 이미 연결한 등록 장소 id */
  linkedIds: Set<string>;
  onPick: (place: Place) => void;
}

export function RegisteredPlaceSearch({ linkedIds, onPick }: RegisteredPlaceSearchProps) {
  const { t } = useTranslation("library");
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const search = () => {
    setQ(input.trim());
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="sns-place-q">{t("search.label")}</Label>
      <div className="flex gap-2">
        <Input
          id="sns-place-q"
          type="search"
          maxLength={50}
          value={input}
          placeholder={t("search.placeholder")}
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
          {t("search.button")}
        </Button>
      </div>
      <p id="sns-place-q-hint" className="text-muted-foreground text-xs">
        {t("search.hint")}
      </p>
      {q && <SearchResults key={q} q={q} linkedIds={linkedIds} onPick={onPick} />}
    </div>
  );
}

function SearchResults({ q, linkedIds, onPick }: RegisteredPlaceSearchProps & { q: string }) {
  const { t } = useTranslation("library");
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
        <p className="text-destructive text-sm">{t("search.error")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void places.refetch()}>
          {t("retry", { ns: "common" })}
        </Button>
      </div>
    );
  }
  if (list.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("search.empty", { q })}</p>;
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
                  · {t(`sigun.${p.sigun}`, { ns: "common" })} ·{" "}
                  {t(`placeCategory.${p.category}`, { ns: "common" })}
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
                {linked ? t("search.linked") : t("search.link")}
              </Button>
            </li>
          );
        })}
      </ul>
      {places.isFetchNextPageError && (
        <p className="text-destructive text-sm">{t("search.nextError")}</p>
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
          {places.isFetchingNextPage ? t("loadingMore") : t("search.more")}
        </Button>
      )}
    </div>
  );
}
