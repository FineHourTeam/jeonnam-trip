// CSS 미디어 쿼리 구독 — 숨긴 컨테이너에 그리면 크기가 0이 되는 지도처럼 "보일 때만 마운트"가 필요한 곳에 쓴다.
import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => {
        mql.removeEventListener("change", onChange);
      };
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
