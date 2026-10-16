// i18next 리소스 타입 선언 — t("...") 키 자동완성 + 오타 컴파일 에러.
// 새 네임스페이스를 추가하면 여기 resources에도 연결할 것.
import type { resources } from "../lib/i18n";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: (typeof resources)["ko"];
  }
}
