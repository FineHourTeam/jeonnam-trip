// 사용자 앱 셸 — 모바일: 목록 화면에만 하단 탭(탐색·보관함·내 여행) + "여행 만들기" 주 버튼 / PC: 상단 내비게이션.
// 서비스기획서 §5 "모바일 기본 메뉴: 탐색·보관함·내 여행, 여행 만들기를 주요 버튼으로".
// 탐색 홈 맨 위에서는 헤더를 투명하게 두고 사진(HomeHero) 위에 흰 글자로 얹는다 — 스크롤하면 흰 헤더로 돌아온다.
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { AddIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { paths } from "./paths";
import { useAuthState } from "./use-auth-state";

const NAV = [
  { to: paths.home, label: "nav.explore", end: true },
  { to: paths.library, label: "nav.library", end: false },
  { to: paths.myTrips, label: "nav.myTrips", end: false },
] as const;

/** 하단 탭은 목록 화면에만 — 상세·편집·로그인처럼 한 가지 일을 하는 화면에서는 숨긴다 */
const TAB_PATHS: readonly string[] = [
  paths.home,
  paths.festivals,
  paths.places,
  paths.creators,
  paths.library,
  paths.myTrips,
  paths.account,
];

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => {
    window.removeEventListener("scroll", onChange);
  };
}

/** 페이지를 조금이라도 내렸는지 — 스크롤 위치는 외부 상태라 useSyncExternalStore로 읽는다 */
function useScrolled() {
  return useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 0,
    () => false,
  );
}

/** 헤더 언어 선택 — 고른 언어는 i18n.ts가 localStorage에 남긴다 */
function LanguageMenu({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={className} aria-label={t("language.label")}>
          {current.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={current.code}
          onValueChange={(lng) => {
            void i18n.changeLanguage(lng);
          }}
        >
          {LANGUAGES.map((l) => (
            <DropdownMenuRadioItem key={l.code} value={l.code} lang={l.code}>
              {l.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout() {
  const { t } = useTranslation();
  const authState = useAuthState();
  const location = useLocation();
  const scrolled = useScrolled();
  const overHero = location.pathname === paths.home && !scrolled;
  const showTabs = TAB_PATHS.includes(location.pathname);
  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header
        className={cn(
          "sticky top-0 z-40 h-14 border-b transition-colors",
          overHero
            ? "text-scrim-foreground border-transparent"
            : "border-border bg-background text-foreground",
        )}
      >
        <div className="mx-auto flex h-full max-w-screen-xl items-center gap-6 px-4">
          <Link
            to={paths.home}
            className={cn(
              "flex items-center gap-2 text-lg font-bold",
              overHero ? "text-scrim-foreground" : "text-foreground",
            )}
          >
            <img src="/logo-mark.png" alt="" className="size-8" />
            <span>머물전남</span>
          </Link>
          <nav aria-label={t("nav.main")} className="hidden gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium",
                    overHero
                      ? isActive
                        ? "bg-scrim text-scrim-foreground"
                        : "text-scrim-foreground"
                      : isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground",
                  )
                }
              >
                {t(item.label)}
              </NavLink>
            ))}
          </nav>
          <Button asChild size="sm" className="ml-auto hidden md:inline-flex">
            <Link to={paths.tripNew}>
              <AddIcon size="sm" />
              {t("nav.newTrip")}
            </Link>
          </Button>
          <LanguageMenu
            className={cn(
              "ml-auto md:ml-0",
              overHero && "text-scrim-foreground hover:bg-scrim hover:text-scrim-foreground",
            )}
          />
          {/* 로그인 화면에서는 숨긴다 — 로그인 후 지금 보던 화면으로 돌아오게 from을 넘긴다 */}
          {authState.status !== "loading" && location.pathname !== paths.login && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                overHero && "text-scrim-foreground hover:bg-scrim hover:text-scrim-foreground",
              )}
            >
              {authState.status === "authed" ? (
                <Link to={paths.account}>{t("nav.account")}</Link>
              ) : (
                <Link to={paths.login} state={{ from: location.pathname + location.search }}>
                  {t("nav.login")}
                </Link>
              )}
            </Button>
          )}
        </div>
      </header>

      <main className={cn("flex-1 md:pb-0", showTabs && "pb-20")}>
        <Outlet />
      </main>

      {showTabs && (
        <nav
          aria-label={t("nav.bottom")}
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
              {t(item.label)}
            </NavLink>
          ))}
          <Link
            to={paths.tripNew}
            className="text-primary flex h-14 items-center justify-center gap-1 text-sm font-semibold"
          >
            <AddIcon size="sm" />
            {t("nav.newTrip")}
          </Link>
        </nav>
      )}
    </div>
  );
}
