// 로그인 실패 사유별 안내 문구 — 로그인 화면(S13)과 카카오 콜백 화면이 같은 문구를 쓴다.
// 부르는 시점의 화면 언어로 만든다 (부르는 화면이 useTranslation으로 언어 변경 때 다시 그린다).
import i18n from "@/lib/i18n";
import { loginProviderName, type LoginFailure, type LoginProvider } from "./login";

export interface LoginCopy {
  title: string;
  description: string;
}

const FAILURE_KEY = {
  cancelled: "cancelled",
  "popup-blocked": "popupBlocked",
  network: "network",
  "unauthorized-domain": "unauthorizedDomain",
  "account-exists": "accountExists",
  expired: "expired",
  unknown: "unknown",
} as const satisfies Record<Exclude<LoginFailure, "provider-unavailable">, string>;

export function failureCopyOf(failure: LoginFailure, provider: LoginProvider): LoginCopy {
  if (failure !== "provider-unavailable") {
    const key = FAILURE_KEY[failure];
    return {
      title: i18n.t(`failure.${key}.title`, { ns: "account" }),
      description: i18n.t(`failure.${key}.description`, { ns: "account" }),
    };
  }
  const other = provider === "kakao" ? "google" : "kakao";
  return {
    title: i18n.t("failure.providerUnavailable.title", {
      ns: "account",
      provider: loginProviderName(provider),
    }),
    description: i18n.t("failure.providerUnavailable.description", {
      ns: "account",
      other: loginProviderName(other),
    }),
  };
}
