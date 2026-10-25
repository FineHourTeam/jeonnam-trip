// 일정 카드 — 도착·체류·출발, 영업 구간·주문 마감, 늦어도 시작 한도, 충돌 원인 + 고치는 동작 (S10, PLN-08·09).
// 시간·순서를 자동으로 고치지 않는다. 동작 버튼은 사용자가 고른다 (docs/DESIGN.md S10).
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { CategoryIcon } from "@/components/content-meta";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  DeleteIcon,
  ErrorIcon,
  LockIcon,
  MoreIcon,
  NoteIcon,
  RefreshIcon,
  SwapIcon,
  WarningIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { VisitItem } from "@/shared/domain";
import { formatClock, formatDuration } from "@/shared/lib/format";
import type { IssueCode, ItemSchedule, OpenWindow } from "../lib/schedule";

export interface VisitActions {
  onSettings: () => void;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
  onMoveDay: (() => void) | null;
  onReplace: () => void;
  onUnplace: () => void;
  onRemove: () => void;
  onRetryRoutes: () => void;
}

function windowText(w: OpenWindow): string {
  const lo = w.lastOrder !== null ? ` · 주문·입장 마감 ${formatClock(w.lastOrder)}` : "";
  return `${formatClock(w.open)}~${formatClock(w.close)}${lo}`;
}

function detailHref(item: VisitItem): string | null {
  if (item.ref.kind === "place") return paths.placeDetail(item.ref.placeId);
  if (item.ref.kind === "festival") return paths.festivalDetail(item.ref.festivalId);
  return null;
}

/** 충돌 이유별로 고를 수 있는 동작 (2~3개) */
function fixesFor(
  code: IssueCode,
  item: VisitItem,
  a: VisitActions,
): { label: string; run: () => void }[] {
  const out: { label: string; run: () => void }[] = [];
  const push = (label: string, run: (() => void) | null) => {
    if (run) out.push({ label, run });
  };
  switch (code) {
    case "late-for-next":
    case "late-for-fixed":
      if (!item.fixedStart) push("체류 줄이기", a.onSettings);
      push("앞으로 옮기기", a.onMoveUp);
      push("다른 일차로", a.onMoveDay);
      break;
    case "arrive-after-close":
    case "short-stay":
      push("앞으로 옮기기", a.onMoveUp);
      push("다른 일차로", a.onMoveDay);
      push("일정에서 빼기", a.onUnplace);
      break;
    case "closed":
      push("다른 일차로", a.onMoveDay);
      push("다른 장소로", a.onReplace);
      push("일정에서 빼기", a.onUnplace);
      break;
    case "stay-over-close":
      push("시간 수정", a.onSettings);
      push("앞으로 옮기기", a.onMoveUp);
      break;
    case "festival-cancelled":
      push("다른 장소로", a.onReplace);
      push("일정에서 빼기", a.onUnplace);
      break;
    case "route-failed":
      push("다시 시도", a.onRetryRoutes);
      break;
    case "over-day-end":
      push("다른 일차로", a.onMoveDay);
      push("일정에서 빼기", a.onUnplace);
      break;
    default:
      break;
  }
  return out.slice(0, 3);
}

export function VisitCard({
  index,
  item,
  schedule,
  selected,
  onSelect,
  actions,
}: {
  index: number;
  item: VisitItem;
  schedule: ItemSchedule | undefined;
  selected: boolean;
  onSelect: () => void;
  actions: VisitActions;
}) {
  const s = schedule;
  const errors = s?.issues.filter((i) => i.severity === "error") ?? [];
  const warnings = s?.issues.filter((i) => i.severity === "warning") ?? [];
  const href = detailHref(item);
  const timeKnown = s?.start !== null && s?.start !== undefined && s.end !== null;
  return (
    <li
      id={`visit-${item.id}`}
      className="relative flex gap-3"
      data-issue={errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : undefined}
    >
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            errors.length > 0
              ? "bg-destructive text-destructive-foreground"
              : selected
                ? "bg-foreground text-background"
                : "bg-primary text-primary-foreground",
          )}
          aria-hidden
        >
          {index + 1}
        </span>
      </div>
      <article
        className={cn(
          "border-border bg-card text-card-foreground min-w-0 flex-1 rounded-xl border p-4 transition-colors",
          selected && "border-foreground",
        )}
        aria-label={`${String(index + 1)}번째 방문 ${item.snapshot.name}`}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 flex-col gap-1 text-left"
            onClick={onSelect}
          >
            <span className="text-muted-foreground flex items-center gap-1 text-xs tabular-nums">
              {timeKnown && s.start !== null && s.end !== null ? (
                <>
                  <ClockIcon size="sm" />
                  <span className="text-foreground text-sm font-semibold">
                    {formatClock(s.start)}
                  </span>
                  ~{formatClock(s.end)}
                </>
              ) : s?.legBefore?.status === "pending" ? (
                "시간 계산 중"
              ) : (
                "시각 미확정 · 경로·위치 확인 후 계산돼요"
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <CategoryIcon
                category={item.snapshot.category}
                size="sm"
                className="text-muted-foreground shrink-0"
              />
              <span className="truncate text-base font-semibold">{item.snapshot.name}</span>
            </span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-touch"
                aria-label={`${item.snapshot.name} 더보기`}
                className="-mt-2 -mr-2"
              >
                <MoreIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={actions.onSettings}>
                <ClockIcon size="sm" />
                시간·메모 수정
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!actions.onMoveUp} onSelect={() => actions.onMoveUp?.()}>
                <ChevronUpIcon size="sm" />
                위로
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!actions.onMoveDown}
                onSelect={() => actions.onMoveDown?.()}
              >
                <ChevronDownIcon size="sm" />
                아래로
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!actions.onMoveDay}
                onSelect={() => actions.onMoveDay?.()}
              >
                <CalendarIcon size="sm" />
                다른 일차로
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={actions.onReplace}>
                <SwapIcon size="sm" />
                다른 장소로 바꾸기
              </DropdownMenuItem>
              {href ? (
                <DropdownMenuItem asChild>
                  <Link to={href}>
                    <NoteIcon size="sm" />
                    장소 정보 보기
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={actions.onUnplace}>
                일정에서 빼기 (후보로 남기기)
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={actions.onRemove}>
                <DeleteIcon size="sm" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <dl className="text-muted-foreground mt-2 flex flex-col gap-1 text-sm">
          {item.fixedStart ? (
            <div className="text-primary flex items-center gap-1 font-medium">
              <LockIcon size="sm" />
              <dt className="sr-only">고정</dt>
              <dd>
                {item.fixedStart}
                {item.fixedEnd ? `~${item.fixedEnd}` : ""} 고정
              </dd>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-x-2">
            <dt className="sr-only">체류</dt>
            <dd>
              체류 {formatDuration(s?.stayMin ?? item.stayMin)}
              {item.stayLocked && !item.fixedStart ? " (직접 정함)" : ""}
              {s?.stayReduced
                ? ` · 기본 ${formatDuration(s.stayPlannedMin)}에서 맞춰 줄였어요`
                : ""}
            </dd>
            {s && s.arrive !== null && s.waitMin > 0 ? (
              <dd>
                · {formatClock(s.arrive)} 도착, {formatDuration(s.waitMin)} 대기
              </dd>
            ) : null}
          </div>
          {s?.window ? (
            <div>
              <dt className="sr-only">영업</dt>
              <dd>
                {item.snapshot.category === "festival" ? "운영" : "영업"} {windowText(s.window)}
                {s.windows.length > 1 ? ` (하루 ${String(s.windows.length)}구간)` : ""}
              </dd>
            </div>
          ) : null}
          {s && s.latestStart !== null && s.limitBy?.kind === "fixed" && !item.fixedStart ? (
            <div>
              <dt className="sr-only">한도</dt>
              <dd>
                늦어도{" "}
                <strong className="text-foreground font-semibold">
                  {formatClock(s.latestStart)}
                </strong>{" "}
                시작 · {s.limitBy.name} {formatClock(s.limitBy.at)} 기준
              </dd>
            </div>
          ) : null}
          {item.memo ? (
            <div className="flex items-start gap-1">
              <NoteIcon size="sm" className="mt-0.5 shrink-0" />
              <dt className="sr-only">메모</dt>
              <dd className="whitespace-pre-wrap">{item.memo}</dd>
            </div>
          ) : null}
        </dl>

        {[...errors, ...warnings].map((issue) => {
          const fixes = fixesFor(issue.code, item, actions);
          return (
            <div
              key={issue.code}
              role={issue.severity === "error" ? "alert" : "status"}
              className={cn(
                "mt-3 flex flex-col gap-2 rounded-lg p-3 text-sm",
                issue.severity === "error"
                  ? "bg-destructive-soft text-destructive-soft-foreground"
                  : "bg-warning-soft text-warning-soft-foreground",
              )}
            >
              <p className="flex items-start gap-1.5">
                {issue.severity === "error" ? (
                  <ErrorIcon size="sm" className="mt-0.5 shrink-0" />
                ) : (
                  <WarningIcon size="sm" className="mt-0.5 shrink-0" />
                )}
                {issue.message}
              </p>
              {fixes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {fixes.map((f) => (
                    <Button
                      key={f.label}
                      size="sm"
                      variant="outline"
                      className="bg-background"
                      onClick={f.run}
                    >
                      {f.label === "다시 시도" ? <RefreshIcon size="sm" /> : null}
                      {f.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </article>
    </li>
  );
}
