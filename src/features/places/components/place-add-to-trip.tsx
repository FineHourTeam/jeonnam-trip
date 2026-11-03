// "일정에 추가" — 대상 코스(작성 중인 초안 또는 저장한 내 여행)와 일차를 골라 장소를 끝에 담는다 (기능명세 §3).
// 여러 곳을 한 번에 담을 수 있고, 그 일차에 이미 있는 장소는 빼고 안내한다.
// 담을 코스가 없으면 고른 장소를 들고 여행 만들기(S09)로 보낸다. 보관함(S06)은 직접 등록한 개인 장소도 함께 넘긴다.
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  visitFromCustomPlace,
  visitFromPlace,
} from "@/features/trips";
import type { CustomPlace, Place, TripDay } from "@/shared/domain";
import { formatDay } from "@/shared/lib/date";
import { MAX_PLACES_PARAM } from "../lib/place-filter";

interface PlaceAddToTripProps {
  places: Place[];
  /** 직접 등록한 개인 장소 (보관함) — 새 여행 만들기 주소로는 넘기지 못한다 */
  customPlaces?: CustomPlace[];
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

export function PlaceAddToTrip({ places, customPlaces = [], onAdded }: PlaceAddToTripProps) {
  const { t, i18n } = useTranslation("places");
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
      ? [
          {
            key: DRAFT,
            label: t("addToTrip.drafting", { title: draft.title }),
            title: draft.title,
            days: draft.days,
          },
        ]
      : []),
    ...trips.map((t) => ({ key: t.id, label: t.title, title: t.title, days: t.days })),
  ];
  // ponytail: 여행 만들기로는 앞의 30곳까지만 넘긴다 (URL 길이) — 더 많이 고르는 일이 잦아지면 선택을 스토어로 넘길 것
  const newTripHref =
    places.length === 0
      ? paths.tripNew
      : `${paths.tripNew}?${new URLSearchParams({
          places: places
            .slice(0, MAX_PLACES_PARAM)
            .map((p) => p.id)
            .join(","),
        }).toString()}`;
  const newTripLink = (variant: "outline" | "ghost") => (
    <Button asChild variant={variant} size={variant === "ghost" ? "sm" : "default"}>
      <Link to={newTripHref}>
        {places.length > 0 ? t("addToTrip.newTripWithPlaces") : t("addToTrip.newTrip")}
      </Link>
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
          {myTrips.isError ? t("addToTrip.loadTripsError") : t("addToTrip.noTarget")}
          {customPlaces.length > 0 && t("addToTrip.customPlacesNote")}
        </p>
        <div className="flex flex-wrap gap-2">
          {newTripLink("outline")}
          {myTrips.isError && (
            <Button variant="ghost" onClick={() => void myTrips.refetch()}>
              {t("retry", { ns: "common" })}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const dayIndex = Number(picked) < target.days.length ? Number(picked) : 0;
  const count = places.length + customPlaces.length;
  const multi = count > 1;
  const id = multi ? "place-add-bulk" : "place-add";
  const day = t("addToTrip.day", { day: dayIndex + 1 });

  const notifyAdded = (title: string, added: number, duplicates: number, to: string) => {
    const skipped = duplicates > 0 ? t("addToTrip.skipped", { count: duplicates }) : "";
    toast(t("addToTrip.added", { title, day, count: added }) + skipped, {
      action: {
        label: t("addToTrip.viewCourse"),
        onClick: () => {
          void navigate(to);
        },
      },
    });
    onAdded?.();
  };
  const notifyAllDuplicate = () => {
    toast(multi ? t("addToTrip.allDuplicateMulti", { day }) : t("addToTrip.allDuplicate", { day }));
  };

  const add = () => {
    const items = [...places.map(visitFromPlace), ...customPlaces.map(visitFromCustomPlace)];
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
          toast(t("addToTrip.conflict"));
        } else {
          toast(t("addToTrip.saveError"));
        }
      },
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-end gap-2">
        {targets.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-trip`}>{t("addToTrip.course")}</Label>
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
            {targets.length > 1
              ? t("addToTrip.dayLabel")
              : t("addToTrip.courseOf", { title: target.title })}
          </Label>
          <Select value={String(dayIndex)} onValueChange={setPicked}>
            <SelectTrigger id={`${id}-day`} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {target.days.map((d, i) => (
                <SelectItem key={d.date} value={String(i)}>
                  {t("addToTrip.dayOption", {
                    day: t("addToTrip.day", { day: i + 1 }),
                    date: formatDay(d.date, i18n.language),
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={add} disabled={count === 0 || saveTrip.isPending}>
          {saveTrip.isPending ? t("addToTrip.adding") : t("addToTrip.add")}
        </Button>
      </div>
      {newTripLink("ghost")}
    </div>
  );
}
