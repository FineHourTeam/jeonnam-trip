// 일차 출발·종료 위치(숙소·역 등) — 등록 장소에서 찾거나 지도에서 찍어 고른다 (과업지시서 3 "출발지 설정", S10).
// 정하면 출발 위치 → 첫 장소, 마지막 장소 → 종료 위치 이동도 경로로 계산한다. 공유본에는 넣지 않는다 (개인 주소 보호).
import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { ArrowLeftIcon, PinIcon, SearchIcon } from "@/components/icons";
import { EmptyState, ErrorState, RowListSkeleton } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPTY_PLACE_FILTER, matchesPlace, PlaceRow, usePlaces } from "@/features/content";
import { LocationPicker } from "@/features/map";
import {
  sigunName,
  type LatLng,
  type SigunCode,
  type TripDay,
  type TripPoint,
} from "@/shared/domain";
import { formatDateShort } from "@/shared/lib/date";

type Which = "start" | "end";
const WHICH_LABEL: Record<Which, string> = { start: "출발 위치", end: "종료 위치" };

function samePoint(a: TripPoint | null, b: TripPoint | null): boolean {
  return (
    a?.label === b?.label &&
    a?.location?.lat === b?.location?.lat &&
    a?.location?.lng === b?.location?.lng
  );
}

function SearchPick({ siguns, onPick }: { siguns: SigunCode[]; onPick: (p: TripPoint) => void }) {
  const [sigun, setSigun] = useState<SigunCode | null>(siguns[0] ?? null);
  const [keyword, setKeyword] = useState("");
  const q = usePlaces({ sigun });
  const list = (q.data?.pages.flatMap((p) => p.items) ?? []).filter(
    (p) => p.location !== null && matchesPlace(p, { ...EMPTY_PLACE_FILTER, keyword }),
  );
  return (
    <div className="flex flex-col gap-3">
      <InputGroup className="h-11 rounded-xl">
        <InputGroupAddon>
          <SearchIcon size="sm" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder="숙소·장소 이름으로 찾기"
          aria-label="출발·종료 위치 검색"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
          }}
        />
      </InputGroup>
      {siguns.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {siguns.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === sigun ? "default" : "outline"}
              onClick={() => {
                setSigun(s);
              }}
            >
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
        <EmptyState
          title="맞는 장소가 없어요"
          description="이름을 바꿔 찾거나 지도에서 찍어 주세요."
          className="py-6"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {list.slice(0, 40).map((p) => (
            <PlaceRow
              key={p.id}
              place={p}
              to={null}
              trailing={
                <Button
                  size="touch"
                  variant="outline"
                  aria-label={`${p.name} 고르기`}
                  onClick={() => {
                    onPick({ label: p.name, location: p.location });
                  }}
                >
                  고르기
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MapPick({ onPick }: { onPick: (p: TripPoint) => void }) {
  const [label, setLabel] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="point-label">이름</Label>
        <Input
          id="point-label"
          inputSize="touch"
          maxLength={40}
          placeholder="예: 우리 숙소, 목포역"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
          }}
        />
      </div>
      <p className="text-muted-foreground text-sm">지도를 눌러 위치를 찍어 주세요.</p>
      <LocationPicker value={location} onChange={setLocation} className="h-64 w-full rounded-xl" />
      <Button
        size="xl"
        disabled={!label.trim() || !location}
        onClick={() => {
          if (location) onPick({ label: label.trim(), location });
        }}
      >
        {!location
          ? "지도에서 위치를 찍어 주세요"
          : !label.trim()
            ? "이름을 넣어 주세요"
            : "이 위치로 하기"}
      </Button>
    </div>
  );
}

export function DayPointsSheet({
  day,
  dayIndex,
  siguns,
  open,
  onOpenChange,
  onSave,
}: {
  day: TripDay;
  dayIndex: number;
  siguns: SigunCode[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (startPoint: TripPoint | null, endPoint: TripPoint | null) => void;
}) {
  const [start, setStart] = useState<TripPoint | null>(day.startPoint ?? null);
  const [end, setEnd] = useState<TripPoint | null>(day.endPoint ?? null);
  const [picking, setPicking] = useState<Which | null>(null);
  const setPoint = (w: Which, p: TripPoint | null) => {
    if (w === "start") setStart(p);
    else setEnd(p);
  };

  if (picking) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={`${WHICH_LABEL[picking]} 고르기`}
        description={`${String(dayIndex + 1)}일차 · ${formatDateShort(day.date)}`}
        className="h-[85dvh]"
      >
        <div className="flex flex-col gap-3 pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => {
              setPicking(null);
            }}
          >
            <ArrowLeftIcon size="sm" />
            돌아가기
          </Button>
          <Tabs defaultValue="search">
            <TabsList className="w-full">
              <TabsTrigger value="search">등록 장소에서</TabsTrigger>
              <TabsTrigger value="map">지도에서 찍기</TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="pt-3">
              <SearchPick
                siguns={siguns}
                onPick={(p) => {
                  setPoint(picking, p);
                  setPicking(null);
                }}
              />
            </TabsContent>
            <TabsContent value="map" className="pt-3">
              <MapPick
                onPick={(p) => {
                  setPoint(picking, p);
                  setPicking(null);
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${String(dayIndex + 1)}일차 출발 · 종료 위치`}
      description={`${formatDateShort(day.date)} · 숙소나 역처럼 하루를 시작하고 마칠 곳이에요.`}
      footer={
        <Button
          size="xl"
          onClick={() => {
            onSave(start, end);
            onOpenChange(false);
          }}
        >
          적용하기
        </Button>
      }
    >
      <div className="flex flex-col gap-3 pb-4">
        {(["start", "end"] as const).map((w) => {
          const p = w === "start" ? start : end;
          return (
            <div key={w} className="border-border flex items-center gap-3 rounded-xl border p-3">
              <PinIcon size="sm" className="text-muted-foreground shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-muted-foreground text-xs">{WHICH_LABEL[w]}</span>
                <span className="truncate font-semibold">{p?.label ?? "정하지 않음"}</span>
              </div>
              {p ? (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`${WHICH_LABEL[w]} 빼기`}
                  onClick={() => {
                    setPoint(w, null);
                  }}
                >
                  빼기
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                aria-label={`${WHICH_LABEL[w]} ${p ? "바꾸기" : "고르기"}`}
                onClick={() => {
                  setPicking(w);
                }}
              >
                {p ? "바꾸기" : "고르기"}
              </Button>
            </div>
          );
        })}
        {start && !samePoint(start, end) ? (
          <Button
            variant="outline"
            size="touch"
            onClick={() => {
              setEnd(start);
            }}
          >
            종료 위치를 출발 위치와 같게
          </Button>
        ) : null}
        <p className="text-muted-foreground text-sm leading-relaxed">
          정하면 하루 시작 시각에 출발 위치를 떠나, 첫 장소까지와 마지막 장소에서 종료 위치까지의
          이동도 계산해요. 공유할 때는 빠져요.
        </p>
      </div>
    </BottomSheet>
  );
}
