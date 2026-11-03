// S01 첫 화면 사진 — 전남 대표 명소를 골라 장소 문서의 사진을 그대로 쓴다.
// 고른 장소는 모두 남도여행길잡이에서 받은 사진이라 공공누리 제4유형 조건(출처 표시·변경 금지)을 따른다:
// 사진 파일은 손대지 않고, 출처는 사진 위에 늘 보여 준다. 다른 출처 사진을 고르면 locales/*/explore.json의 hero.credit도 함께 고친다.
import type { Place } from "@/shared/domain";

export interface HeroSlideConfig {
  placeId: string;
  /** 장소 사진 중 몇 번째를 쓸지 — 없으면 첫 사진 */
  photo: number;
}

export const HERO_SLIDES: readonly HeroSlideConfig[] = [
  { placeId: "nd-p-0000007968", photo: 2 }, // 순천만습지 — 노을
  { placeId: "nd-p-0000012898", photo: 0 }, // 목포 해상케이블카 — 해 질 녘
  { placeId: "nd-p-0000008432", photo: 1 }, // 보성 대한다원 — 차밭
  { placeId: "nd-p-0000010700", photo: 1 }, // 담양 메타세쿼이아 가로수길 — 단풍
  { placeId: "nd-p-0000010291", photo: 2 }, // 신안 홍도 — 바다
  { placeId: "nd-p-0000010555", photo: 0 }, // 담양 죽녹원 — 대숲
];

export interface HeroSlide {
  id: string;
  name: string;
  sigun: Place["sigun"];
  src: string;
}

/** 고른 순서대로, 불러온 장소(공개 중) 가운데 사진이 있는 것만 슬라이드로 만든다 */
export function buildHeroSlides(
  places: readonly Pick<Place, "id" | "name" | "sigun" | "photos">[],
  config: readonly HeroSlideConfig[] = HERO_SLIDES,
): HeroSlide[] {
  const byId = new Map(places.map((p) => [p.id, p]));
  return config.flatMap(({ placeId, photo }) => {
    const place = byId.get(placeId);
    const src = place?.photos[photo] ?? place?.photos[0];
    return place && src ? [{ id: place.id, name: place.name, sigun: place.sigun, src }] : [];
  });
}
