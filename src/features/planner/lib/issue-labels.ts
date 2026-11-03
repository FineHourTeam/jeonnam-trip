// 시간 계산 결과의 화면 문구 — 경고는 네 갈래(도착 시 마감·다음 일정 지각·영업시간 확인 필요·경로 조회 실패)로 구분한다.
// 문구는 locales/*/planner.json의 issue.* — 부르는 컴포넌트가 useTranslation으로 언어 변경 때 다시 그린다.
import i18n from "@/lib/i18n";
import type { Issue, IssueKind } from "./schedule";

/** 충돌일 때 할 수 있는 동작 안내가 있는 종류 (사용자 일정은 자동으로 바꾸지 않는다) */
const HINT_KINDS = [
  "closed",
  "arrive_after_close",
  "last_order_passed",
  "stay_too_short",
  "late_for_next",
  "late_for_fixed",
  "festival_cancelled",
  "route_failed",
] as const satisfies readonly IssueKind[];

type HintKind = (typeof HINT_KINDS)[number];

const hasHint = (kind: IssueKind): kind is HintKind =>
  (HINT_KINDS as readonly IssueKind[]).includes(kind);

export function issueText(issue: Issue, nameOf: (itemId: string) => string | undefined): string {
  if (issue.kind === "late_for_next" && issue.blockedBy) {
    if (issue.blockedBy === "day_end") return i18n.t("issue.pastDayEnd", { ns: "planner" });
    const name = nameOf(issue.blockedBy);
    if (name) return i18n.t("issue.lateForNamed", { ns: "planner", name });
  }
  return i18n.t(`issue.label.${issue.kind}`, { ns: "planner" });
}

export function issueHint(kind: IssueKind): string | undefined {
  return hasHint(kind) ? i18n.t(`issue.hint.${kind}`, { ns: "planner" }) : undefined;
}
