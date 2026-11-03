// 시간표 카드 — 도착(대기)·이용·출발과 영업 조건, 충돌 이유와 할 수 있는 동작을 보여 준다.
import {
  AddIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DecreaseIcon,
  DeleteIcon,
  EditIcon,
  ErrorIcon,
  MoreIcon,
  WarningIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { VisitItem } from "@/shared/domain";
import { fromMinutes } from "@/shared/lib/date";
import { issueHint, issueText } from "../lib/issue-labels";
import { CONFLICT_KINDS, type ScheduledItem, type Slot } from "../lib/schedule";

const t = (n: number | null) => (n === null ? "계산 전" : fromMinutes(n));

/** "11:00~15:00(주문 마감 14:30), 17:00~21:00" — 여러 구간이면 그 사이가 브레이크타임 */
function slotsText(slots: Slot[] | null): string {
  if (slots === null) return "확인되지 않았어요";
  if (slots.length === 0) return "휴무";
  return slots
    .map(
      (x) =>
        `${fromMinutes(x.open)}~${fromMinutes(x.close)}` +
        (x.lastOrder === undefined ? "" : `(주문·입장 마감 ${fromMinutes(x.lastOrder)})`),
    )
    .join(", ");
}

/** 카드에서 바로 바꾸는 체류 단위(분)와 범위 — 체류 수정 창과 같은 범위 */
const STAY_STEP = 15;
const STAY_MIN = 5;
const STAY_MAX = 600;

export interface VisitCardActions {
  onEditStay: () => void;
  /** 체류를 바로 바꾼다 — 사용자가 정한 값이라 체류를 고정한다 */
  onSetStay: (stayMin: number) => void;
  onMove: (dir: -1 | 1) => void;
  onMoveToDay: (dayIndex: number) => void;
  onRemove: () => void;
}

interface VisitCardProps extends VisitCardActions {
  order: number;
  item: VisitItem;
  /** 등록 장소 대표 사진 — 없으면 사진 자리를 그리지 않는다 */
  photo?: string;
  scheduled: ScheduledItem;
  isFirst: boolean;
  isLast: boolean;
  /** 옮길 수 있는 다른 일차 (index·라벨) */
  otherDays: { index: number; label: string }[];
  selected: boolean;
  onSelect: () => void;
  nameOf: (itemId: string) => string | undefined;
}

export function VisitCard(props: VisitCardProps) {
  const { order, item, scheduled: s, selected, nameOf, photo } = props;
  const conflicts = s.issues.filter((i) => CONFLICT_KINDS.has(i.kind));
  const warnings = s.issues.filter(
    (i) => !CONFLICT_KINDS.has(i.kind) && i.kind !== "route_pending",
  );
  const fixed = item.fixedStart !== undefined;

  return (
    <article
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-3 rounded-lg border p-4",
        conflicts.length > 0 ? "border-destructive" : "border-border",
        selected && "ring-ring ring-2",
      )}
      aria-label={`${String(order)}번째 방문 ${item.snapshot.name}`}
    >
      <header className="flex items-start gap-3">
        <button
          type="button"
          onClick={props.onSelect}
          className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          aria-label={`지도에서 ${item.snapshot.name} 보기`}
        >
          {order}
        </button>
        {photo && (
          // 이름이 바로 옆에 있어 사진은 장식으로 둔다
          <img
            src={photo}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-14 shrink-0 rounded-md object-cover"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="font-semibold break-words">{item.snapshot.name}</h3>
          <div className="flex flex-wrap gap-1">
            {fixed && (
              <Badge variant="outline">
                {item.fixedStart}
                {item.fixedEnd ? `~${item.fixedEnd}` : ""} 고정
              </Badge>
            )}
            {item.stayLocked && <Badge variant="outline">체류 고정</Badge>}
          </div>
        </div>
        <CardMenu {...props} fixed={fixed} />
      </header>

      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">도착</dt>
          <dd className="font-medium tabular-nums">{t(s.arrive)}</dd>
          {s.waitMin > 0 && <dd className="text-muted-foreground text-xs">대기 {s.waitMin}분</dd>}
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">이용</dt>
          <dd className="font-medium tabular-nums">{t(s.start)}</dd>
          <dd className="mt-1 flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={`체류 ${String(STAY_STEP)}분 줄이기`}
              disabled={item.stayMin <= STAY_MIN}
              onClick={() => {
                props.onSetStay(Math.max(STAY_MIN, item.stayMin - STAY_STEP));
              }}
            >
              <DecreaseIcon size="sm" />
            </Button>
            <button
              type="button"
              onClick={props.onEditStay}
              className="hover:bg-muted focus-visible:ring-ring min-w-12 rounded-md px-1 text-center font-medium tabular-nums focus-visible:ring-2 focus-visible:outline-none"
              aria-label={`체류 ${String(s.stayMin)}분, 직접 입력하기`}
            >
              {s.stayMin}분
            </button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={`체류 ${String(STAY_STEP)}분 늘리기`}
              disabled={item.stayMin >= STAY_MAX}
              onClick={() => {
                props.onSetStay(Math.min(STAY_MAX, item.stayMin + STAY_STEP));
              }}
            >
              <AddIcon size="sm" />
            </Button>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">출발</dt>
          <dd className="font-medium tabular-nums">{t(s.depart)}</dd>
        </div>
      </dl>

      <details className="text-sm">
        <summary className="text-muted-foreground cursor-pointer">영업 조건과 시간 한도</summary>
        <ul className="text-muted-foreground mt-2 flex flex-col gap-1">
          <li>영업구간: {fixed ? "고정 프로그램" : slotsText(s.slots)}</li>
          <li>
            이용 시작 한도:{" "}
            {s.latestStart === null ? "역산할 수 없어요" : fromMinutes(s.latestStart)}
          </li>
          <li>
            최종 출발 한도:{" "}
            {s.latestDepart === null ? "역산할 수 없어요" : fromMinutes(s.latestDepart)}
          </li>
        </ul>
      </details>

      {(conflicts.length > 0 || warnings.length > 0) && (
        <ul className="flex flex-col gap-1 text-sm">
          {conflicts.map((issue) => (
            <li key={issue.kind} className="text-destructive flex flex-col gap-0.5">
              <span className="flex items-center gap-1 font-medium">
                <ErrorIcon size="sm" />
                {issueText(issue, nameOf)}
              </span>
              {issueHint(issue.kind) && (
                <span className="text-muted-foreground pl-5">{issueHint(issue.kind)}</span>
              )}
            </li>
          ))}
          {warnings.map((issue) => (
            <li key={issue.kind} className="flex items-center gap-1">
              <WarningIcon size="sm" />
              {issueText(issue, nameOf)}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function CardMenu(props: VisitCardProps & { fixed: boolean }) {
  const isFestival = props.item.ref.kind === "festival";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`${props.item.snapshot.name} 더보기`}>
          <MoreIcon size="sm" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!props.fixed && (
          <DropdownMenuItem onSelect={props.onEditStay}>
            <EditIcon size="sm" />
            체류시간 수정
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={props.isFirst}
          onSelect={() => {
            props.onMove(-1);
          }}
        >
          <ChevronUpIcon size="sm" />
          위로
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={props.isLast}
          onSelect={() => {
            props.onMove(1);
          }}
        >
          <ChevronDownIcon size="sm" />
          아래로
        </DropdownMenuItem>
        {/* 축제 운영시간은 방문일 기준 사본이라 다른 날로 옮기지 않는다 — 축제 화면에서 날짜를 골라 다시 담는다 */}
        {props.otherDays.length > 0 && !isFestival && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>다른 일차로</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {props.otherDays.map((d) => (
                <DropdownMenuItem
                  key={d.index}
                  onSelect={() => {
                    props.onMoveToDay(d.index);
                  }}
                >
                  {d.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={props.onRemove}>
          <DeleteIcon size="sm" />
          일정에서 빼기
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
