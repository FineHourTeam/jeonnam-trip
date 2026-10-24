// A01 관리자 진입 — 로그인(ProtectedRoute) 뒤 admins/{uid}를 확인한다. 화면 숨김은 편의일 뿐 실제 차단은 보안 규칙이 한다 (ADM-01).
import { Link, NavLink, Outlet } from "react-router";
import { paths, type AdminKind } from "@/app/paths";
import { Seo } from "@/components/Seo";
import { EmptyState, ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "../hooks/use-admin";
import { KIND_LABEL } from "../lib/admin-content";

export default function AdminLayout() {
  const q = useIsAdmin();
  if (q.isPending) {
    return (
      <div className="text-muted-foreground flex min-h-dvh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <EmptyState
          title="관리자 권한이 없어요"
          description="운영팀이 계정을 관리자로 등록해야 열 수 있어요."
          action={
            <Button asChild variant="outline" size="touch">
              <Link to={paths.home}>사용자 화면으로</Link>
            </Button>
          }
        />
      </div>
    );
  }
  return (
    <div className="bg-background-subtle text-foreground flex min-h-dvh flex-col">
      <Seo title="운영 관리" noindex />
      <header className="border-border bg-background sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-4 overflow-x-auto px-4">
          <Link to={paths.admin} className="text-primary shrink-0 font-bold">
            머물전남. 운영
          </Link>
          <nav className="flex gap-1" aria-label="관리 메뉴">
            {(Object.keys(KIND_LABEL) as AdminKind[]).map((k) => (
              <NavLink
                key={k}
                to={paths.adminList(k)}
                className={({ isActive }) =>
                  cn("rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap", isActive ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground")
                }
              >
                {KIND_LABEL[k]}
              </NavLink>
            ))}
          </nav>
          <Link to={paths.home} className="text-muted-foreground ml-auto shrink-0 text-sm">
            사용자 화면
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
