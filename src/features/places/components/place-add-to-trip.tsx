// "일정에 추가" — 대상 코스(작성 중인 초안 또는 저장한 내 여행)와 일차를 골라 장소를 끝에 담는다 (기능명세 §3).
// 여러 곳을 한 번에 담을 수 있고, 그 일차에 이미 있는 장소는 빼고 안내한다.
// 담을 코스가 없으면 고른 장소를 들고 여행 만들기(S09)로 보낸다.
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  VersionConflictError,
  addItemsToDay,
  useCurrentUid,
  useMyTrips,
  useSaveTrip,
  useTripDraftStore,
  visitFromPlace,
} from "@/features/trips";
import type { Place, TripDay } from "@/shared/domain";
import { formatDateKo } from "@/shared/lib/date";
import { MAX_PLACES_PARAM } from "../lib/place-filter";

interface PlaceAddToTripProps {
  places: Place[];
  /** 담기에 성공한 뒤 (목록에서는 선택을 비운다) */
  onAdded?: () => void;
}

const DRAFT = "draft";

interface Target {
  key: string;
  label: string;
  title: string;
  days: TripDay[];
}

export function PlaceAddToTrip({ places, onAdded }: PlaceAddToTripProps) {
  const navigate = useNavigate();
  const draft = useTripDraftStore((s) => s.draft);
  const setDraft = useTripDraftStore((s) => s.setDraft);
  const uid = useCurrentUid();
  const myTrips = useMyTrips();
  const saveTrip = useSaveTrip();
  const [targetKey, setTargetKey] = useState(DRAFT);
  const [picked, setPicked] = useState("0");

  const trips = myTrips.data ?? [];
  const targets: Target[] = [
    ...(draft
      ? [{ key: DRAFT, label: `${draft.title} (작성 중)`, title: draft.title, days: draft.days }]
      : []),
    ...trips.map((t) => ({ key: t.id, label: t.title, title: t.title, days: t.days })),
  ];
  // ponytail: 여행 만들기로는 앞의 30곳까지만 넘긴다 (URL 길이) — 더 많이 고르는 일이 잦아지면 선택을 스토어로 넘길 것
  const newTripHref = `${paths.tripNew}?${new URLSearchParams({
    places: places
      .slice(0, MAX_PLACES_PARAM)
      .map((p) => p.id)
      .join(","),
  }).toString()}`;
  const newTripLink = (variant: "outline" | "ghost") => (
    <Button asChild variant={variant} size={variant === "ghost" ? "sm" : "default"}>
      <Link to={newTripHref}>이 장소로 새 여행 만들기</Link>
    </Button>
  );

  if (!draft && uid !== null && myTrips.isPending) {
    return <Skeleton className="h-16 w-full rounded-md" />;
  }
  const target = targets.find((t) => t.key === targetKey) ?? targets[0];
  if (!target) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-muted-foreground text-sm">
          {myTrips.isError
            ? "내 여행을 불러오지 못했어요. 다시 시도하거나 새 여행을 만들어 담아 주세요."
            : "담을 코스가 없어요. 여행을 만들면 고른 장소를 첫째 날에 담아 시작해요."}
        </p>
        <div className="flex flex-wrap gap-2">
          {newTripLink("outline")}
          {myTrips.isError && (
            <Button variant="ghost" onClick={() => void myTrips.refetch()}>
              다시 시도
            </Button>
          )}
        </div>
      </div>
    );
  }

  const dayIndex = Number(picked) < target.days.length ? Number(picked) : 0;
  const multi = places.length > 1;
  const id = multi ? "place-add-bulk" : "place-add";
  const day = `${String(dayIndex + 1)}일차`;

  const notifyAdded = (title: string, added: number, duplicates: number, to: string) => {
    const skipped = duplicates > 0 ? ` 이미 담긴 ${String(duplicates)}곳은 뺐어요.` : "";
    toast(`「${title}」 ${day}에 ${String(added)}곳을 담았어요.${skipped}`, {
      action: {
        label: "코스 보기",
        onClick: () => {
          void navigate(to);
        },
      },
    });
    onAdded?.();
  };
  const notifyAllDuplicate = () => {
    toast(multi ? `고른 장소가 모두 이미 ${day}에 담겨 있어요.` : `이미 ${day}에 담긴 장소예요.`);
  };

  const add = () => {
    const items = places.map(visitFromPlace);
    if (target.key === DRAFT && draft) {
      const result = addItemsToDay(draft, dayIndex, items);
      if (result.added.length === 0) {
        notifyAllDuplicate();
        return;
      }
      setDraft(result.trip);
      notifyAdded(draft.title, result.added.length, result.duplicates.length, paths.tripDraft);
      return;
    }
    const trip = trips.find((t) => t.id === target.key);
    if (!trip) return;
    const result = addItemsToDay(trip, dayIndex, items);
    if (result.added.length === 0) {
      notifyAllDuplicate();
      return;
    }
    saveTrip.mutate(result.trip, {
      onSuccess: (saved) => {
        notifyAdded(
          saved.title,
          result.added.length,
          result.duplicates.length,
          paths.tripEdit(saved.id),
        );
      },
      onError: (e) => {
        if (e instanceof VersionConflictError) {
          // 목록을 새로 받아 다음 시도가 최신 버전에 담기게 한다
          void myTrips.refetch();
          toast("다른 기기에서 먼저 저장된 코스예요. 최신 코스를 불러왔으니 다시 담아 주세요.");
        } else {
          toast("코스에 담지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
        }
      },
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-end gap-2">
        {targets.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-trip`}>코스</Label>
            <Select
              value={target.key}
              onValueChange={(v) => {
                setTargetKey(v);
                setPicked("0");
              }}
            >
              <SelectTrigger id={`${id}-trip`} className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targets.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-day`}>
            {targets.length > 1 ? "일차" : `「${target.title}」 코스`}
          </Label>
          <Select value={String(dayIndex)} onValueChange={setPicked}>
            <SelectTrigger id={`${id}-day`} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {target.days.map((d, i) => (
                <SelectItem key={d.date} value={String(i)}>
                  {i + 1}일차 · {formatDateKo(d.date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={add} disabled={places.length === 0 || saveTrip.isPending}>
          {saveTrip.isPending ? "담는 중…" : "일정에 추가"}
        </Button>
      </div>
      {newTripLink("ghost")}
    </div>
  );
}
