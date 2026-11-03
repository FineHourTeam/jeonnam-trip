// S08 코스 지도 — 고른 일차 하나만 번호 마커와 실제 자동차 경로로 보여 준다. 경로 조회는 유료라 고른 일차만 부른다.
// 장소 사이를 직선으로 잇지 않는다: 조회에 실패한 구간은 그리지 않고 짧게 안내한다 (기능명세 §7).
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LoadingIcon, WarningIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CourseMap, useDrivingLegs, type CourseMapPoint } from "@/features/map";
import type { CreatorCourse, LatLng, Place } from "@/shared/domain";
import { courseDayLegs, courseItemId, sortedDays } from "../lib/course";
import { placeText } from "@/shared/lib/content-text";

interface CourseDayMapProps {
  course: CreatorCourse;
  places: Record<string, Place>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CourseDayMap({ course, places, selectedId, onSelect }: CourseDayMapProps) {
  const { t, i18n } = useTranslation("creators");
  const days = useMemo(() => sortedDays(course.days), [course.days]);
  const [dayNo, setDayNo] = useState(days[0]?.day ?? 1);

  // 지도 오버레이는 points가 바뀔 때만 다시 그리므로 같은 일차·장소면 같은 배열을 돌려준다
  const points = useMemo<CourseMapPoint[]>(() => {
    const day = days.find((d) => d.day === dayNo) ?? days[0];
    if (!day) return [];
    return day.items.map((item, i) => {
      const place = places[item.placeId];
      return {
        id: courseItemId(day.day, i),
        label: place ? placeText(place, i18n.language).name : t("map.unavailablePlace"),
        order: i + 1,
        location: place?.location ?? null,
      };
    });
  }, [days, dayNo, places, t, i18n.language]);
  const requests = useMemo(() => courseDayLegs(points), [points]);
  const { legs, retryFailed } = useDrivingLegs(requests);
  const paths = useMemo<LatLng[][]>(
    () => legs.flatMap((l) => (l.status === "ok" ? [l.path] : [])),
    [legs],
  );

  const unlocated = points.filter((p) => !p.location).length;
  const failed = legs.filter((l) => l.status === "failed").length;
  const pending = legs.some((l) => l.status === "pending");

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{t("map.title")}</h2>
        {days.length > 1 && (
          <ToggleGroup
            type="single"
            variant="outline"
            value={String(dayNo)}
            onValueChange={(v) => {
              if (v) setDayNo(Number(v));
            }}
            aria-label={t("map.dayPicker")}
          >
            {days.map((d) => (
              <ToggleGroupItem key={d.day} value={String(d.day)}>
                {t("dayLabel", { day: d.day })}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>
      <CourseMap
        points={points}
        paths={paths}
        selectedId={selectedId}
        onSelect={onSelect}
        className="aspect-video w-full"
      />
      <div className="text-muted-foreground flex flex-col gap-1 text-sm">
        {requests.length > 0 && <p>{t("map.legend")}</p>}
        {pending && (
          <p className="flex items-center gap-2">
            <LoadingIcon size="sm" className="animate-spin" />
            {t("map.loadingRoutes")}
          </p>
        )}
        {failed > 0 && (
          <p className="flex flex-wrap items-center gap-2">
            <WarningIcon size="sm" className="text-destructive" />
            {t("map.failedLegs", { count: failed })}
            <Button variant="outline" size="xs" onClick={retryFailed}>
              {t("retry", { ns: "common" })}
            </Button>
          </p>
        )}
        {unlocated > 0 && (
          <p className="flex items-center gap-2">
            <WarningIcon size="sm" className="text-warning-foreground" />
            {t("map.unlocated", { count: unlocated })}
          </p>
        )}
      </div>
    </section>
  );
}
