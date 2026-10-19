// 시간표 카드 사이의 구간 행 — 실제 경로 예상시간·거리와 별도 접근/준비 여유를 구분해 보여 준다.
import { LoadingIcon, WarningIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { LegState } from "@/features/map";
import { DEFAULT_ACCESS_MIN, DEFAULT_PREP_MIN } from "../lib/schedule";

interface LegRowProps {
  leg: LegState;
  /** 도착 장소가 고정 프로그램이면 접근 여유 대신 준비 여유 */
  toFixed: boolean;
  onRetry: () => void;
}

export function LegRow({ leg, toFixed, onRetry }: LegRowProps) {
  const buffer = toFixed
    ? `준비 여유 ${String(DEFAULT_PREP_MIN)}분`
    : `접근 여유 ${String(DEFAULT_ACCESS_MIN)}분`;

  return (
    <div className="border-border text-muted-foreground ml-3 flex min-h-10 items-center gap-2 border-l-2 border-dashed py-2 pl-5 text-sm">
      {leg.status === "pending" && (
        <>
          <LoadingIcon size="sm" className="animate-spin" />
          <span>경로를 계산하고 있어요</span>
        </>
      )}
      {leg.status === "ok" && (
        <span>
          자동차 {leg.durationMin}분 · {(leg.distanceM / 1000).toFixed(1)}km · {buffer}
        </span>
      )}
      {leg.status === "skipped" && (
        <>
          <WarningIcon size="sm" className="text-warning-foreground" />
          <span>위치를 확인하지 못한 장소가 있어 경로를 계산하지 않았어요</span>
        </>
      )}
      {leg.status === "failed" && (
        <>
          <WarningIcon size="sm" className="text-destructive" />
          <span>{leg.reason} 이후 도착시각은 확정되지 않았어요.</span>
          <Button variant="outline" size="xs" onClick={onRetry}>
            다시 시도
          </Button>
        </>
      )}
    </div>
  );
}
