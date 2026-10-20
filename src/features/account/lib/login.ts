// 로그인 화면 순수 로직 — 로그인 방법, Firebase 에러 코드 분류, 로그인 후 복귀 경로.
import { paths } from "@/app/paths";

export type LoginProvider = "kakao" | "google";

/** 카카오 로그인 사용자의 uid 접두사 — 서버(authKakao)가 커스텀 토큰을 kakao:<회원번호>로 만든다 */
export const KAKAO_UID_PREFIX = "kakao:";
const GOOGLE_PROVIDER_ID = "google.com";

export const LOGIN_PROVIDER_NAME: Record<LoginProvider, string> = {
  kakao: "카카오",
  google: "Google",
};

/**
 * 내 계정 화면에 보여줄 로그인 방법. Google은 providerData의 providerId로,
 * 카카오는 커스텀 토큰 로그인이라 providerData가 비어 있어 uid 접두사로 알아본다.
 */
export function providerNameOf(uid: string, providerIds: readonly string[]): string {
  if (uid.startsWith(KAKAO_UID_PREFIX)) return LOGIN_PROVIDER_NAME.kakao;
  if (providerIds.includes(GOOGLE_PROVIDER_ID)) return LOGIN_PROVIDER_NAME.google;
  return "알 수 없음";
}

/** 카카오 로그인 후 돌아올 주소 — 카카오 콘솔(JavaScript 키 > 리다이렉트 URI)과 서버 허용 목록에 같은 값이 있어야 한다 */
export function kakaoRedirectUriOf(origin: string): string {
  return `${origin}${paths.kakaoCallback}`;
}

export type KakaoCallback =
  | { kind: "code"; code: string }
  | { kind: "cancelled" }
  | { kind: "failed" }
  /** state가 없거나 로그인을 시작할 때 저장한 값과 다름 (다른 탭·오래된 주소·위조) */
  | { kind: "invalid" };

/** 카카오가 돌려준 콜백 쿼리 해석. expectedState = 로그인을 시작할 때 저장한 state */
export function kakaoCallbackOf(
  params: URLSearchParams,
  expectedState: string | null,
): KakaoCallback {
  const error = params.get("error");
  if (error) return { kind: error === "access_denied" ? "cancelled" : "failed" };
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !expectedState || state !== expectedState) return { kind: "invalid" };
  return { kind: "code", code };
}

export type LoginFailure =
  | "cancelled"
  | "popup-blocked"
  | "network"
  | "unauthorized-domain"
  | "provider-unavailable"
  | "account-exists"
  /** 카카오 인가 코드가 만료·재사용됐거나 로그인 요청을 확인하지 못함 — 다시 로그인하면 된다 */
  | "expired"
  | "unknown";

/** FirebaseError.code → 화면에 보여줄 실패 사유 */
export function loginFailureOf(err: unknown): LoginFailure {
  const code = typeof err === "object" && err !== null && "code" in err ? String(err.code) : "";
  switch (code) {
    // 콘솔에서 공급자를 켜기 전에 Firebase가 돌려주는 코드
    case "auth/operation-not-allowed":
    case "auth/configuration-not-found":
    case "auth/invalid-provider-id":
    case "auth/admin-restricted-operation":
      return "provider-unavailable";
    case "auth/account-exists-with-different-credential":
      return "account-exists";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "cancelled";
    case "auth/popup-blocked":
      return "popup-blocked";
    case "auth/network-request-failed":
    case "auth/timeout":
      return "network";
    case "auth/unauthorized-domain":
    case "auth/operation-not-supported-in-this-environment":
      return "unauthorized-domain";
    default:
      return "unknown";
  }
}

/** location.state.from → 로그인 후 돌아갈 앱 내부 경로 (없거나 이상하면 홈) */
export function returnPathOf(state: unknown): string {
  const from =
    typeof state === "object" && state !== null && "from" in state ? state.from : undefined;
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//")) return paths.home;
  if (from === paths.login) return paths.home;
  return from;
}

export interface InAppBrowser {
  app: "kakaotalk" | "other";
  os: "android" | "ios" | "other";
}

/** Google이 OAuth를 막는(403 disallowed_useragent) 앱 안 브라우저인지 — 아니면 null */
export function inAppBrowserOf(ua: string): InAppBrowser | null {
  const os = /android/i.test(ua) ? "android" : /iphone|ipad|ipod/i.test(ua) ? "ios" : "other";
  if (/kakaotalk/i.test(ua)) return { app: "kakaotalk", os };
  // 네이버 앱·인스타그램·페이스북·라인·다음 앱, 그 밖의 안드로이드 WebView("; wv)")
  if (/NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|\bLine\/|DaumApps|; wv\)/i.test(ua)) {
    return { app: "other", os };
  }
  return null;
}

/** 외부 브라우저로 여는 링크. iOS 일반 앱은 링크로 열 수 없어 null — 메뉴의 "Safari로 열기"를 안내한다 */
export function externalOpenUrlOf(browser: InAppBrowser, url: string): string | null {
  if (browser.app === "kakaotalk") {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  }
  if (browser.os === "android") {
    return `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
  }
  return null;
}
