// 지도 인스턴스 훅 — 컨테이너 ref에 지도를 한 번 만들고 언마운트 때 정리한다 (외부 시스템 동기화 Effect).
import { useEffect, useRef, useState } from "react";
import { loadNaverMaps, useMapSdkStatus } from "../lib/naver-maps";

/** 전남 중심부 (지도 초기 위치 — 표시할 지점이 없을 때만) */
const JEONNAM_CENTER = { lat: 34.86, lng: 126.99 };

export function useNaverMap(options: { interactive?: boolean } = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<naver.maps.Map | null>(null);
  const status = useMapSdkStatus();
  const interactive = options.interactive ?? true;

  useEffect(() => {
    let disposed = false;
    let instance: naver.maps.Map | null = null;
    loadNaverMaps()
      .then((maps) => {
        if (disposed || !containerRef.current) return;
        instance = new maps.Map(containerRef.current, {
          center: new maps.LatLng(JEONNAM_CENTER.lat, JEONNAM_CENTER.lng),
          zoom: 9,
          minZoom: 7,
          zoomControl: interactive,
          zoomControlOptions: { position: maps.Position.RIGHT_BOTTOM },
          mapDataControl: false,
          scaleControl: false,
          scrollWheel: interactive,
          draggable: interactive,
        });
        setMap(instance);
      })
      .catch(() => {
        // 상태는 useMapSdkStatus가 화면에 알린다 (MapFrame)
      });
    return () => {
      disposed = true;
      instance?.destroy();
      setMap(null);
    };
  }, [interactive]);

  return { containerRef, map, status };
}

/** 번호 핀 DOM — 지도 SDK에 HTML 문자열 대신 요소를 넘긴다 */
export function pinElement(label: string, tone: "primary" | "muted" | "selected"): HTMLElement {
  const el = document.createElement("div");
  el.className =
    tone === "selected"
      ? "flex size-9 items-center justify-center rounded-full border-2 border-background bg-foreground text-background text-sm font-bold shadow-md"
      : tone === "primary"
        ? "flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground text-sm font-bold shadow-md"
        : "flex size-8 items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground text-sm font-bold shadow-md";
  el.textContent = label;
  return el;
}
