// 네이버 지도 JS v3 로더 — 스크립트를 한 번만 넣고 같은 Promise를 돌려준다.
// Client ID는 공개 값(웹 서비스 URL로 제한). 콘솔에 등록된 도메인(jeonnam-trip.web.app)에서만 인증된다.
import { env } from "@/lib/env";

// 쓰는 API만 최소로 선언한다 (공식 타입 패키지를 들이지 않음)
export interface NLatLng {
  lat(): number;
  lng(): number;
}
export interface NOverlay {
  setMap(map: NMap | null): void;
}
export interface NMap {
  setCenter(c: NLatLng): void;
  setZoom(z: number): void;
  fitBounds(
    b: NBounds,
    margin?: { top: number; right: number; bottom: number; left: number },
  ): void;
  panTo(c: NLatLng): void;
}
export type NBounds = object;
export interface NaverMapsApi {
  Map: new (el: HTMLElement, opts: { center: NLatLng; zoom: number }) => NMap;
  LatLng: new (lat: number, lng: number) => NLatLng;
  LatLngBounds: new (sw: NLatLng, ne: NLatLng) => NBounds;
  Point: new (x: number, y: number) => object;
  Marker: new (opts: {
    position: NLatLng;
    map: NMap;
    title?: string;
    zIndex?: number;
    icon?: { content: string; anchor?: object };
  }) => NOverlay;
  Polyline: new (opts: {
    map: NMap;
    path: NLatLng[];
    strokeColor: string;
    strokeWeight: number;
    strokeOpacity?: number;
  }) => NOverlay;
  Event: {
    addListener(target: object, type: string, fn: () => void): object;
    removeListener(listener: object): void;
  };
}

declare global {
  interface Window {
    naver?: { maps: NaverMapsApi };
    navermap_authFailure?: () => void;
  }
}

export class NaverMapsLoadError extends Error {
  constructor(reason: "network" | "auth") {
    super(
      reason === "auth"
        ? "지도 인증에 실패했어요. 등록된 서비스 주소에서만 지도를 볼 수 있어요."
        : "지도를 불러오지 못했어요. 네트워크 연결을 확인해주세요.",
    );
    this.name = "NaverMapsLoadError";
  }
}

let loading: Promise<NaverMapsApi> | null = null;

export function loadNaverMaps(): Promise<NaverMapsApi> {
  if (window.naver?.maps) return Promise.resolve(window.naver.maps);
  loading ??= new Promise<NaverMapsApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(env.VITE_NAVER_MAP_CLIENT_ID)}`;
    script.async = true;
    window.navermap_authFailure = () => {
      reject(new NaverMapsLoadError("auth"));
    };
    script.onload = () => {
      if (window.naver?.maps) resolve(window.naver.maps);
      else reject(new NaverMapsLoadError("network"));
    };
    script.onerror = () => {
      loading = null; // 다시 시도할 수 있게
      script.remove();
      reject(new NaverMapsLoadError("network"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
