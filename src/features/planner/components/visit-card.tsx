// 시간표 카드 — 도착(대기)·이용·출발과 영업 조건, 충돌 이유와 할 수 있는 동작을 보여 준다.
import { useTranslation } from "react-i18next";
import {
  ChevronDownIcon,
  ChevronUpIcon,
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
import i18n from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { VisitItem } from "@/shared/domain";
import { fromMinutes } from "@/shared/lib/date";
import { issueHint, issueText } from "../lib/issue-labels";
import { CONFLICT_KINDS, type ScheduledItem, type Slot } from "../lib/schedule";

const clock = (n: number | null) =>
  n === null ? i18n.t("visit.notCalculated", { ns: "planner" }) : fromMinutes(n);

/** "11:00~15:00(주문 마감 14:30), 17:00~21:00" — 여러 구간이면 그 사이가 브레이크타임 */
function slotsText(slots: Slot[] | null): string {
  if (slots === null) return i18n.t("visit.slotsUnknown", { ns: "planner" });
  if (slots.length === 0) return i18n.t("visit.slotsClosed", { ns: "planner" });
  return slots
    .map(
      (x) =>
        `${fromMinutes(x.open)}~${fromMinutes(x.close)}` +
        (x.lastOrder === undefined
          ? ""
          : i18n.t("visit.lastOrder", { ns: "planner", time: fromMinutes(x.lastOrder) })),
    )
    .join(i18n.t("listSeparator", { ns: "planner" }));
}

export interface VisitCardActions {
  onEditStay: () => void;
  onMove: (dir: -1 | 1) => void;
  onMoveToDay: (dayIndex: number) => void;
  onRemove: () => void;
}

interface VisitCardProps extends VisitCardActions {
  order: number;
  item: VisitItem;
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
  const { t } = useTranslation("planner");
  const { order, item, scheduled: s, selected, nameOf } = props;
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
      aria-label={t("visit.cardLabel", { order, name: item.snapshot.name })}
    >
      <header className="flex items-start gap-3">
        <button
          type="button"
          onClick={props.onSelect}
          className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          aria-label={t("visit.showOnMap", { name: item.snapshot.name })}
        >
          {order}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="font-semibold break-words">{item.snapshot.name}</h3>
          <div className="flex flex-wrap gap-1">
            {fixed && (
              <Badge variant="outline">
                {t("visit.fixedBadge", {
                  time: `${item.fixedStart ?? ""}${item.fixedEnd ? `~${item.fixedEnd}` : ""}`,
                })}
              </Badge>
            )}
            {item.stayLocked && <Badge variant="outline">{t("visit.stayLockedBadge")}</Badge>}
          </div>
        </div>
        <CardMenu {...props} fixed={fixed} />
      </header>

      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">{t("visit.arrive")}</dt>
          <dd className="font-medium tabular-nums">{clock(s.arrive)}</dd>
          {s.waitMin > 0 && (
            <dd className="text-muted-foreground text-xs">{t("visit.wait", { n: s.waitMin })}</dd>
          )}
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t("visit.use")}</dt>
          <dd className="font-medium tabular-nums">
            {clock(s.start)} · {t("minutes", { n: s.stayMin })}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t("visit.depart")}</dt>
          <dd className="font-medium tabular-nums">{clock(s.depart)}</dd>
        </div>
      </dl>

      <details className="text-sm">
        <summary className="text-muted-foreground cursor-pointer">{t("visit.conditions")}</summary>
        <ul className="text-muted-foreground mt-2 flex flex-col gap-1">
          <li>
            {t("visit.slots", { value: fixed ? t("visit.fixedProgram") : slotsText(s.slots) })}
          </li>
          <li>
            {t("visit.latestStart", {
              value:
                s.latestStart === null ? t("visit.cannotBackCalc") : fromMinutes(s.latestStart),
            })}
          </li>
          <li>
            {t("visit.latestDepart", {
              value:
                s.latestDepart === null ? t("visit.cannotBackCalc") : fromMinutes(s.latestDepart),
            })}
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
  const { t } = useTranslation("planner");
  const isFestival = props.item.ref.kind === "festival";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("visit.more", { name: props.item.snapshot.name })}
        >
          <MoreIcon size="sm" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!props.fixed && (
          <DropdownMenuItem onSelect={props.onEditStay}>
            <EditIcon size="sm" />
            {t("visit.editStay")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={props.isFirst}
          onSelect={() => {
            props.onMove(-1);
          }}
        >
          <ChevronUpIcon size="sm" />
          {t("visit.moveUp")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={props.isLast}
          onSelect={() => {
            props.onMove(1);
          }}
        >
          <ChevronDownIcon size="sm" />
          {t("visit.moveDown")}
        </DropdownMenuItem>
        {/* 축제 운영시간은 방문일 기준 사본이라 다른 날로 옮기지 않는다 — 축제 화면에서 날짜를 골라 다시 담는다 */}
        {props.otherDays.length > 0 && !isFestival && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t("visit.moveToDay")}</DropdownMenuSubTrigger>
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
          {t("visit.remove")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
