import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { Festival } from "@/shared/domain";
import { phaseOf } from "../lib/festival-filter";

/** 취소·변경이 진행 상태보다 먼저 보인다 */
export function FestivalStateBadge({ festival, today }: { festival: Festival; today: string }) {
  const { t } = useTranslation("festivals");
  if (festival.state === "cancelled")
    return <Badge variant="destructive">{t("state.cancelled")}</Badge>;
  if (festival.state === "changed") return <Badge variant="warning">{t("state.changed")}</Badge>;
  const phase = phaseOf(festival, today);
  if (phase === "ongoing") return <Badge variant="secondary">{t("state.ongoing")}</Badge>;
  if (phase === "upcoming") return <Badge variant="outline">{t("state.upcoming")}</Badge>;
  return <Badge variant="outline">{t("state.ended")}</Badge>;
}
