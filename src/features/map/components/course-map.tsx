// 코스 지도 — 방문 순서 번호 마커 + 실제 조회된 경로 선. 직선으로 잇지 않는다 (기능명세 §7).
// 지도 인스턴스·오버레이는 외부 시스템이라 Effect로 동기화한다.
// 경로 선을 누르면 그 구간과 시작·끝 지점만 강조하고 나머지는 흐리게 둔다. 지도 빈 곳이나 마커를 누르면 풀린다.
// 후보(candidates)를 주면 번호 없는 흰 마커로 함께 그린다 — 일정 편집의 "검색" 탭이 찾은 장소를 보여 줄 때 쓴다.
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LatLng } from "@/shared/domain";
import { useNaverMaps } from "../hooks/use-naver-maps";
import {
  NaverMapsLoadError,
  naverMapsAuthFailed,
  type NMap,
  type NOverlay,
} from "../lib/naver-maps";

export interface CourseMapPoint {
  id: string;
  label: string;
  /** 표시 순번 (1부터) */
  order: number;
  location: LatLng | null;
}

/** 아직 담지 않은 후보 지점 — 번호 대신 짧은 글자(종류 첫 글자 등)를 보여 준다 */
export interface CourseMapCandidate {
  id: string;
  label: string;
  glyph: string;
  location: LatLng;
}

interface CourseMapProps {
  points: CourseMapPoint[];
  /** 조회에 성공한 구간 경로만 */
  paths: LatLng[][];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  candidates?: CourseMapCandidate[];
  /** 고른 후보 — 바뀌면 지도를 그 마커로 옮긴다 */
  selectedCandidateId?: string | null;
  onSelectCandidate?: (id: string) => void;
  className?: string;
}

const NO_CANDIDATES: CourseMapCandidate[] = [];

const JEONNAM_CENTER = { lat: 34.8161, lng: 126.4629 };

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// 장소 이름은 사용자·크리에이터 데이터라 HTML로 끼워 넣기 전에 이스케이프한다
function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

// 번호 원 오른쪽에 장소 이름 알약 — 마커가 겹쳐도 덜 지저분하게 폭을 제한하고 말줄임한다.
// anchor(14,14)가 번호 원 중심을 가리키도록 원을 맨 앞에 둔다.
function markerHtml(order: number, label: string, selected: boolean, dimmed: boolean): string {
  const tone = selected ? "bg-foreground text-background" : "bg-primary text-primary-foreground";
  return `<div class="${dimmed ? "opacity-30" : ""} flex items-center gap-1"><div class="${tone} flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-background text-xs font-semibold shadow-md">${String(order)}</div><span class="bg-background text-foreground max-w-32 truncate rounded-full px-2 py-0.5 text-xs font-medium shadow-md">${escapeHtml(label)}</span></div>`;
}

// 흰 원 + 글자. 고르면 주조색으로 채우고 이름 알약을 붙인다. anchor(12,12)가 원 중심
function candidateHtml(glyph: string, label: string, selected: boolean): string {
  const tone = selected
    ? "bg-primary text-primary-foreground border-background"
    : "bg-background text-primary border-primary";
  const name = selected
    ? `<span class="bg-background text-foreground max-w-32 truncate rounded-full px-2 py-0.5 text-xs font-medium shadow-md">${escapeHtml(label)}</span>`
    : "";
  return `<div class="flex items-center gap-1"><div class="${tone} flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold shadow-md">${escapeHtml(glyph)}</div>${name}</div>`;
}

/** 경로 끝 좌표에 가장 가까운 지점 — 경로는 지점 좌표에서 시작·끝나지만 도로에 붙어 조금 어긋난다 */
function nearestId(points: { id: string; location: LatLng }[], at: LatLng | undefined) {
  if (!at) return undefined;
  let best: { id: string; d: number } | undefined;
  for (const p of points) {
    const d = (p.location.lat - at.lat) ** 2 + (p.location.lng - at.lng) ** 2;
    if (!best || d < best.d) best = { id: p.id, d };
  }
  return best?.id;
}

export function CourseMap({
  points,
  paths,
  selectedId,
  onSelect,
  candidates = NO_CANDIDATES,
  selectedCandidateId,
  onSelectCandidate,
  className,
}: CourseMapProps) {
  const { t } = useTranslation("map");
  const sdk = useNaverMaps();
  const elRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<NMap | null>(null);
  const [picked, setPicked] = useState<LatLng[] | null>(null);
  // 선을 누르면 지도 클릭도 함께 일어난다 — 바로 뒤 지도 클릭 한 번은 해제로 보지 않는다
  const lineClicked = useRef(false);
  // 경로가 다시 계산되면 고른 선은 목록에서 사라지므로 저절로 풀린다
  const activePath = picked && paths.includes(picked) ? picked : null;
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
    const ends = activePath
      ? new Set([nearestId(located, activePath[0]), nearestId(located, activePath.at(-1))])
      : null;
    for (const path of paths) {
      const active = path === activePath;
      const line = new naver.Polyline({
        map,
        path: path.map((p) => new naver.LatLng(p.lat, p.lng)),
        strokeColor: color,
        strokeWeight: active ? 7 : 4,
        strokeOpacity: activePath && !active ? 0.25 : 0.8,
        clickable: true,
        zIndex: active ? 5 : 1,
      });
      overlays.push(line);
      listeners.push(
        naver.Event.addListener(line, "click", () => {
          lineClicked.current = true;
          setPicked(path);
        }),
      );
    }
    listeners.push(
      naver.Event.addListener(map, "click", () => {
        if (lineClicked.current) lineClicked.current = false;
        else setPicked(null);
      }),
    );
    for (const p of located) {
      const isEnd = ends?.has(p.id) ?? false;
      const marker = new naver.Marker({
        map,
        position: new naver.LatLng(p.location.lat, p.location.lng),
        title: p.label,
        zIndex: p.id === selectedId || isEnd ? 10 : 1,
        icon: {
          content: markerHtml(
            p.order,
            p.label,
            ends ? isEnd : p.id === selectedId,
            !!ends && !isEnd,
          ),
          anchor: new naver.Point(14, 14),
        },
      });
      overlays.push(marker);
      listeners.push(
        naver.Event.addListener(marker, "click", () => {
          setPicked(null);
          onSelect?.(p.id);
        }),
      );
    }
    return () => {
      if (naverMapsAuthFailed()) return;
      for (const l of listeners) naver.Event.removeListener(l);
      for (const o of overlays) o.setMap(null);
    };
  }, [sdk.data, map, located, paths, selectedId, onSelect, activePath]);

  useEffect(() => {
    const naver = sdk.data;
    if (!naver || !map || naverMapsAuthFailed()) return;
    const overlays: NOverlay[] = [];
    const listeners: object[] = [];
    for (const c of candidates) {
      const selected = c.id === selectedCandidateId;
      const marker = new naver.Marker({
        map,
        position: new naver.LatLng(c.location.lat, c.location.lng),
        title: c.label,
        // 번호 마커(1·10) 사이 — 고른 후보만 번호 마커 위로
        zIndex: selected ? 20 : 2,
        icon: {
          content: candidateHtml(c.glyph, c.label, selected),
          anchor: new naver.Point(12, 12),
        },
      });
      overlays.push(marker);
      listeners.push(
        naver.Event.addListener(marker, "click", () => {
          setPicked(null);
          onSelectCandidate?.(c.id);
        }),
      );
    }
    return () => {
      if (naverMapsAuthFailed()) return;
      for (const l of listeners) naver.Event.removeListener(l);
      for (const o of overlays) o.setMap(null);
    };
  }, [sdk.data, map, candidates, selectedCandidateId, onSelectCandidate]);

  // 후보를 고르면(목록·마커) 그 마커로 옮긴다 — 후보 목록만 바뀔 때는 움직이지 않는다
  const focus = candidates.find((c) => c.id === selectedCandidateId)?.location;
  useEffect(() => {
    const naver = sdk.data;
    if (!naver || !map || !focus || naverMapsAuthFailed()) return;
    map.panTo(new naver.LatLng(focus.lat, focus.lng));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 고른 후보가 바뀔 때만
  }, [sdk.data, map, selectedCandidateId]);

  // 지점 구성이 바뀔 때만 화면 범위를 맞춘다 (선택만 바뀌면 그대로). 후보가 있으면 후보까지 담는다
  const framed = useMemo(
    () => [...located.map((p) => p.location), ...candidates.map((c) => c.location)],
    [located, candidates],
  );
  const boundsKey = framed.map((p) => `${String(p.lat)},${String(p.lng)}`).join("|");
  useEffect(() => {
    const naver = sdk.data;
    if (!naver || !map || framed.length === 0 || naverMapsAuthFailed()) return;
    const lats = framed.map((p) => p.lat);
    const lngs = framed.map((p) => p.lng);
    if (framed.length === 1) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boundsKey가 framed 좌표를 대표한다
  }, [sdk.data, map, boundsKey]);

  if (sdk.isError) {
    return (
      <div
        className={cn(
          "bg-background-subtle text-foreground flex flex-col items-center justify-center gap-2 rounded-lg p-6 text-center",
          className,
        )}
      >
        <p className="text-sm">
          {sdk.error instanceof NaverMapsLoadError
            ? t(`load.${sdk.error.reason}`)
            : sdk.error.message}
        </p>
        <Button variant="outline" size="sm" onClick={() => void sdk.refetch()}>
          {t("retry", { ns: "common" })}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {sdk.isPending && <Skeleton className="absolute inset-0" />}
      <div ref={elRef} className="size-full" role="region" aria-label={t("course.label")} />
      {sdk.isSuccess && framed.length === 0 && (
        <p className="bg-background text-foreground absolute inset-x-4 top-4 rounded-md p-3 text-center text-sm shadow-sm">
          {t("course.noLocation")}
        </p>
      )}
    </div>
  );
}
