// 지도 컴포넌트 — 장소 하나(PlaceMap), 코스 일차(CourseMap: 번호 핀 + 실제 조회 경로), 위치 고르기(LocationPicker).
// 경로선은 실제 조회된 경로만 그린다. 조회 전·실패 구간은 점선 직선으로 "경로 아님"을 구분한다 (기능명세 §7).
import { useEffect, useRef } from "react";
import type { LatLng } from "@/shared/domain";
import { cssVarToRgb } from "../lib/naver-maps";
import { pinElement, useNaverMap } from "../hooks/use-naver-map";
import { MapFrame } from "./map-frame";

export function PlaceMap({
  location,
  label,
  className,
}: {
  location: LatLng;
  label: string;
  className?: string;
}) {
  const { containerRef, map, status } = useNaverMap({ interactive: true });
  useEffect(() => {
    if (!map) return;
    const maps = naver.maps;
    const pos = new maps.LatLng(location.lat, location.lng);
    map.setCenter(pos);
    map.setZoom(15);
    const marker = new maps.Marker({
      position: pos,
      map,
      title: label,
      icon: { content: pinElement("", "primary"), anchor: new maps.Point(16, 16) },
    });
    return () => {
      marker.setMap(null);
    };
  }, [map, location.lat, location.lng, label]);
  return (
    <MapFrame status={status} fallbackQuery={label} className={className}>
      <div
        ref={containerRef}
        className="size-full"
        aria-label={`${label} 위치 지도`}
        role="region"
      />
    </MapFrame>
  );
}

export interface CourseMapStop {
  id: string;
  label: string;
  name: string;
  location: LatLng | null;
}

export interface CourseMapLeg {
  /** 실제 조회된 경로 좌표. 없으면(조회 전·실패) 점선 직선 */
  path: LatLng[] | null;
  from: LatLng;
  to: LatLng;
}

export function CourseMap({
  stops,
  legs,
  selectedId,
  onSelect,
  className,
  fallbackQuery,
}: {
  stops: CourseMapStop[];
  legs: CourseMapLeg[];
  selectedId: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  fallbackQuery?: string;
}) {
  const { containerRef, map, status } = useNaverMap({ interactive: true });
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // 핀·경로 그리기 (데이터가 바뀌면 다시)
  useEffect(() => {
    if (!map) return;
    const maps = naver.maps;
    const primary = cssVarToRgb("--primary");
    const muted = cssVarToRgb("--muted-foreground");
    const overlays: { setMap: (m: naver.maps.Map | null) => void }[] = [];
    const listeners: object[] = [];
    const located = stops.filter(
      (s): s is CourseMapStop & { location: LatLng } => s.location !== null,
    );
    for (const s of located) {
      const marker = new maps.Marker({
        position: new maps.LatLng(s.location.lat, s.location.lng),
        map,
        title: s.name,
        zIndex: s.id === selectedId ? 100 : 10,
        icon: {
          content: pinElement(s.label, s.id === selectedId ? "selected" : "primary"),
          anchor: new maps.Point(s.id === selectedId ? 18 : 16, s.id === selectedId ? 18 : 16),
        },
      });
      listeners.push(
        maps.Event.addListener(marker, "click", () => {
          onSelectRef.current?.(s.id);
        }),
      );
      overlays.push(marker);
    }
    for (const leg of legs) {
      const real = leg.path && leg.path.length > 1;
      overlays.push(
        new maps.Polyline({
          map,
          path: (real ? (leg.path ?? []) : [leg.from, leg.to]).map(
            (p) => new maps.LatLng(p.lat, p.lng),
          ),
          strokeColor: real ? primary : muted,
          strokeWeight: real ? 5 : 3,
          strokeOpacity: real ? 0.85 : 0.6,
          strokeStyle: real ? "solid" : "shortdash",
          strokeLineCap: "round",
          strokeLineJoin: "round",
        }),
      );
    }
    return () => {
      for (const l of listeners) maps.Event.removeListener(l);
      for (const o of overlays) o.setMap(null);
    };
  }, [map, stops, legs, selectedId]);

  // 범위 맞추기 — 일차(핀 구성)가 바뀔 때만
  const boundsKey = stops
    .map((s) => (s.location ? `${String(s.location.lat)},${String(s.location.lng)}` : "-"))
    .join("|");
  useEffect(() => {
    if (!map) return;
    const maps = naver.maps;
    const pts = boundsKey
      .split("|")
      .filter((x) => x !== "-" && x !== "")
      .map((x) => x.split(",").map(Number));
    if (pts.length === 0) return;
    if (pts.length === 1) {
      const [lat = 0, lng = 0] = pts[0] ?? [];
      map.setCenter(new maps.LatLng(lat, lng));
      map.setZoom(14);
      return;
    }
    const bounds = new maps.LatLngBounds();
    for (const [lat = 0, lng = 0] of pts) bounds.extend(new maps.LatLng(lat, lng));
    map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
  }, [map, boundsKey]);

  // 선택한 장소로 이동
  useEffect(() => {
    if (!map || !selectedId) return;
    const s = stops.find((x) => x.id === selectedId);
    if (s?.location) map.panTo(new naver.maps.LatLng(s.location.lat, s.location.lng));
  }, [map, selectedId, stops]);

  return (
    <MapFrame status={status} fallbackQuery={fallbackQuery} className={className}>
      <div ref={containerRef} className="size-full" aria-label="코스 지도" role="region" />
    </MapFrame>
  );
}

/** 지도를 눌러 위치를 고른다 — 개인 장소의 정확한 위치 지정 (기능명세 §4 "지도 위치 선택") */
export function LocationPicker({
  value,
  onChange,
  className,
}: {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
  className?: string;
}) {
  const { containerRef, map, status } = useNaverMap({ interactive: true });
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const markerRef = useRef<naver.maps.Marker | null>(null);

  useEffect(() => {
    if (!map) return;
    const maps = naver.maps;
    const l = maps.Event.addListener(map, "click", (e) => {
      onChangeRef.current({ lat: e.coord.lat(), lng: e.coord.lng() });
    });
    return () => {
      maps.Event.removeListener(l);
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (!map || !value) return;
    const maps = naver.maps;
    const pos = new maps.LatLng(value.lat, value.lng);
    if (markerRef.current) markerRef.current.setPosition(pos);
    else
      markerRef.current = new maps.Marker({
        position: pos,
        map,
        icon: { content: pinElement("", "selected"), anchor: new maps.Point(18, 18) },
      });
  }, [map, value]);

  return (
    <MapFrame status={status} className={className}>
      <div ref={containerRef} className="size-full" aria-label="위치를 고를 지도" role="region" />
    </MapFrame>
  );
}
