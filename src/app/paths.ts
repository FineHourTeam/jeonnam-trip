// 라우트 경로 단일 출처 — 컴포넌트에서 '/festivals/3' 문자열 하드코딩 금지 (rules.md § 라우팅).
// 이동은 navigate(paths.festivalDetail(id)) 형태로만. 라우터 정의(router.tsx)는 patterns를 쓴다.
export type AdminKind = "festivals" | "places" | "creators";

export const paths = {
  home: "/",
  festivals: "/festivals",
  festivalDetail: (id: string) => `/festivals/${id}`,
  places: "/places",
  placeDetail: (id: string) => `/places/${id}`,
  library: "/library",
  snsNew: "/library/sns/new",
  /** 보관한 SNS 링크 고치기 (장소 나중에 연결) — 같은 화면(S07)을 편집 모드로 */
  snsEdit: (linkId: string) =>
    `/library/sns/new?${new URLSearchParams({ link: linkId }).toString()}`,
  creators: "/creators",
  creatorDetail: (id: string) => `/creators/${id}`,
  /** 여행 시작 설정(S09). 쿼리: festival, date, program, creator, places(쉼표 구분 placeId) */
  tripNew: "/trips/new",
  /** 코스 편집(S10). id가 "draft"면 로그인 전 작성 중인 코스 */
  tripEdit: (id: string) => `/trips/${id}`,
  tripDraft: "/trips/draft",
  tripShare: (id: string) => `/trips/${id}/share`,
  myTrips: "/my-trips",
  sharedTrip: (shareId: string) => `/s/${shareId}`,
  login: "/login",
  account: "/account",
  admin: "/admin",
  adminList: (kind: AdminKind) => `/admin/${kind}`,
  adminNew: (kind: AdminKind) => `/admin/${kind}/new`,
  adminEdit: (kind: AdminKind, id: string) => `/admin/${kind}/${id}`,
} as const;

/** 라우터 정의용 패턴 (router.tsx 전용) */
export const patterns = {
  festivalDetail: "/festivals/:festivalId",
  placeDetail: "/places/:placeId",
  creatorDetail: "/creators/:courseId",
  tripEdit: "/trips/:tripId",
  tripShare: "/trips/:tripId/share",
  sharedTrip: "/s/:shareId",
  adminList: "/admin/:kind",
  adminNew: "/admin/:kind/new",
  adminEdit: "/admin/:kind/:contentId",
} as const;
