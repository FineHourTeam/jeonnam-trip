// 운영 콘텐츠(축제·장소·크리에이터 코스) 도메인 타입 — 관리자 입력, 사용자 조회, 일정 계산이 같은 모양을 쓴다.
// 저장 형식: 날짜 "YYYY-MM-DD"(한국 표준시 기준 달력 날짜), 시각 "HH:mm"(24시간), 일시 ISO 문자열.
// Firestore 문서 ↔ 이 타입 변환은 각 feature의 api/에서 한다 (Timestamp를 화면에 노출하지 않는다).
import type { SigunCode } from "./region";

/** 공통 공개 상태 — 공개 여부와 자동 배치 적격 여부는 별개다 (기능명세 §1) */
export type ContentStatus = "draft" | "published" | "hidden";

/** 항목별 확인 상태 — "확인됨"은 확인 당시 상태일 뿐 현재를 보증하지 않는다 */
export type VerifyState = "verified" | "unverified" | "conflict";

export interface FieldCheck {
  state: VerifyState;
  /** 자료 출처 (공식 홈페이지, 지자체 공지, 전화 확인 등) */
  source?: string;
  /** 마지막 확인일 YYYY-MM-DD — 사용자에게 그대로 노출 */
  checkedAt?: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * 하루 안의 영업 구간 하나. close가 open보다 작으면 자정을 넘는 구간(예: 18:00~02:00).
 * lastOrder는 주문·입장 마감 — 이용 종료 시각이 아니라 "그 시각 이후 시작 불가" 조건이다.
 */
export interface TimeRange {
  open: string;
  close: string;
  lastOrder?: string;
}

/**
 * 요일별 영업 구간. 키 0=일 … 6=토.
 * - null: 미확인 (자동 시간 배정 제외, 수동 후보로만)
 * - []: 휴무
 * - 여러 구간: 브레이크타임 사이로 나뉜 구간 (가로질러 연속 체류 배정 금지)
 */
export type WeeklyHours = Record<0 | 1 | 2 | 3 | 4 | 5 | 6, TimeRange[] | null>;

/** 특정 날짜 예외 (임시 휴무·명절·단축 영업). ranges가 []면 그날 휴무 */
export interface HoursException {
  date: string;
  ranges: TimeRange[];
  note?: string;
}

export interface OpeningHours {
  weekly: WeeklyHours;
  exceptions: HoursException[];
}

export type PlaceCategory = "cafe" | "restaurant" | "shop" | "attraction" | "lodging";

export const PLACE_CATEGORY_LABEL: Record<PlaceCategory, string> = {
  cafe: "카페",
  restaurant: "식당",
  shop: "상점",
  attraction: "관광지",
  lodging: "숙소",
};

/** 초기 기본 체류(분) 제안값 — 기능명세 §6. 계약 전 확정값이 아니므로 관리자 설정으로 교체될 수 있다 */
export const DEFAULT_STAY_MIN: Record<PlaceCategory | "festival", number> = {
  festival: 150,
  restaurant: 60,
  cafe: 45,
  shop: 40,
  attraction: 90,
  lodging: 0,
};

export interface SourceLink {
  platform: "official" | "instagram" | "youtube" | "blog" | "other";
  url: string;
  label?: string;
}

export interface Place {
  id: string;
  name: string;
  sigun: SigunCode;
  /** 운영팀이 정의한 동네/여행 권역 — 행정구역과 별개, 주소 없으면 자동 확정하지 않는다 */
  area?: string;
  category: PlaceCategory;
  subcategory?: string;
  /** 주관적 분위기 태그 (오션뷰·정원·한옥…) */
  moods: string[];
  /** 목적 태그 (사진·데이트·혼자 쉬기…) */
  purposes: string[];
  address?: string;
  /** null = 좌표 미확인 → 경로 계산 제외 */
  location: LatLng | null;
  hours: OpeningHours;
  /** 확인된 사실만. null = 미확인 */
  facts: {
    parking: boolean | null;
    reservation: boolean | null;
    pets: boolean | null;
  };
  phone?: string;
  /** 소개 글 (출처 원문 요약) */
  summary?: string;
  photos: string[];
  sources: SourceLink[];
  checks: {
    location: FieldCheck;
    hours: FieldCheck;
    info: FieldCheck;
  };
  /** 영어·일본어 번역 (scripts/apply-place-translations.mjs가 쓴다) — ko는 번역 당시 원문 */
  i18n?: PlaceTranslations;
  status: ContentStatus;
  updatedAt: string;
}

export interface PlaceText {
  name?: string;
  summary?: string;
  address?: string;
}

export interface PlaceTranslations {
  ko: PlaceText;
  en?: PlaceText;
  ja?: PlaceText;
}

export interface FestivalProgram {
  id: string;
  name: string;
  date: string;
  start: string;
  end: string;
  place?: string;
}

export interface FestivalDay {
  date: string;
  /** null = 그날 운영시간 미확인 → 수동 후보로만 추가 */
  ranges: TimeRange[] | null;
}

export type FestivalState = "scheduled" | "changed" | "cancelled";

export interface Festival {
  id: string;
  name: string;
  sigun: SigunCode;
  summary?: string;
  startDate: string;
  endDate: string;
  days: FestivalDay[];
  programs: FestivalProgram[];
  address?: string;
  location: LatLng | null;
  parking?: string;
  contact?: string;
  officialUrl?: string;
  photos: string[];
  /** 사진 출처 표시 (예: "사진: 신안군청 · 공공누리 제4유형") — 이용 조건상 사진 아래에 그대로 보여 준다 */
  photoCredit?: string;
  /** 변경·취소 상태 — 취소는 상세 열람 가능, 신규 일정 추가 차단 */
  state: FestivalState;
  stateNote?: string;
  checks: {
    schedule: FieldCheck;
    location: FieldCheck;
    info: FieldCheck;
  };
  status: ContentStatus;
  updatedAt: string;
}

/** 크리에이터 코스 순서 기준 — 영상 등장 순서만 확인됐으면 실제 여행 순서로 표현하지 않는다 */
export type CourseOrderBasis = "video_order" | "verified_trip" | "editor_suggested";

export interface CreatorCourse {
  id: string;
  title: string;
  creator: { name: string; channelUrl?: string };
  sourceUrl: string;
  siguns: SigunCode[];
  tags: string[];
  orderBasis: CourseOrderBasis;
  reviewedAt?: string;
  summary?: string;
  days: { day: number; items: { placeId: string; note?: string }[] }[];
  status: ContentStatus;
  updatedAt: string;
}
