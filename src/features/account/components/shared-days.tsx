// 공개 코스의 일차별 일정 — 공유 미리보기(S12)와 받는 사람 화면이 같은 모양을 쓴다.
// 편집 화면(planner DayPanel)과 같은 시각 언어: 일차 탭 · 번호 카드 + 이동 구간 · 넓으면 오른쪽 지도.
// 폭은 화면이 아니라 이 컴포넌트를 담는 컨테이너 기준으로 나눈다 — 좁은 공유 설정 미리보기에서도 한 단으로 보인다.
// 지도·사진은 공유본 사본(장소 이름·종류·위치)과 공개 장소·축제 문서만 쓴다. 개인 메모·출발/종료 위치는 공유본에 없다.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { LoadingIcon, WarningIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFestival } from "@/features/festivals";
import { CourseMap, type CourseMapPoint } from "@/features/map";
import { usePlacesByIds } from "@/features/places";
import { LegRow, useDaySchedule, type ScheduledItem } from "@/features/planner";
import { cn } from "@/lib/utils";
import type { LatLng, SharedTrip } from "@/shared/domain";
import { formatDay, fromMinutes } from "@/shared/lib/date";

type SharedDay = SharedTrip["days"][number];
type SharedItem = SharedDay["items"][number];

interface SharedDaysProps {
  days: SharedDay[];
}

/** 등록된 장소·축제는 원문 출처가 있는 상세로 잇는다. 직접 입력한 장소는 링크 없음 */
function sourceHref(ref: SharedItem["ref"]): string | null {
  if (ref.kind === "place") return paths.placeDetail(ref.placeId);
  if (ref.kind === "festival") return paths.festivalDetail(ref.festivalId);
  return null;
}

export function SharedDays({ days }: SharedDaysProps) {
  const { t, i18n } = useTranslation("account");
  const [dayTab, setDayTab] = useState("0");
  // 사본에는 사진이 없어 등록 장소의 대표 사진을 한 번에 읽는다. 못 읽어도 일정은 그대로 보인다
  const placeIds = useMemo(
    () =>
      [
        ...new Set(
          days.flatMap((d) =>
            d.items.flatMap((x) => (x.ref.kind === "place" ? [x.ref.placeId] : [])),
          ),
        ),
      ].sort(),
    [days],
  );
  const places = usePlacesByIds(placeIds);
  const photos: PlacePhotos = {
    of: (ref) =>
      ref.kind === "place" ? places.data?.find((p) => p.id === ref.placeId)?.photos[0] : undefined,
    loading: places.isLoading,
  };
  const title = (d: SharedDay, i: number) => (
    <h3 className="font-semibold">
      {t("days.title", { n: i + 1, date: formatDay(d.date, i18n.language) })}
    </h3>
  );

  if (days.length === 0) return <p className="text-muted-foreground text-sm">{t("days.empty")}</p>;

  return (
    <div className="@container">
      {days.length === 1 && days[0] ? (
        <div className="flex flex-col gap-3">
          {title(days[0], 0)}
          <SharedDayPanel day={days[0]} photos={photos} />
        </div>
      ) : (
        <Tabs value={dayTab} onValueChange={setDayTab}>
          <TabsList aria-label={t("days.tabs")} className="max-w-full overflow-x-auto">
            {days.map((d, i) => (
              <TabsTrigger key={d.date} value={String(i)}>
                {t("days.tab", { n: i + 1 })}
              </TabsTrigger>
            ))}
          </TabsList>
          {days.map((d, i) => (
            <TabsContent key={d.date} value={String(i)} className="flex flex-col gap-3 pt-2">
              {title(d, i)}
              <SharedDayPanel day={d} photos={photos} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

interface PlacePhotos {
  of: (ref: SharedItem["ref"]) => string | undefined;
  loading: boolean;
}

/** 한 일차 — 편집 화면과 같은 시간 계산(useDaySchedule)으로 도착·체류·출발과 이동 구간을 보여 준다 */
function SharedDayPanel({ day, photos }: { day: SharedDay; photos: PlacePhotos }) {
  const { t } = useTranslation("account");
  // 공유본 항목은 메모만 빠진 VisitItem이고 출발/종료 위치가 없어 TripDay 그대로 계산된다
  const { schedule, legs, retryFailed } = useDaySchedule(day);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const points = useMemo<CourseMapPoint[]>(
    () =>
      day.items.map((x, i) => ({
        id: x.id,
        label: x.snapshot.name,
        order: i + 1,
        location: x.snapshot.location,
      })),
    [day.items],
  );
  const routes = useMemo<LatLng[][]>(
    () => legs.flatMap((l) => (l.status === "ok" ? [l.path] : [])),
    [legs],
  );

  if (day.items.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {t("days.empty")}
      </p>
    );
  }

  const unlocated = points.filter((p) => !p.location).length;
  const failed = legs.filter((l) => l.status === "failed").length;
  const pending = legs.some((l) => l.status === "pending");
  const drawable = legs.some((l) => l.status !== "skipped");

  return (
    <div className="flex flex-col gap-4 @3xl:flex-row">
      <ol className="flex min-w-0 flex-col @3xl:flex-1">
        {day.items.map((item, i) => {
          const scheduled = schedule.items[i];
          if (!scheduled) return null;
          const leg = i > 0 ? legs[i - 1] : undefined;
          return (
            <li key={item.id} className="flex flex-col">
              {leg && (
                <LegRow leg={leg} toFixed={item.fixedStart !== undefined} onRetry={retryFailed} />
              )}
              <SharedVisitCard
                order={i + 1}
                item={item}
                scheduled={scheduled}
                placePhoto={photos.of(item.ref)}
                placePhotoLoading={item.ref.kind === "place" && photos.loading}
                selected={selectedId === item.id}
                onSelect={() => {
                  setSelectedId(item.id);
                }}
              />
            </li>
          );
        })}
      </ol>

      <div className="flex min-w-0 flex-col gap-2 @3xl:sticky @3xl:top-20 @3xl:flex-1 @3xl:self-start">
        {unlocated < points.length && (
          <CourseMap
            points={points}
            paths={routes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            className="h-96 @3xl:h-160"
          />
        )}
        <div className="text-muted-foreground flex flex-col gap-1 text-sm">
          {drawable && <p>{t("days.legend")}</p>}
          {pending && (
            <p className="flex items-center gap-2">
              <LoadingIcon size="sm" className="animate-spin" />
              {t("days.loadingRoutes")}
            </p>
          )}
          {failed > 0 && (
            <p className="flex flex-wrap items-center gap-2">
              <WarningIcon size="sm" className="text-destructive" />
              {t("days.failedLegs", { count: failed })}
              <Button variant="outline" size="xs" onClick={retryFailed}>
                {t("retry", { ns: "common" })}
              </Button>
            </p>
          )}
          {unlocated > 0 && (
            <p className="flex items-center gap-2">
              <WarningIcon size="sm" className="text-warning-foreground" />
              {t("days.unlocated", { count: unlocated })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface SharedVisitCardProps {
  order: number;
  item: SharedItem;
  scheduled: ScheduledItem;
  placePhoto: string | undefined;
  placePhotoLoading: boolean;
  /** 지도에서 고른 마커의 장소 */
  selected: boolean;
  onSelect: () => void;
}

/** 편집 화면 VisitCard의 읽기 전용판 — 체류 조절·메뉴·메모 없음 */
function SharedVisitCard({
  order,
  item,
  scheduled: s,
  placePhoto,
  placePhotoLoading,
  selected,
  onSelect,
}: SharedVisitCardProps) {
  const { t } = useTranslation("account");
  const festival = useFestival(item.ref.kind === "festival" ? item.ref.festivalId : null);
  const photo = item.ref.kind === "festival" ? festival.data?.photos[0] : placePhoto;
  const photoLoading = item.ref.kind === "festival" ? festival.isLoading : placePhotoLoading;
  const { category, name, location } = item.snapshot;
  const categoryLabel =
    category === "festival" ? t("days.festival") : t(`placeCategory.${category}`, { ns: "common" });
  const href = sourceHref(item.ref);
  const clock = (n: number | null) => (n === null ? t("days.notCalculated") : fromMinutes(n));

  return (
    <article
      className={cn(
        "border-border bg-card text-card-foreground flex flex-col gap-3 rounded-lg border p-4",
        selected && "ring-ring ring-2",
      )}
      aria-label={t("days.cardLabel", { order, name })}
    >
      <header className="flex items-start gap-3">
        <button
          type="button"
          onClick={onSelect}
          className="bg-primary text-primary-foreground focus-visible:ring-ring flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
          aria-label={t("days.showOnMap", { name })}
        >
          {order}
        </button>
        {photoLoading ? (
          <Skeleton className="size-14 shrink-0 rounded-md" />
        ) : (
          photo && (
            // 이름이 바로 옆에 있어 사진은 장식으로 둔다
            <img
              src={photo}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-14 shrink-0 rounded-md object-cover"
            />
          )
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h4 className="font-semibold break-words">
            {href ? (
              <Link
                to={href}
                className="focus-visible:ring-ring rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {name}
              </Link>
            ) : (
              name
            )}
          </h4>
          <p className="text-muted-foreground text-sm">
            {categoryLabel}
            {location ? "" : ` · ${t("days.noLocation")}`}
          </p>
          {item.fixedStart !== undefined && (
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">
                {t("days.fixed", {
                  time: `${item.fixedStart}${item.fixedEnd ? `~${item.fixedEnd}` : ""}`,
                })}
              </Badge>
            </div>
          )}
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">{t("days.arrive")}</dt>
          <dd className="font-medium tabular-nums">{clock(s.arrive)}</dd>
          {s.waitMin > 0 && (
            <dd className="text-muted-foreground text-xs">{t("days.wait", { n: s.waitMin })}</dd>
          )}
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t("days.stay")}</dt>
          <dd className="font-medium tabular-nums">{t("days.minutes", { n: s.stayMin })}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t("days.depart")}</dt>
          <dd className="font-medium tabular-nums">{clock(s.depart)}</dd>
        </div>
      </dl>
    </article>
  );
}
