import { describe, expect, it } from "vitest";
import { buildHeroSlides } from "./hero-slides";

const place = (id: string, photos: string[]) => ({
  id,
  name: `장소 ${id}`,
  sigun: "mokpo" as const,
  photos,
});

describe("buildHeroSlides", () => {
  const config = [
    { placeId: "a", photo: 1 },
    { placeId: "b", photo: 0 },
    { placeId: "c", photo: 2 },
  ];

  it("고른 순서를 따르고 고른 번째 사진을 쓴다", () => {
    const slides = buildHeroSlides(
      [place("b", ["b0"]), place("a", ["a0", "a1"]), place("c", ["c0", "c1", "c2"])],
      config,
    );
    expect(slides.map((s) => s.src)).toEqual(["a1", "b0", "c2"]);
  });

  it("고른 번째 사진이 없으면 첫 사진을 쓴다", () => {
    expect(buildHeroSlides([place("c", ["c0"])], config)[0]?.src).toBe("c0");
  });

  it("불러오지 못한 장소와 사진 없는 장소는 뺀다", () => {
    const slides = buildHeroSlides([place("a", []), place("c", ["c0", "c1", "c2"])], config);
    expect(slides.map((s) => s.id)).toEqual(["c"]);
  });
});
