// 사용자 표시용 에러 문구 — 원인 + 해결을 함께 (rules.md § 한국어 카피 — 에러).
// 우리 코드가 던지는 에러(한국어 message)는 그대로, Firebase 코드는 아는 것만 번역, 나머지는 공용 fallback.
import i18n from "./i18n";

const FIREBASE_MESSAGES: Record<string, string> = {
  "permission-denied": "접근 권한이 없어요. 로그인한 계정을 확인해 주세요.",
  unauthenticated: "로그인이 필요해요. 다시 로그인해 주세요.",
  unavailable: "서버에 연결하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.",
  "deadline-exceeded": "응답이 늦어 중단했어요. 잠시 후 다시 시도해 주세요.",
  "not-found": "찾을 수 없는 정보예요. 삭제됐거나 공개가 중지됐을 수 있어요.",
  "resource-exhausted": "요청이 많아 잠시 막혔어요. 잠시 후 다시 시도해 주세요.",
};

const HANGUL = /[가-힣]/;

export function errorMessage(e: unknown): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) return i18n.t("error.network");
  const code = (e as { code?: string } | null)?.code ?? "";
  const bare = code.replace(/^firestore\//, "").replace(/^storage\//, "");
  const known = FIREBASE_MESSAGES[bare];
  if (known) return known;
  if (e instanceof Error && HANGUL.test(e.message)) return e.message;
  return i18n.t("error.unknown");
}
