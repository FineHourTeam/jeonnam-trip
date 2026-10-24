// 환경변수 단일 검증 지점 — import.meta.env를 앱 코드에서 직접 읽지 않는다.
// 빌드에 필요한 변수가 빠지면 배포 후 흰 화면 대신 "여기서, 즉시, 명확하게" 실패한다
// (unknown-unknowns #49).
//
// ⚠️ VITE_ 접두사 변수는 번들에 평문으로 박제된다 — 시크릿(AI 키 등)은 절대 여기에
// 추가하지 말 것. 시크릿은 Cloud Functions 등 서버 측에만 (rules.md § Firebase 환경변수).
//
// 검증 라이브러리 없이 직접 검사한다 — 앱 첫 로딩 묶음에 zod 전체(gzip 약 40KB)가 실리지 않게.

const raw = import.meta.env as Record<string, string | undefined>;

const REQUIRED = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  // 네이버 지도 JS용 Client ID — 공개 값(웹 서비스 URL로 제한). Client Secret은 Functions 시크릿 NAVER_MAP_CLIENT_SECRET에만
  "VITE_NAVER_MAP_CLIENT_ID",
] as const;

// 개발 전용 에뮬레이터 포트 — 다른 프로젝트 에뮬레이터가 기본 포트를 쓰고 있을 때만 바꾼다
// (firebase.e2e.json + npm run emulators:alt 와 한 세트). 시크릿 아님
const PORTS = {
  VITE_EMULATOR_AUTH_PORT: "9099",
  VITE_EMULATOR_FIRESTORE_PORT: "8080",
  VITE_EMULATOR_STORAGE_PORT: "9199",
} as const;

const invalid = [
  ...REQUIRED.filter((k) => !raw[k]),
  ...(Object.keys(PORTS) as (keyof typeof PORTS)[]).filter((k) => {
    const v = raw[k];
    return v !== undefined && !/^\d+$/.test(v);
  }),
];

if (invalid.length > 0) {
  throw new Error(
    `환경변수 누락/오류: ${invalid.join(", ")} — .env(.local) 또는 CI Variables 확인 (templates/ci 참조)`,
  );
}

const port = (k: keyof typeof PORTS) => raw[k] ?? PORTS[k];
const required = (k: (typeof REQUIRED)[number]) => raw[k] ?? "";

export const env = {
  VITE_FIREBASE_API_KEY: required("VITE_FIREBASE_API_KEY"),
  VITE_FIREBASE_AUTH_DOMAIN: required("VITE_FIREBASE_AUTH_DOMAIN"),
  VITE_FIREBASE_PROJECT_ID: required("VITE_FIREBASE_PROJECT_ID"),
  VITE_FIREBASE_STORAGE_BUCKET: required("VITE_FIREBASE_STORAGE_BUCKET"),
  VITE_FIREBASE_MESSAGING_SENDER_ID: required("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  VITE_FIREBASE_APP_ID: required("VITE_FIREBASE_APP_ID"),
  VITE_NAVER_MAP_CLIENT_ID: required("VITE_NAVER_MAP_CLIENT_ID"),
  /** DSN은 공개 가능 값 — 미설정이면 Sentry 비활성 */
  VITE_SENTRY_DSN: raw.VITE_SENTRY_DSN,
  /** 기본 true — "false"일 때만 끈다 */
  VITE_USE_EMULATORS: raw.VITE_USE_EMULATORS !== "false",
  VITE_EMULATOR_AUTH_PORT: port("VITE_EMULATOR_AUTH_PORT"),
  VITE_EMULATOR_FIRESTORE_PORT: port("VITE_EMULATOR_FIRESTORE_PORT"),
  VITE_EMULATOR_STORAGE_PORT: port("VITE_EMULATOR_STORAGE_PORT"),
} as const;
