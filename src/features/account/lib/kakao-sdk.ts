// 카카오 JavaScript SDK 로더 — 로그인 버튼을 누를 때 한 번만 넣고 같은 Promise를 돌려준다.
// JS 키는 공개 값(카카오 콘솔의 JavaScript SDK 도메인으로 제한). 버전을 고정하고 SRI로 파일을 검증한다.
// ponytail: 버전 고정 — 새 SDK가 필요하면 src와 integrity를 함께 바꾼다 (developers.kakao.com/docs/ko/javascript/download)
import { env } from "@/lib/env";
import i18n from "@/lib/i18n";

const SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js";
const SDK_INTEGRITY = "sha384-BGX7Wb16GmRFagri4bLJV2DgipVZaU2AI812GZtHtHzzDQJnfHasDXN5houxv45w";

// 쓰는 API만 최소로 선언한다
export interface KakaoSdk {
  init(appKey: string): void;
  isInitialized(): boolean;
  Auth: {
    /** 카카오 로그인 화면으로 이동한다 (모바일은 카카오톡 앱으로 간편 로그인) */
    authorize(options: { redirectUri: string; state: string }): void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

export class KakaoSdkLoadError extends Error {
  constructor() {
    super(i18n.t("login.sdkLoadError", { ns: "account" }));
    this.name = "KakaoSdkLoadError";
  }
}

let loading: Promise<KakaoSdk> | null = null;

function ready(sdk: KakaoSdk): KakaoSdk {
  if (!sdk.isInitialized()) sdk.init(env.VITE_KAKAO_JS_KEY);
  return sdk;
}

export function loadKakaoSdk(): Promise<KakaoSdk> {
  if (window.Kakao) return Promise.resolve(ready(window.Kakao));
  loading ??= new Promise<KakaoSdk>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.integrity = SDK_INTEGRITY;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = () => {
      if (window.Kakao) resolve(ready(window.Kakao));
      else reject(new KakaoSdkLoadError());
    };
    script.onerror = () => {
      loading = null; // 다시 시도할 수 있게
      script.remove();
      reject(new KakaoSdkLoadError());
    };
    document.head.appendChild(script);
  });
  return loading;
}
