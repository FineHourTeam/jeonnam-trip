import { describe, expect, it } from "vitest";
import {
  externalOpenUrlOf,
  inAppBrowserOf,
  loginFailureOf,
  providerNameOf,
  returnPathOf,
} from "./login";

describe("loginFailureOf", () => {
  it("Firebase 에러 코드를 화면 사유로 나눈다", () => {
    expect(loginFailureOf({ code: "auth/popup-closed-by-user" })).toBe("cancelled");
    expect(loginFailureOf({ code: "auth/cancelled-popup-request" })).toBe("cancelled");
    expect(loginFailureOf({ code: "auth/popup-blocked" })).toBe("popup-blocked");
    expect(loginFailureOf({ code: "auth/network-request-failed" })).toBe("network");
    expect(loginFailureOf({ code: "auth/unauthorized-domain" })).toBe("unauthorized-domain");
  });

  it("콘솔에서 아직 켜지 않은 공급자는 provider-unavailable", () => {
    expect(loginFailureOf({ code: "auth/operation-not-allowed" })).toBe("provider-unavailable");
    expect(loginFailureOf({ code: "auth/configuration-not-found" })).toBe("provider-unavailable");
    expect(loginFailureOf({ code: "auth/invalid-provider-id" })).toBe("provider-unavailable");
    expect(loginFailureOf({ code: "auth/admin-restricted-operation" })).toBe(
      "provider-unavailable",
    );
  });

  it("같은 이메일로 다른 방법으로 가입한 계정은 account-exists", () => {
    expect(loginFailureOf({ code: "auth/account-exists-with-different-credential" })).toBe(
      "account-exists",
    );
  });

  it("모르는 에러는 unknown", () => {
    expect(loginFailureOf(new Error("boom"))).toBe("unknown");
    expect(loginFailureOf(null)).toBe("unknown");
  });
});

describe("providerNameOf", () => {
  it("providerId를 로그인 방법 이름으로 바꾼다", () => {
    expect(providerNameOf(["google.com"])).toBe("Google");
    expect(providerNameOf(["oidc.kakao"])).toBe("카카오");
    expect(providerNameOf(["oidc.kakao", "google.com"])).toBe("카카오 · Google");
  });

  it("모르는 방법이거나 비어 있으면 알 수 없음", () => {
    expect(providerNameOf(["password"])).toBe("알 수 없음");
    expect(providerNameOf([])).toBe("알 수 없음");
  });
});

describe("returnPathOf", () => {
  it("코스 편집이 넘긴 경로로 돌아간다", () => {
    expect(returnPathOf({ from: "/trips/draft" })).toBe("/trips/draft");
  });

  it("없거나 앱 밖·로그인 화면이면 홈", () => {
    expect(returnPathOf(null)).toBe("/");
    expect(returnPathOf({})).toBe("/");
    expect(returnPathOf({ from: "https://evil.example" })).toBe("/");
    expect(returnPathOf({ from: "//evil.example" })).toBe("/");
    expect(returnPathOf({ from: "/login" })).toBe("/");
  });
});

describe("inAppBrowserOf", () => {
  const KAKAO_IOS =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.0";
  const NAVER_ANDROID =
    "Mozilla/5.0 (Linux; Android 14; SM-S911N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.1.0)";
  const INSTA_IOS =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0";
  const CHROME_ANDROID =
    "Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
  const SAFARI_IOS =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

  it("앱 안 브라우저를 앱·OS별로 찾는다", () => {
    expect(inAppBrowserOf(KAKAO_IOS)).toEqual({ app: "kakaotalk", os: "ios" });
    expect(inAppBrowserOf(NAVER_ANDROID)).toEqual({ app: "other", os: "android" });
    expect(inAppBrowserOf(INSTA_IOS)).toEqual({ app: "other", os: "ios" });
  });

  it("일반 브라우저는 null", () => {
    expect(inAppBrowserOf(CHROME_ANDROID)).toBeNull();
    expect(inAppBrowserOf(SAFARI_IOS)).toBeNull();
  });

  it("카카오톡·안드로이드는 외부 브라우저 링크, iOS 일반 앱은 null", () => {
    const url = "https://jeonnam-trip.web.app/login";
    expect(externalOpenUrlOf({ app: "kakaotalk", os: "ios" }, url)).toBe(
      "kakaotalk://web/openExternal?url=https%3A%2F%2Fjeonnam-trip.web.app%2Flogin",
    );
    expect(externalOpenUrlOf({ app: "other", os: "android" }, url)).toBe(
      "intent://jeonnam-trip.web.app/login#Intent;scheme=https;package=com.android.chrome;end",
    );
    expect(externalOpenUrlOf({ app: "other", os: "ios" }, url)).toBeNull();
  });
});
