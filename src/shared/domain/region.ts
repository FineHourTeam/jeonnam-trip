// 전라남도 22개 시군 — 모든 콘텐츠(축제·장소·코스)의 지역 키 단일 출처 (REG-01).
// code는 Firestore에 저장되는 값이라 바꾸지 않는다. 표시명은 name만 사용.
export const SIGUNS = [
  { code: "mokpo", name: "목포시" },
  { code: "yeosu", name: "여수시" },
  { code: "suncheon", name: "순천시" },
  { code: "naju", name: "나주시" },
  { code: "gwangyang", name: "광양시" },
  { code: "damyang", name: "담양군" },
  { code: "gokseong", name: "곡성군" },
  { code: "gurye", name: "구례군" },
  { code: "goheung", name: "고흥군" },
  { code: "boseong", name: "보성군" },
  { code: "hwasun", name: "화순군" },
  { code: "jangheung", name: "장흥군" },
  { code: "gangjin", name: "강진군" },
  { code: "haenam", name: "해남군" },
  { code: "yeongam", name: "영암군" },
  { code: "muan", name: "무안군" },
  { code: "hampyeong", name: "함평군" },
  { code: "yeonggwang", name: "영광군" },
  { code: "jangseong", name: "장성군" },
  { code: "wando", name: "완도군" },
  { code: "jindo", name: "진도군" },
  { code: "sinan", name: "신안군" },
] as const;

export type SigunCode = (typeof SIGUNS)[number]["code"];

const SIGUN_NAME = new Map<string, string>(SIGUNS.map((s) => [s.code, s.name]));

export function sigunName(code: SigunCode): string {
  return SIGUN_NAME.get(code) ?? code;
}

export function isSigunCode(value: string): value is SigunCode {
  return SIGUN_NAME.has(value);
}
