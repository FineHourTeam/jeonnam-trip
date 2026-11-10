// 시간표 카드 사이의 구간 행 — 실제 경로 예상시간·거리와 별도 접근/준비 여유를 구분해 보여 준다.
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("planner");
  const buffer = toFixed
    ? t("leg.prep", { n: DEFAULT_PREP_MIN })
    : t("leg.access", { n: DEFAULT_ACCESS_MIN });

  return (
    <div className="border-border text-muted-foreground ml-3 flex min-h-10 items-center gap-2 border-l-2 border-dashed py-2 pl-5 text-sm">
      {leg.status === "pending" && (
        <>
          <LoadingIcon size="sm" className="animate-spin" />
          <span>{t("leg.pending")}</span>
        </>
      )}
      {leg.status === "ok" && (
        <span>
          {t("leg.ok", {
            min: leg.durationMin,
            km: (leg.distanceM / 1000).toFixed(1),
            buffer,
          })}
        </span>
      )}
      {leg.status === "skipped" && (
        <>
          <WarningIcon size="sm" className="text-warning-foreground" />
          <span>{t("leg.skipped")}</span>
        </>
      )}
      {leg.status === "failed" && (
        <>
          <WarningIcon size="sm" className="text-destructive" />
          <span>{t("leg.failed", { reason: leg.reason })}</span>
          <Button variant="outline" size="xs" onClick={onRetry}>
            {t("retry", { ns: "common" })}
          </Button>
        </>
      )}
    </div>
  );
}
