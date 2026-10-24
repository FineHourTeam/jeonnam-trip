// 네이버 지도 스크립트 로더 — 앱 전체에서 한 번만 불러오고, 상태(불러오는 중·준비·인증 실패·실패)를 공유한다.
// 인증 실패(navermap_authFailure)는 스크립트가 뜬 뒤에도 올 수 있어 별도 상태로 둔다 —
// NCP 콘솔의 "Web 서비스 URL"에 현재 주소가 없으면 발생한다 (docs/setup-checklist.md S6).
import { useSyncExternalStore } from "react";
import { env } from "@/lib/env";

export type MapSdkStatus = "idle" | "loading" | "ready" | "auth-failed" | "error";

let status: MapSdkStatus = "idle";
const listeners = new Set<() => void>();
let loading: Promise<typeof naver.maps> | null = null;

function setStatus(next: MapSdkStatus) {
  status = next;
  for (const l of listeners) l();
}

/** 스크립트를 아직 안 불러왔으면 undefined (전역 타입 선언과 달리 실제로는 없을 수 있다) */
export function naverSdk(): typeof naver.maps | undefined {
  return (window as unknown as { naver?: { maps?: typeof naver.maps } }).naver?.maps;
}

export function loadNaverMaps(): Promise<typeof naver.maps> {
  const ready = naverSdk();
  if (ready && status === "ready") return Promise.resolve(ready);
  loading ??= new Promise<typeof naver.maps>((resolve, reject) => {
    setStatus("loading");
    window.navermap_authFailure = () => {
      setStatus("auth-failed");
      reject(new Error("지도 인증에 실패했어요."));
    };
    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(env.VITE_NAVER_MAP_CLIENT_ID)}`;
    script.async = true;
    script.onload = () => {
      const maps = naverSdk();
      if (maps) {
        if (status !== "auth-failed") setStatus("ready");
        resolve(maps);
      } else {
        setStatus("error");
        loading = null;
        reject(new Error("지도를 불러오지 못했어요."));
      }
    };
    script.onerror = () => {
      setStatus("error");
      loading = null;
      script.remove();
      reject(new Error("지도를 불러오지 못했어요."));
    };
    document.head.appendChild(script);
  });
  return loading;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useMapSdkStatus(): MapSdkStatus {
  return useSyncExternalStore(subscribe, () => status);
}

/** CSS 변수 색(oklch 포함)을 지도 SDK가 받는 rgb() 문자열로 바꾼다 — 토큰 외 색을 쓰지 않기 위해 */
export function cssVarToRgb(varName: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!ctx || !value) return "currentColor";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${String(r)}, ${String(g)}, ${String(b)})`;
}

/** 외부 네이버 지도 웹에서 보기 — 지도 인증 실패·좌표 미확인 때의 대안 */
export function naverMapSearchUrl(query: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}
