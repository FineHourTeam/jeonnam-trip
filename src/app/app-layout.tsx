// 사용자 앱 셸 — 모바일: 하단 탭(탐색·보관함·내 여행) + "여행 만들기" 주 버튼 / PC: 상단 내비게이션.
// 서비스기획서 §5 "모바일 기본 메뉴: 탐색·보관함·내 여행, 여행 만들기를 주요 버튼으로".
import { Link, NavLink, Outlet } from "react-router";
import { AddIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { paths } from "./paths";

const NAV = [
  { to: paths.home, label: "탐색", end: true },
  { to: paths.library, label: "보관함", end: false },
  { to: paths.myTrips, label: "내 여행", end: false },
] as const;

export function AppLayout() {
  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="border-border bg-background sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-6 px-4">
          <Link to={paths.home} className="text-primary text-lg font-bold">
            머물전남.
          </Link>
          <nav aria-label="주 메뉴" className="hidden gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium",
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Button asChild size="sm" className="ml-auto hidden md:inline-flex">
            <Link to={paths.tripNew}>
              <AddIcon size="sm" />
              여행 만들기
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      <nav
        aria-label="하단 메뉴"
        className="border-border bg-background pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t md:hidden"
      >
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex h-14 items-center justify-center text-sm font-medium",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
        <Link
          to={paths.tripNew}
          className="text-primary flex h-14 items-center justify-center gap-1 text-sm font-semibold"
        >
          <AddIcon size="sm" />
          여행 만들기
        </Link>
      </nav>
    </div>
  );
}
