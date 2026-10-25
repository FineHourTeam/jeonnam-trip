// 사용자 앱 셸 — 모바일: 최상위 화면에만 하단 탭(탐색·보관함·여행 만들기·내 여행) / PC: 상단 내비게이션.
// 서비스기획서 §5 "모바일 기본 메뉴: 탐색·보관함·내 여행, 여행 만들기를 주요 버튼으로".
// 화면 성격은 라우트 handle.chrome이 정한다 (docs/DESIGN.md §2):
//   tab(기본) = 상단 로고 바 + 하단 탭, detail = 모바일에서 상단·하단 셸 숨김(화면이 PageTopBar·StickyActionBar를 그린다)
import type { ComponentType } from "react";
import { Link, NavLink, Outlet, ScrollRestoration, useMatches } from "react-router";
import {
  AddIcon,
  BookmarkIcon,
  CompassIcon,
  TripIcon,
  UserIcon,
  type IconProps,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { paths } from "./paths";
import { useAuthState } from "./use-auth-state";

export type RouteChrome = "tab" | "detail";

const DESKTOP_NAV = [
  { to: paths.home, label: "탐색", end: true },
  { to: paths.festivals, label: "축제", end: false },
  { to: paths.places, label: "장소", end: false },
  { to: paths.creators, label: "크리에이터 코스", end: false },
  { to: paths.library, label: "보관함", end: false },
  { to: paths.myTrips, label: "내 여행", end: false },
] as const;

const TABS: { to: string; label: string; end: boolean; icon: ComponentType<IconProps> }[] = [
  { to: paths.home, label: "탐색", end: true, icon: CompassIcon },
  { to: paths.library, label: "보관함", end: false, icon: BookmarkIcon },
];
const TABS_AFTER: typeof TABS = [
  { to: paths.myTrips, label: "내 여행", end: false, icon: TripIcon },
];

function useChrome(): RouteChrome {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i]?.handle as { chrome?: RouteChrome } | undefined;
    if (handle?.chrome) return handle.chrome;
  }
  return "tab";
}

function TabLink({ to, label, end, icon: Icon }: (typeof TABS)[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex h-16 flex-col items-center justify-center gap-1 text-xs",
          isActive ? "text-primary font-semibold" : "text-muted-foreground",
        )
      }
    >
      <Icon />
      {label}
    </NavLink>
  );
}

export function AppLayout() {
  const chrome = useChrome();
  const auth = useAuthState();
  const isTab = chrome === "tab";
  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header
        className={cn(
          "border-border bg-background/95 sticky top-0 z-40 border-b backdrop-blur",
          !isTab && "hidden md:block",
        )}
      >
        <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-6 px-4">
          <Link to={paths.home} className="text-primary text-lg font-bold tracking-tight">
            머물전남.
          </Link>
          <nav aria-label="주 메뉴" className="hidden gap-1 md:flex">
            {DESKTOP_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-2 text-sm font-medium",
                    isActive
                      ? "text-primary bg-primary-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="icon-touch"
              aria-label={auth.status === "authed" ? "계정" : "로그인"}
            >
              <Link to={auth.status === "authed" ? paths.account : paths.login}>
                <UserIcon />
              </Link>
            </Button>
            <Button asChild size="touch" className="hidden md:inline-flex">
              <Link to={paths.tripNew}>
                <AddIcon size="sm" />
                여행 만들기
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("flex flex-1 flex-col", isTab ? "pb-24 md:pb-0" : "md:pb-0")}>
        <Outlet />
      </main>

      {isTab ? (
        <nav
          aria-label="하단 메뉴"
          className="border-border bg-background/95 pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t backdrop-blur md:hidden"
        >
          {TABS.map((t) => (
            <TabLink key={t.to} {...t} />
          ))}
          <Link
            to={paths.tripNew}
            className="flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold"
          >
            <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full shadow-sm">
              <AddIcon size="sm" />
            </span>
            여행 만들기
          </Link>
          {TABS_AFTER.map((t) => (
            <TabLink key={t.to} {...t} />
          ))}
        </nav>
      ) : null}
      <ScrollRestoration />
    </div>
  );
}
