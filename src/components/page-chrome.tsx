// 페이지 뼈대 공용 조각 — 상단 바(뒤로 가기)·섹션 머리글·가로 레일·하단 고정 버튼 영역.
// 화면마다 손으로 조립하지 않는다 (rules.md § 모달·다이얼로그·토스트 — 페이지 뼈대).
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ArrowLeftIcon, ChevronRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 상세·편집 화면 상단 바. 앱 안에서 들어왔으면 뒤로, 바로 열었으면 fallback으로 이동 */
export function PageTopBar({
  title,
  fallback,
  right,
  className,
}: {
  title?: ReactNode;
  fallback: string;
  right?: ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div
      className={cn(
        "border-border bg-background/95 sticky top-0 z-30 flex h-14 items-center gap-1 border-b px-2 backdrop-blur md:top-14",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon-touch"
        aria-label="뒤로 가기"
        onClick={() => {
          if (location.key !== "default") void navigate(-1);
          else void navigate(fallback);
        }}
      >
        <ArrowLeftIcon />
      </Button>
      <div className="min-w-0 flex-1 truncate text-base font-semibold">{title}</div>
      {right ? <div className="flex shrink-0 items-center gap-1 pr-1">{right}</div> : null}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  to,
  linkLabel = "전체 보기",
  className,
}: {
  title: string;
  description?: string;
  to?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-lg font-bold tracking-tight text-balance">{title}</h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {to ? (
        <Link
          to={to}
          className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-0.5 text-sm font-medium"
        >
          {linkLabel}
          <ChevronRightIcon size="sm" />
        </Link>
      ) : null}
    </div>
  );
}

/** 가로 스크롤 목록 — 모바일에서 화면 끝까지 붙여 다음 카드가 살짝 보이게 한다 */
export function Rail({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <div
      role="list"
      aria-label={label}
      className={cn(
        "scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function RailItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="listitem" className={cn("w-64 shrink-0 snap-start sm:w-72", className)}>
      {children}
    </div>
  );
}

/** 모바일 하단 고정 버튼 영역. PC에서는 본문 흐름 안에 둔다. 하단 탭이 있는 화면은 overTabBar로 탭 바 위에 띄운다 */
export function StickyActionBar({
  children,
  className,
  overTabBar = false,
}: {
  children: ReactNode;
  className?: string;
  overTabBar?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border bg-background/95 fixed inset-x-0 z-40 border-t backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:backdrop-blur-none",
        overTabBar ? "bottom-tabbar md:bottom-0" : "pb-safe bottom-0",
        className,
      )}
    >
      <div className="mx-auto flex max-w-screen-md gap-2 px-4 py-3 md:px-0">{children}</div>
    </div>
  );
}

/** 본문 폭·여백 표준 */
export function PageBody({
  children,
  className,
  width = "md",
}: {
  children: ReactNode;
  className?: string;
  width?: "md" | "xl";
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col px-4",
        width === "md" ? "max-w-screen-md" : "max-w-screen-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
