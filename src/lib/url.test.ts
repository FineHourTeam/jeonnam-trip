import { describe, expect, test } from "vitest";
import { detectSnsPlatform, safeHref, validateSnsUrl } from "./url";

describe("safeHref", () => {
  test("http/https만 허용하고 javascript: 같은 URI는 막는다", () => {
    expect(safeHref("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,hi")).toBeNull();
    expect(safeHref("")).toBeNull();
  });
});

describe("validateSnsUrl", () => {
  test("스킴이 없으면 https로 보완하고, 형식·길이를 검사한다", () => {
    expect(validateSnsUrl("instagram.com/p/abc")).toEqual({
      ok: true,
      href: "https://instagram.com/p/abc",
    });
    expect(validateSnsUrl("그냥 글자").ok).toBe(false);
    expect(validateSnsUrl(`https://a.com/${"x".repeat(2100)}`).ok).toBe(false);
    expect(validateSnsUrl("   ").ok).toBe(false);
  });

  test("플랫폼을 호스트로 추정한다", () => {
    expect(detectSnsPlatform("https://www.instagram.com/p/1")).toBe("instagram");
    expect(detectSnsPlatform("https://youtu.be/abc")).toBe("youtube");
    expect(detectSnsPlatform("https://m.blog.naver.com/x")).toBe("blog");
    expect(detectSnsPlatform("https://example.com")).toBe("other");
  });
});
