// 환경변수 단일 검증 지점 — import.meta.env를 앱 코드에서 직접 읽지 않는다.
// 빌드에 필요한 변수가 빠지면 배포 후 흰 화면 대신 "여기서, 즉시, 명확하게" 실패한다
// (unknown-unknowns #49).
//
// ⚠️ VITE_ 접두사 변수는 번들에 평문으로 박제된다 — 시크릿(AI 키 등)은 절대 여기에
// 추가하지 말 것. 시크릿은 Cloud Functions 등 서버 측에만 (rules.md § Firebase 환경변수).
import { z } from "zod";

const envSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_SENTRY_DSN: z.string().optional(), // DSN은 공개 가능 값 — 미설정이면 Sentry 비활성
  VITE_USE_EMULATORS: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v !== "false"),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(
    `환경변수 누락/오류: ${missing} — .env(.local) 또는 CI Variables 확인 (templates/ci 참조)`,
  );
}

export const env = parsed.data;
