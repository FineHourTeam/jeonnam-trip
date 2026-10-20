// S04 장소 목록 — 지역·종류·검색어(서버 조회)로 거르고 이름순으로 한 페이지씩 받는다 (1,000곳이 넘어 한 번에 받지 않는다).
// 고른 장소는 필터를 바꿔도 유지하고, 아래 막대에서 작성 중인 코스의 일차에 한꺼번에 담는다 (기능명세 §3).
import { useSearchParams } from "react-router";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlaceListQuery } from "../api/places-api";
import { PlaceAddToTrip } from "../components/place-add-to-trip";
import { PlaceCard } from "../components/place-card";
import { PlaceFilters } from "../components/place-filters";
import { usePlaceSelectionStore } from "../hooks/use-place-selection-store";
import { usePlaceCount, usePlaces } from "../hooks/use-places";
import { placeFilterParams, readPlaceFilter } from "../lib/place-filter";

const EMPTY: PlaceListQuery = { sigun: null, categories: [], q: "" };

export default function PlaceListPage() {
  const [params, setParams] = useSearchParams();
  const filter = readPlaceFilter(params);
  const places = usePlaces(filter);
  const count = usePlaceCount(filter);
  const selected = usePlaceSelectionStore((s) => s.selected);
  const toggle = usePlaceSelectionStore((s) => s.toggle);
  const clear = usePlaceSelectionStore((s) => s.clear);

  const update = (next: Partial<PlaceListQuery>) => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        const merged = { ...readPlaceFilter(prev), ...next };
        for (const [k, v] of Object.entries(placeFilterParams(merged))) {
          if (v) p.set(k, v);
          else p.delete(k);
        }
        return p;
      },
      { replace: true },
    );
  };
  const reset = () => {
    update(EMPTY);
  };
  const filtered = filter.sigun !== null || filter.categories.length > 0 || filter.q !== "";
  const list = places.data?.pages.flatMap((p) => p.places) ?? [];
  const selectedIds = new Set(selected.map((p) => p.id));

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-8">
      <Seo
        title="장소"
        description="전남 22개 시군의 관광지·식당·카페·숙소를 지역과 종류로 찾아 일정에 담아 보세요."
      />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-balance">전남 장소</h1>
        <p className="text-muted-foreground text-sm">
          가고 싶은 곳을 골라 작성 중인 코스의 원하는 일차에 담을 수 있어요.
        </p>
      </div>

      <PlaceFilters values={filter} onChange={update} onReset={reset} />

      <p className="text-sm font-medium" aria-live="polite">
        {count.isSuccess && `장소 ${count.data.toLocaleString("ko-KR")}곳`}
      </p>

      {places.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : places.isError && !places.isFetchNextPageError ? (
        <div className="flex flex-col items-start gap-3">
          <Alert variant="destructive">
            <AlertTitle>장소 목록을 불러오지 못했어요</AlertTitle>
            <AlertDescription>네트워크 연결을 확인한 뒤 다시 시도해 주세요.</AlertDescription>
          </Alert>
          <Button onClick={() => void places.refetch()}>다시 시도</Button>
        </div>
      ) : list.length === 0 ? (
        <div className="bg-background-subtle text-foreground flex flex-col items-center gap-3 rounded-lg px-4 py-10 text-center">
          <p className="font-medium">
            {filtered ? "조건에 맞는 장소가 없어요" : "아직 공개된 장소가 없어요"}
          </p>
          {filtered && (
            <>
              <p className="text-muted-foreground text-sm">
                지역이나 종류를 바꾸거나 이름 앞부분으로 다시 찾아보세요.
              </p>
              <Button variant="outline" onClick={reset}>
                조건 초기화
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {list.map((p) => (
              <li key={p.id}>
                <PlaceCard
                  place={p}
                  selected={selectedIds.has(p.id)}
                  onToggle={() => {
                    toggle(p);
                  }}
                />
              </li>
            ))}
          </ul>
          {places.isFetchNextPageError && (
            <p className="text-destructive text-sm">
              다음 장소를 불러오지 못했어요. 다시 시도해 주세요.
            </p>
          )}
          {places.hasNextPage && (
            <Button
              variant="outline"
              className="self-center"
              disabled={places.isFetchingNextPage}
              onClick={() => void places.fetchNextPage()}
            >
              {places.isFetchingNextPage ? "불러오는 중…" : "장소 더 보기"}
            </Button>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="border-border bg-background text-foreground sticky bottom-16 flex flex-col gap-3 rounded-lg border p-4 shadow-md md:bottom-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">고른 장소 {selected.length}곳</p>
            <Button variant="ghost" size="sm" onClick={clear}>
              선택 해제
            </Button>
          </div>
          <PlaceAddToTrip places={selected} onAdded={clear} />
        </div>
      )}
    </section>
  );
}
