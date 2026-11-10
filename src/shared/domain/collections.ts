// Firestore 컬렉션 이름 단일 출처 — firestore.rules와 한 세트로 바꾼다.
// 운영 콘텐츠: 공개본 문서(status 필드) + 관리자 전용 수정 초안(contentDrafts).
// 사용자 데이터: trips·shares는 최상위(ownerUid 필드), 보관함·개인 장소·SNS 링크는 users/{uid} 하위.
export const COL = {
  places: "places",
  festivals: "festivals",
  creatorCourses: "creatorCourses",
  /** 공개 중인 콘텐츠의 수정 초안 — id: `${kind}__${contentId}` (관리자 전용) */
  contentDrafts: "contentDrafts",
  /** 관리자 명단 — 문서 id = uid. 콘솔·CLI로만 추가 (클라이언트 쓰기 불가) */
  admins: "admins",
  trips: "trips",
  shares: "shares",
  users: "users",
  /** users/{uid} 하위 */
  savedPlaces: "savedPlaces",
  customPlaces: "customPlaces",
  snsLinks: "snsLinks",
} as const;
