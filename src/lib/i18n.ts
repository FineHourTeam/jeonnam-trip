// react-i18next 초기화 — 한국어 기본, 확장 대비 (rules.md § 디자인 — 다국어).
// 공용 문구(확인/취소/저장 등)는 locales/ko/common.json에 추가해 재사용.
// 타입 안전: src/types/i18next.d.ts가 리소스 타입을 선언 — 키 오타가 컴파일 에러가 된다.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ko from "../locales/ko/common.json";

export const resources = {
  ko: { common: ko },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "ko",
  fallbackLng: "ko",
  defaultNS: "common",
  interpolation: {
    escapeValue: false, // React가 이미 XSS 이스케이프 담당
  },
});

export default i18n;
