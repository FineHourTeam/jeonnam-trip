import { describe, expect, it, vi } from "vitest";
import {
  loadNaverMaps,
  naverMapsAuthFailed,
  NaverMapsLoadError,
  onNaverMapsAuthFailure,
  type NaverMapsApi,
} from "./naver-maps";

describe("loadNaverMaps", () => {
  it("스크립트가 뜬 뒤에 인증이 실패하면 구독자에게 알리고, 이후 로드는 실패로 돌려준다", async () => {
    const listener = vi.fn();
    const unsubscribe = onNaverMapsAuthFailure(listener);

    const loading = loadNaverMaps();
    const script = document.head.querySelector<HTMLScriptElement>(
      "script[src*='oapi.map.naver.com']",
    );
    expect(script).not.toBeNull();
    const fakeApi = {} as NaverMapsApi;
    window.naver = { maps: fakeApi };
    script?.dispatchEvent(new Event("load"));
    await expect(loading).resolves.toBe(fakeApi);
    expect(naverMapsAuthFailed()).toBe(false);

    // 네이버는 등록하지 않은 도메인이면 onload 뒤에 이 콜백을 부른다
    window.navermap_authFailure?.();
    expect(naverMapsAuthFailed()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    await expect(loadNaverMaps()).rejects.toBeInstanceOf(NaverMapsLoadError);

    unsubscribe();
    window.navermap_authFailure?.();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
