// 프로젝트 아이콘 스타일 — 단일 출처. 설치(bootstrap) 때 제품 컨셉·톤으로 정하고, README.md § 스타일 가이드와 함께 바꾼다.
// 값을 바꾸면 모든 아이콘이 함께 바뀐다 (화면 코드에서 strokeWidth 등을 따로 넘기지 않는다).
export const ICON_STYLE = {
  viewBox: "0 0 24 24",
  /** 선 두께 — 가늘수록 섬세·차분, 두꺼울수록 친근·또렷 (1.5 ~ 2.25) */
  strokeWidth: 1.5,
  /** 선 끝 — round: 부드러움 / square·butt: 단단함·정밀 */
  linecap: "round",
  /** 꺾임 — round: 부드러움 / miter: 날카로움 */
  linejoin: "round",
  /** 기본 채움 — 선 아이콘이면 "none". 면 아이콘 세트면 "currentColor"로 두고 glyph에서 stroke를 끈다 */
  fill: "none",
} as const;
