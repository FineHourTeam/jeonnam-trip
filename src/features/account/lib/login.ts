// 로그인 화면 순수 로직 — Firebase 에러 코드 분류와 로그인 후 복귀 경로.
import { paths } from "@/app/paths";

export type LoginFailure =
  "cancelled" | "popup-blocked" | "network" | "unauthorized-domain" | "unknown";

/** FirebaseError.code → 화면에 보여줄 실패 사유 */
export function loginFailureOf(err: unknown): LoginFailure {
  const code = typeof err === "object" && err !== null && "code" in err ? String(err.code) : "";
  switch (code) {
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
