// 로그인 화면 순수 로직 — Firebase 에러 코드 분류와 로그인 후 복귀 경로.
import { paths } from "@/app/paths";

export type LoginFailure =
  "cancelled" | "popup-blocked" | "network" | "unauthorized-domain" | "unknown";

/** FirebaseError.code → 화면에 보여줄 실패 사유 */
export function loginFailureOf(err: unknown): LoginFailure {
  const code = typeof err === "object" && err !== null && "code" in err ? String(err.code) : "";
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "cancelled";
    case "auth/popup-blocked":
      return "popup-blocked";
    case "auth/network-request-failed":
    case "auth/timeout":
      return "network";
    case "auth/unauthorized-domain":
    case "auth/operation-not-supported-in-this-environment":
      return "unauthorized-domain";
    default:
      return "unknown";
  }
}

/** location.state.from → 로그인 후 돌아갈 앱 내부 경로 (없거나 이상하면 홈) */
export function returnPathOf(state: unknown): string {
  const from =
    typeof state === "object" && state !== null && "from" in state ? state.from : undefined;
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//")) return paths.home;
  if (from === paths.login) return paths.home;
  return from;
}
