import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isSigunCode } from "@/shared/domain";
import ko from "@/locales/ko/explore.json";
import en from "@/locales/en/explore.json";
import ja from "@/locales/ja/explore.json";
import { HERO_SLIDES } from "./hero-slides";

describe("HERO_SLIDES", () => {
  it("사진 파일이 public/에 있고 키가 겹치지 않는다", () => {
    for (const s of HERO_SLIDES) expect(existsSync(resolve("public", `.${s.src}`))).toBe(true);
    expect(new Set(HERO_SLIDES.map((s) => s.key)).size).toBe(HERO_SLIDES.length);
  });

  it("시군 코드가 실제 값이고 출처가 비어 있지 않다", () => {
    for (const s of HERO_SLIDES) {
      expect(isSigunCode(s.sigun)).toBe(true);
      expect(s.credit.trim()).not.toBe("");
    }
  });

  it("캡션 이름이 세 언어 모두 있다", () => {
    for (const locale of [ko, en, ja]) {
      const names: Record<string, string> = locale.hero.places;
      for (const s of HERO_SLIDES) expect(names[s.key]).toBeTruthy();
    }
  });
});
