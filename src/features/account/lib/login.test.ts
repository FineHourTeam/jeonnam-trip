import { describe, expect, it } from "vitest";
import { loginFailureOf, returnPathOf } from "./login";

describe("loginFailureOf", () => {
  it("Firebase 에러 코드를 화면 사유로 나눈다", () => {
    expect(loginFailureOf({ code: "auth/popup-closed-by-user" })).toBe("cancelled");
    expect(loginFailureOf({ code: "auth/cancelled-popup-request" })).toBe("cancelled");
    expect(loginFailureOf({ code: "auth/popup-blocked" })).toBe("popup-blocked");
    expect(loginFailureOf({ code: "auth/network-request-failed" })).toBe("network");
    expect(loginFailureOf({ code: "auth/unauthorized-domain" })).toBe("unauthorized-domain");
  });

  it("모르는 에러는 unknown", () => {
    expect(loginFailureOf(new Error("boom"))).toBe("unknown");
    expect(loginFailureOf(null)).toBe("unknown");
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
