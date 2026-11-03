// 로그인 실패 사유별 안내 문구 — 로그인 화면(S13)과 카카오 콜백 화면이 같은 문구를 쓴다.
import { LOGIN_PROVIDER_NAME, type LoginFailure, type LoginProvider } from "./login";

export interface LoginCopy {
  title: string;
  description: string;
}

const FAILURE_COPY: Record<Exclude<LoginFailure, "provider-unavailable">, LoginCopy> = {
  cancelled: {
    title: "로그인을 취소했어요",
    description: "저장하려면 다시 로그인해주세요.",
  },
  "popup-blocked": {
    title: "로그인 창이 열리지 않았어요",
    description: "브라우저가 팝업을 막았어요. 주소창에서 팝업을 허용하고 다시 시도해주세요.",
  },
  network: {
    title: "로그인하지 못했어요",
    description: "네트워크 연결을 확인하고 다시 시도해주세요.",
  },
  "unauthorized-domain": {
    title: "이 주소에서는 로그인할 수 없어요",
    description: "머물전남 공식 주소에서 다시 시도해주세요.",
  },
  "account-exists": {
    title: "같은 이메일로 가입한 계정이 있어요",
    description: "처음 가입한 방법(Google 또는 카카오)으로 로그인해주세요.",
  },
  expired: {
    title: "로그인을 마치지 못했어요",
    description: "로그인 요청이 만료됐어요. 다시 로그인해주세요.",
  },
  unknown: {
    title: "로그인하지 못했어요",
    description: "잠시 후 다시 시도해주세요.",
  },
};

export function failureCopyOf(failure: LoginFailure, provider: LoginProvider): LoginCopy {
  if (failure !== "provider-unavailable") return FAILURE_COPY[failure];
  const other = provider === "kakao" ? "google" : "kakao";
  return {
    title: `${LOGIN_PROVIDER_NAME[provider]} 로그인을 아직 쓸 수 없어요`,
    description: `준비가 끝나면 바로 열어 둘게요. 지금은 ${LOGIN_PROVIDER_NAME[other]} 계정으로 로그인해주세요.`,
  };
}
