import { Badge } from "@/components/ui/badge";
import type { Festival } from "@/shared/domain";
import { phaseOf } from "../lib/festival-filter";

/** 취소·변경이 진행 상태보다 먼저 보인다 */
export function FestivalStateBadge({ festival, today }: { festival: Festival; today: string }) {
  if (festival.state === "cancelled") return <Badge variant="destructive">취소</Badge>;
  if (festival.state === "changed") return <Badge variant="warning">일정 변경</Badge>;
  const phase = phaseOf(festival, today);
  if (phase === "ongoing") return <Badge variant="secondary">진행 중</Badge>;
  if (phase === "upcoming") return <Badge variant="outline">예정</Badge>;
  return <Badge variant="outline">종료</Badge>;
}
