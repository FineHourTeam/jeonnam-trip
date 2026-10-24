// 개인 코스(여행) · 공유본 · 개인 보관함 도메인 타입.
// 원칙: 코스에 담을 때 장소 이름·위치·당시 영업정보의 사본(snapshot)과 원본 식별자를 함께 저장해
// 재열람 시 최신 정보와 비교한다 (기능명세 §1). 사본이 있다고 변경 안내를 생략하지 않는다.
import type { LatLng, OpeningHours, PlaceCategory, TimeRange } from "./content";
import type { SigunCode } from "./region";

/** 이동수단 — 이번 계약은 자동차만 (도보 MAP-02는 범위 밖) */
export type TravelMode = "car";

/** 여행 속도 — 생략(null)이면 기본 추천 규칙 */
export type TripPace = "relaxed" | "packed" | null;

export const MAX_TRIP_DAYS = 4;

/** 방문 대상 참조 */
export type VisitRef =
  | { kind: "place"; placeId: string }
  | { kind: "festival"; festivalId: string; programId?: string }
  | { kind: "custom"; customPlaceId: string };

/** 담을 당시의 정보 사본 — 최신 정보와 비교해 변경·취소를 안내하는 근거 */
export interface VisitSnapshot {
  name: string;
  category: PlaceCategory | "festival";
  location: LatLng | null;
  /** 장소: 영업정보 사본. 축제: 해당 날짜 운영 구간을 ranges 하나짜리 주간표로 넣지 않고 dayRanges에 */
  hours?: OpeningHours;
  /** 축제 방문일의 운영 구간 (null = 미확인) */
  dayRanges?: TimeRange[] | null;
  /** 축제 상태 사본 */
  festivalState?: "scheduled" | "changed" | "cancelled";
  /** 원본 updatedAt — 이 값이 바뀌었으면 재검토 안내 */
  sourceUpdatedAt?: string;
  /** 사용자가 "그대로 두기"로 확인한 원본 updatedAt — 같은 변경을 다시 안내하지 않는다 */
  ackUpdatedAt?: string;
  capturedAt: string;
}

/** 방문 항목 — 순서 번호와 별개인 고정 id (같은 장소 재방문도 별개 항목) */
export interface VisitItem {
  id: string;
  ref: VisitRef;
  snapshot: VisitSnapshot;
  /** 체류(분) */
  stayMin: number;
  /** 사용자가 직접 고정한 체류 — 계산이 임의로 줄이지 않는다 */
  stayLocked: boolean;
  /** 고정 시작 시각 "HH:mm" (축제 프로그램 등) — 재계산이 옮기지 않는다 */
  fixedStart?: string;
  /** 고정 프로그램이면 종료 시각 */
  fixedEnd?: string;
  /** 개인 메모 — 공유본에서 제외 */
  memo?: string;
}

export interface TripPoint {
  label: string;
  location: LatLng | null;
}

export interface TripDay {
  date: string;
  /** 일일 시작·종료 시각 "HH:mm" */
  startTime: string;
  endTime: string;
  /** 출발·종료 위치(숙소 등) — 개인 정보라 공유본에서 제외 */
  startPoint?: TripPoint | null;
  endPoint?: TripPoint | null;
  items: VisitItem[];
}

export type TripOrigin =
  | { kind: "blank" }
  | { kind: "recommend" }
  | { kind: "festival"; festivalId: string }
  | { kind: "creator"; courseId: string }
  | { kind: "share"; shareId: string };

export interface Trip {
  id: string;
  ownerUid: string;
  title: string;
  startDate: string;
  endDate: string;
  mode: TravelMode;
  pace: TripPace;
  siguns: SigunCode[];
  days: TripDay[];
  /** 미배치 후보 + 미배치 이유 */
  unplaced: (VisitItem & { reason?: string })[];
  origin: TripOrigin;
  /** 활성 공유본 id (없으면 null) */
  shareId: string | null;
  /** 저장 버전 — 오래된 저장이 최신을 덮어쓰지 않도록 비교 (낙관적 동시성) */
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** 로그인 전 작성 중인 코스 — 아직 서버 id·소유자가 없다 */
export type TripDraft = Omit<
  Trip,
  "id" | "ownerUid" | "version" | "createdAt" | "updatedAt" | "shareId"
>;

/** 공유 시점에 계산한 시각 사본 — 받는 사람 화면은 경로를 다시 조회하지 않고 이 값을 보여준다 */
export interface PublicItemTimes {
  /** "HH:mm" (24시 이후는 "25:10"처럼 그대로). null = 공유 시점에 미확정 */
  arrive: string | null;
  start: string | null;
  end: string | null;
  /** 이전 장소에서 오는 자동차 경로 (null = 첫 장소 또는 조회 실패·위치 미확인) */
  legBefore: { durationMin: number; distanceM: number } | null;
}

/** 공유본에 담는 방문 항목 — 개인 메모 제외 */
export type PublicVisitItem = Omit<VisitItem, "memo"> & { times?: PublicItemTimes };

/** 공개 시점 사본 — 개인 메모·개인 출발/종료 위치·개인용 SNS 링크 제외 */
export interface SharedTrip {
  id: string;
  ownerUid: string;
  tripId: string;
  active: boolean;
  title: string;
  startDate: string;
  endDate: string;
  mode: TravelMode;
  siguns: SigunCode[];
  days: { date: string; startTime: string; endTime: string; items: PublicVisitItem[] }[];
  /** 공개 버전 — "공유 내용 업데이트" 때 증가 */
  publishedVersion: number;
  publishedAt: string;
}

/** 개인 보관함 항목 (users/{uid}/savedPlaces/{id}) — 공통 장소와 별도 관리 */
export interface SavedPlace {
  id: string;
  ref: { kind: "place"; placeId: string } | { kind: "custom"; customPlaceId: string };
  tags: string[];
  memo: string;
  savedAt: string;
}

/** 사용자가 직접 입력한 개인 장소 (users/{uid}/customPlaces/{id}) */
export interface CustomPlace {
  id: string;
  name: string;
  sigun: SigunCode | null;
  category: PlaceCategory | null;
  address?: string;
  /** null = 위치 미확인 → 경로 계산 제외 */
  location: LatLng | null;
  createdAt: string;
}

/** SNS 원문 링크 (users/{uid}/snsLinks/{id}) — 장소와 다대다, 장소 연결 전에도 보관 */
export interface SnsLink {
  id: string;
  url: string;
  platform: "instagram" | "youtube" | "blog" | "other";
  title?: string;
  linked: ({ kind: "place"; placeId: string } | { kind: "custom"; customPlaceId: string })[];
  sigun: SigunCode | null;
  tags: string[];
  memo: string;
  createdAt: string;
}
