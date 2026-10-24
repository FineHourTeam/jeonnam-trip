// 장소 사이 구간 행 — 카드가 아닌 얇은 행에 "자동차 23분 · 14km + 여유 10분". 실패하면 같은 자리에서 다시 시도 (MAP-02·05).
import { CarIcon, RefreshIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistance, formatDuration } from "@/shared/lib/format";
import type { LegInput } from "../lib/schedule";

export function LegRow({
  leg,
  bufferMin,
  onRetry,
  label,
}: {
  leg: LegInput;
  bufferMin: number;
  onRetry: () => void;
  /** 출발 위치에서 오는 구간 등 */
  label?: string;
}) {
  return (
    <div className="text-muted-foreground flex min-h-10 items-center gap-2 py-1 pl-1 text-sm" role="group" aria-label="이동 구간">
      <CarIcon size="sm" className="shrink-0" />
      {label ? <span className="shrink-0">{label}</span> : null}
      {leg.status === "ok" ? (
        <span>
          자동차 <strong className="text-foreground font-semibold">{formatDuration(leg.durationMin)}</strong> ·{" "}
          {formatDistance(leg.distanceM)}
          {bufferMin > 0 ? <span className="text-muted-foreground"> + 주차·이동 여유 {formatDuration(bufferMin)}</span> : null}
        </span>
      ) : leg.status === "pending" ? (
        <span className="flex items-center gap-2" aria-live="polite">
          경로 조회 중
          <Skeleton className="h-3 w-16" />
        </span>
      ) : leg.status === "skipped" ? (
        <span>위치를 몰라 경로를 계산하지 않았어요</span>
      ) : (
        <span className="text-warning-soft-foreground flex flex-wrap items-center gap-2">
          경로를 불러오지 못했어요
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshIcon size="sm" />
            다시 시도
          </Button>
        </span>
      )}
    </div>
  );
}
