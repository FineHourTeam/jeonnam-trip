// A01 관리자 영역 레이아웃 겸 권한 게이트 — admins/{uid} 문서가 있어야 연다.
// 화면 게이트는 안내용이고, 실제 차단은 Firestore·Storage 규칙이 한다 (관리자 화면을 숨기는 것만으로 접근 제어가 끝나지 않는다).
import { Link, NavLink, Outlet } from "react-router";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "../hooks/use-admin";

const NAV = [
  { to: paths.admin, label: "홈", end: true },
  { to: paths.adminList("festivals"), label: "축제", end: false },
  { to: paths.adminList("places"), label: "장소", end: false },
  { to: paths.adminList("creators"), label: "크리에이터 코스", end: false },
] as const;

export default function AdminLayout() {
  const auth = useAuthState();
  const uid = auth.status === "authed" ? auth.user.uid : null;
  const isAdmin = useIsAdmin(uid);

  if (auth.status === "loading" || (uid && isAdmin.isPending)) {
    return (
      <div className="mx-auto flex max-w-screen-xl flex-col gap-3 px-4 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // 이미 확인된 권한이 배경 재조회 실패로 사라지면 편집 중인 폼이 날아간다 — 처음 확인에 실패했을 때만 막는다
  if (isAdmin.isError && isAdmin.data === undefined) {
    return (
      <Gate title="권한을 확인하지 못했어요" body="네트워크 연결을 확인하고 다시 시도해주세요.">
        <Button onClick={() => void isAdmin.refetch()}>다시 시도</Button>
      </Gate>
    );
  }

  if (!isAdmin.data) {
    return (
      <Gate
        title="관리자만 볼 수 있어요"
        body="이 계정에는 운영 관리 권한이 없어요. 권한이 필요하면 운영 담당자에게 요청해 주세요."
      >
        <Button variant="outline" asChild>
          <Link to={paths.home}>서비스로 돌아가기</Link>
        </Button>
      </Gate>
    );
  }

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="border-border bg-background sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-4 overflow-x-auto px-4">
          <Link to={paths.admin} className="flex shrink-0 items-center gap-2 font-bold">
            <img src="/logo-mark.png" alt="" className="size-7" />
            머물전남 운영
          </Link>
          <nav aria-label="관리 메뉴" className="flex gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "shrink-0 rounded-md px-3 py-2 text-sm font-medium",
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Link to={paths.home} className="text-muted-foreground ml-auto shrink-0 text-sm">
            서비스 화면
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function Gate({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto flex max-w-screen-sm flex-col gap-3 px-4 py-16">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      <div>{children}</div>
    </section>
  );
}
