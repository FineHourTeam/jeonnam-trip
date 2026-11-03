// react-i18next 초기화 — 한국어 기본 + 영어·일본어 (사용자 화면만, 관리자 화면은 한국어 리터럴).
// 네임스페이스 = 기능 이름(locales/{언어}/{기능}.json). 공용 문구는 common.
// 타입 안전: src/types/i18next.d.ts가 ko 리소스 타입을 선언 — 키 오타가 컴파일 에러가 된다.
// 고른 언어는 localStorage에 남겨 다시 열어도 유지한다.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import koAccount from "../locales/ko/account.json";
import koCommon from "../locales/ko/common.json";
import koCreators from "../locales/ko/creators.json";
import koExplore from "../locales/ko/explore.json";
import koFestivals from "../locales/ko/festivals.json";
import koLibrary from "../locales/ko/library.json";
import koMap from "../locales/ko/map.json";
import koPlaces from "../locales/ko/places.json";
import koPlanner from "../locales/ko/planner.json";
import koTrips from "../locales/ko/trips.json";
import enAccount from "../locales/en/account.json";
import enCommon from "../locales/en/common.json";
import enCreators from "../locales/en/creators.json";
import enExplore from "../locales/en/explore.json";
import enFestivals from "../locales/en/festivals.json";
import enLibrary from "../locales/en/library.json";
import enMap from "../locales/en/map.json";
import enPlaces from "../locales/en/places.json";
import enPlanner from "../locales/en/planner.json";
import enTrips from "../locales/en/trips.json";
import jaAccount from "../locales/ja/account.json";
import jaCommon from "../locales/ja/common.json";
import jaCreators from "../locales/ja/creators.json";
import jaExplore from "../locales/ja/explore.json";
import jaFestivals from "../locales/ja/festivals.json";
import jaLibrary from "../locales/ja/library.json";
import jaMap from "../locales/ja/map.json";
import jaPlaces from "../locales/ja/places.json";
import jaPlanner from "../locales/ja/planner.json";
import jaTrips from "../locales/ja/trips.json";

export const resources = {
  ko: {
    common: koCommon,
    account: koAccount,
    creators: koCreators,
    explore: koExplore,
    festivals: koFestivals,
    library: koLibrary,
    map: koMap,
    places: koPlaces,
    planner: koPlanner,
    trips: koTrips,
  },
  en: {
    common: enCommon,
    account: enAccount,
    creators: enCreators,
    explore: enExplore,
    festivals: enFestivals,
    library: enLibrary,
    map: enMap,
    places: enPlaces,
    planner: enPlanner,
    trips: enTrips,
  },
  ja: {
    common: jaCommon,
    account: jaAccount,
    creators: jaCreators,
    explore: jaExplore,
    festivals: jaFestivals,
    library: jaLibrary,
    map: jaMap,
    places: jaPlaces,
    planner: jaPlanner,
    trips: jaTrips,
  },
} as const;

export const LANGUAGES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];

const STORAGE_KEY = "lang";

function isLanguage(value: string | null): value is Language {
  return LANGUAGES.some((l) => l.code === value);
}

function storedLanguage(): Language {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isLanguage(v) ? v : "ko";
  } catch {
    return "ko"; // 사생활 보호 모드 등 저장소를 못 쓰면 기본 언어
  }
}

/** 지금 화면 언어 — 날짜·숫자 포맷에 넘긴다 */
export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : "ko";
}

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // 저장 못 해도 이번 방문 동안은 바뀐 언어로 보인다
  }
});

void i18n.use(initReactI18next).init({
  resources,
  lng: storedLanguage(),
  fallbackLng: "ko",
  supportedLngs: LANGUAGES.map((l) => l.code),
  defaultNS: "common",
  interpolation: {
    escapeValue: false, // React가 이미 XSS 이스케이프 담당
  },
});

export default i18n;
