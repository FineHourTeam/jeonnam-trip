// S01 첫 화면 사진 — public/hero/ 에 올려 둔 고화질 WebP(가로 2560px)를 정해 둔 순서대로 넘긴다.
// 사진마다 출처가 달라 슬라이드마다 출처(credit)를 사진 위에 늘 보여 준다. CC BY 사진은 라이선스 링크(license)도 함께 단다.
// 사진을 바꾸거나 더하면 출처·라이선스를 여기서 같이 고치고, 캡션 이름은 locales/*/explore.json의 hero.places에 넣는다.
import type { SigunCode } from "@/shared/domain";

/** explore.json(ko·en·ja)의 hero.places 키 — 캡션 이름 */
export type HeroPlaceKey = "suncheon" | "boseong" | "jindo" | "mokpo" | "damyang" | "yeosu";

export interface HeroSlide {
  key: HeroPlaceKey;
  src: string;
  sigun: SigunCode;
  /** 출처 문구 — 고유명사라 번역하지 않는다 ("Photo:" 접두는 화면에서 hero.credit으로 붙인다) */
  credit: string;
  /** CC BY 등 표시 의무가 있는 라이선스 */
  license?: { label: string; url: string };
  /** 캡션을 이어 줄 장소 상세 — 없으면 링크 없이 글자만 */
  placeId?: string;
}

export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    key: "suncheon",
    src: "/hero/suncheon.webp",
    sigun: "suncheon",
    credit: "정규송 Nui MALAMA / Pexels",
    placeId: "nd-p-0000007968",
  },
  {
    key: "boseong",
    src: "/hero/boseong.webp",
    sigun: "boseong",
    credit: "lumoplank / Wikimedia Commons (CC0)",
    placeId: "nd-p-0000008432",
  },
  {
    key: "jindo",
    src: "/hero/jindo.webp",
    sigun: "jindo",
    credit: "martin bennie / Unsplash",
  },
  {
    key: "mokpo",
    src: "/hero/mokpo.webp",
    sigun: "mokpo",
    credit: "Sung Jin Cho / Unsplash",
  },
  {
    key: "damyang",
    src: "/hero/damyang.webp",
    sigun: "damyang",
    credit: "Sung Jin Cho / Unsplash",
    placeId: "nd-p-0000010555",
  },
  {
    key: "yeosu",
    src: "/hero/yeosu.webp",
    sigun: "yeosu",
    credit: "\u201cYeosu by night\u201d by thomas park",
    license: { label: "CC BY 2.0", url: "https://creativecommons.org/licenses/by/2.0/" },
  },
];
