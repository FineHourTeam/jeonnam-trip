// 코스 지도 — 방문 순서 번호 마커 + 실제 조회된 경로 선. 직선으로 잇지 않는다 (기능명세 §7).
// 지도 인스턴스·오버레이는 외부 시스템이라 Effect로 동기화한다.
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LatLng } from "@/shared/domain";
import { useNaverMaps } from "../hooks/use-naver-maps";
import { naverMapsAuthFailed, type NMap, type NOverlay } from "../lib/naver-maps";

export interface CourseMapPoint {
  id: string;
  label: string;
  /** 표시 순번 (1부터) */
  order: number;
  location: LatLng | null;
}

interface CourseMapProps {
  points: CourseMapPoint[];
  /** 조회에 성공한 구간 경로만 */
  paths: LatLng[][];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

const JEONNAM_CENTER = { lat: 34.8161, lng: 126.4629 };

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function markerHtml(order: number, selected: boolean): string {
  const tone = selected ? "bg-foreground text-background" : "bg-primary text-primary-foreground";
  return `<div class="${tone} flex size-7 items-center justify-center rounded-full border-2 border-background text-xs font-semibold shadow-md">${String(order)}</div>`;
}

export function CourseMap({ points, paths, selectedId, onSelect, className }: CourseMapProps) {
  const sdk = useNaverMaps();
  const elRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<NMap | null>(null);
  const located = useMemo(
    () => points.filter((p): p is CourseMapPoint & { location: LatLng } => !!p.location),
    [points],
  );

  // 인증 실패 뒤의 SDK는 어떤 호출이든 예외를 던진다 — 그리기·정리 모두 건너뛴다 (지도 대신 오류 안내가 뜬다)
  useEffect(() => {
    const naver = sdk.data;
    if (!naver || !elRef.current || naverMapsAuthFailed()) return;
    setMap(
      new naver.Map(elRef.current, {
        center: new naver.LatLng(JEONNAM_CENTER.lat, JEONNAM_CENTER.lng),
        zoom: 9,
      }),
    );
  }, [sdk.data]);

  useEffect(() => {
    const naver = sdk.data;
    if (!naver || !map || naverMapsAuthFailed()) return;
    const overlays: NOverlay[] = [];
    const listeners: object[] = [];
    const color = cssVar("--primary");
    for (const path of paths) {
      overlays.push(
        new naver.Polyline({
          map,
          path: path.map((p) => new naver.LatLng(p.lat, p.lng)),
          strokeColor: color,
          strokeWeight: 4,
          strokeOpacity: 0.8,
        }),
      );
    }
    for (const p of located) {
      const marker = new naver.Marker({
        map,
        position: new naver.LatLng(p.location.lat, p.location.lng),
        title: p.label,
        zIndex: p.id === selectedId ? 10 : 1,
        icon: {
          content: markerHtml(p.order, p.id === selectedId),
          anchor: new naver.Point(14, 14),
        },
      });
      overlays.push(marker);
      if (onSelect) {
        listeners.push(
          naver.Event.addListener(marker, "click", () => {
            onSelect(p.id);
          }),
        );
      }
    }
    return () => {
      if (naverMapsAuthFailed()) return;
      for (const l of listeners) naver.Event.removeListener(l);
      for (const o of overlays) o.setMap(null);
    };
  }, [sdk.data, map, located, paths, selectedId, onSelect]);

  // 지점 구성이 바뀔 때만 화면 범위를 맞춘다 (선택만 바뀌면 그대로)
  const boundsKey = located
    .map((p) => `${String(p.location.lat)},${String(p.location.lng)}`)
    .join("|");
  useEffect(() => {
    const naver = sdk.data;
    if (!naver || !map || located.length === 0 || naverMapsAuthFailed()) return;
    const lats = located.map((p) => p.location.lat);
    const lngs = located.map((p) => p.location.lng);
    if (located.length === 1) {
      map.setCenter(new naver.LatLng(lats[0] ?? 0, lngs[0] ?? 0));
      map.setZoom(14);
      return;
    }
    map.fitBounds(
      new naver.LatLngBounds(
        new naver.LatLng(Math.min(...lats), Math.min(...lngs)),
        new naver.LatLng(Math.max(...lats), Math.max(...lngs)),
      ),
      { top: 40, right: 40, bottom: 40, left: 40 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boundsKey가 located 좌표를 대표한다
  }, [sdk.data, map, boundsKey]);

  if (sdk.isError) {
    return (
      <div
        className={cn(
          "bg-background-subtle text-foreground flex flex-col items-center justify-center gap-2 rounded-lg p-6 text-center",
          className,
        )}
      >
        <p className="text-sm">{sdk.error.message}</p>
        <Button variant="outline" size="sm" onClick={() => void sdk.refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {sdk.isPending && <Skeleton className="absolute inset-0" />}
      <div ref={elRef} className="size-full" role="region" aria-label="코스 지도" />
      {sdk.isSuccess && located.length === 0 && (
        <p className="bg-background text-foreground absolute inset-x-4 top-4 rounded-md p-3 text-center text-sm shadow-sm">
          위치가 확인된 장소가 없어 지도에 표시할 수 없어요.
        </p>
      )}
    </div>
  );
}
