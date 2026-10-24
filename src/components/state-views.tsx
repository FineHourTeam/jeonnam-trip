// 공용 상태 화면 — 로딩·빈 결과·실패를 화면마다 같은 모양으로 구분한다 (UX-02).
import type { ReactNode } from "react";
import { ErrorIcon, RefreshIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "불러오지 못했어요",
  error,
  onRetry,
  className,
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Empty className={cn("py-12", className)} role="alert">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ErrorIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{errorMessage(error)}</EmptyDescription>
      </EmptyHeader>
      {onRetry ? (
        <EmptyContent>
          <Button variant="outline" size="touch" onClick={onRetry}>
            <RefreshIcon size="sm" />
            다시 시도
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Empty className={cn("py-12", className)}>
      <EmptyHeader>
        {icon ? <EmptyMedia variant="icon">{icon}</EmptyMedia> : null}
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

/** 카드 그리드 스켈레톤 */
export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="aspect-4/3 w-full rounded-xl" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** 목록 행 스켈레톤 */
export function RowListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-18 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 상세 화면 스켈레톤 */
export function DetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-4 px-4 py-4" aria-hidden>
      <Skeleton className="aspect-4/3 w-full rounded-xl md:aspect-video" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
