// 시간 계산 결과의 화면 문구 — 경고는 네 갈래(도착 시 마감·다음 일정 지각·영업시간 확인 필요·경로 조회 실패)로 구분한다.
import type { DayStatus, Issue, IssueKind } from "./schedule";

const LABEL: Record<IssueKind, string> = {
  closed: "이날은 휴무예요",
  arrive_after_close: "도착 시 마감이에요",
  last_order_passed: "주문·입장 마감 뒤에 도착해요",
  stay_too_short: "영업시간 안에 최소 체류시간이 안 들어가요",
  late_for_next: "다음 일정에 늦어요",
  late_for_fixed: "프로그램 시작에 늦어요",
  festival_cancelled: "취소된 축제예요",
  hours_unknown: "영업시간 확인이 필요해요",
  no_location: "위치 확인이 필요해요",
  route_failed: "경로 조회에 실패했어요",
  route_pending: "경로를 계산하고 있어요",
};

/** 충돌일 때 할 수 있는 동작 안내 (사용자 일정은 자동으로 바꾸지 않는다) */
const HINT: Partial<Record<IssueKind, string>> = {
  closed: "다른 일차로 옮기거나 삭제해 보세요.",
  arrive_after_close: "순서를 앞당기거나 다른 일차로 옮겨 보세요.",
  last_order_passed: "순서를 앞당기거나 다른 일차로 옮겨 보세요.",
  stay_too_short: "다른 시간대가 되도록 순서를 바꾸거나 다른 일차로 옮겨 보세요.",
  late_for_next: "체류시간을 줄이거나, 앞 장소를 빼거나, 다른 일차로 옮겨 보세요.",
  late_for_fixed: "앞 장소의 체류시간을 줄이거나 순서를 바꿔 보세요.",
  festival_cancelled: "취소된 축제는 일정에서 빼는 걸 권해요.",
  route_failed: "구간 아래의 다시 시도를 눌러 주세요.",
};

export function issueText(issue: Issue, nameOf: (itemId: string) => string | undefined): string {
  if (issue.kind === "late_for_next" && issue.blockedBy) {
    if (issue.blockedBy === "day_end") return "하루 종료 시각을 넘겨요";
    const name = nameOf(issue.blockedBy);
    if (name) return `다음 일정(${name})에 늦어요`;
  }
  return LABEL[issue.kind];
}

export function issueHint(kind: IssueKind): string | undefined {
  return HINT[kind];
}

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  calculating: "경로 계산 중",
  conflict: "충돌 있음",
  unconfirmed: "확인 필요",
  ok: "계산 완료",
};
