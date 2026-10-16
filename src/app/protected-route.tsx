// 인증 가드 단일 지점 — 화면별 if-navigate 금지 (rules.md § 라우팅).
// 인증 상태 판정은 use-auth-state.ts가 소유 ("확인 중" 상태 대기 포함).
import { Navigate, Outlet, useLocation } from "react-router";
import { paths } from "./paths";
import { useAuthState } from "./use-auth-state";

export function ProtectedRoute() {
  const authState = useAuthState();
  const location = useLocation();

  if (authState.status === "loading") {
    // 확인 중엔 리다이렉트 판단을 유보 — 스피너/스켈레톤
    return (
      <div className="text-muted-foreground flex min-h-dvh items-center justify-center">
        불러오는 중...
      </div>
    );
  }

  if (authState.status === "guest") {
    // 원래 가려던 곳을 기억해 로그인 후 복귀
    return <Navigate to={paths.login} state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
