// 영업시간 — 접힌 상태 "영업 중 · 21:00까지 (주문 마감 20:20)" 한 줄, 펼치면 오늘 요일부터 요일표.
// 브레이크타임·주문 마감·정기휴무·미확인을 구분하고, 다가오는 예외일(임시 휴무 등)을 따로 보여준다 (S05, 기능명세 §6-4).
import { useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { openStateAt, openStateLabel } from "@/features/content";
import { cn } from "@/lib/utils";
import type { Place, TimeRange } from "@/shared/domain";
import { addDays, dayOfWeek, formatDateKo, nowKstTime, todayKst } from "@/shared/lib/date";

const DOW = ["일", "월", "화", "수", "목", "금", "토"] as const;

function rangesText(ranges: TimeRange[]): string {
  return ranges.map((r) => `${r.open}~${r.close}`).join(" · ");
}

function detailText(ranges: TimeRange[]): string | null {
  const sorted = [...ranges].sort((a, b) => a.open.localeCompare(b.open));
  const breaks = sorted.slice(1).map((r, i) => `브레이크타임 ${sorted[i]?.close ?? ""}~${r.open}`);
  const lo = sorted.flatMap((r) => (r.lastOrder ? [r.lastOrder] : []));
  const parts = [...breaks, lo.length > 0 ? `주문·입장 마감 ${lo.join(" / ")}` : null].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function HoursTable({ place }: { place: Place }) {
  const [open, setOpen] = useState(false);
  const today = todayKst();
  const todayDow = dayOfWeek(today);
  const state = openStateAt(place, today, nowKstTime());
  const order = Array.from(
    { length: 7 },
    (_, i) => ((todayDow + i) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
  );
  const upcoming = place.hours.exceptions
    .filter((e) => e.date >= today && e.date <= addDays(today, 60))
    .sort((a, b) => a.date.localeCompare(b.date));
  const allUnknown = order.every((d) => place.hours.weekly[d] === null);

  return (
    <div className="border-border rounded-xl border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
          disabled={allUnknown}
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className={cn(
                "font-semibold",
                state.kind === "open" && "text-success",
                state.kind === "unknown" && "text-warning-soft-foreground",
              )}
            >
              {openStateLabel(state)}
            </span>
            {!allUnknown ? (
              <span className="text-muted-foreground text-xs">
                요일별 영업시간 {open ? "접기" : "펼치기"}
              </span>
            ) : null}
          </span>
          {!allUnknown ? (
            <ChevronDownIcon
              size="sm"
              className={cn(
                "text-muted-foreground shrink-0 transition-transform",
                open && "rotate-180",
              )}
            />
          ) : null}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="border-border divide-border divide-y border-t">
            {order.map((d, i) => {
              const ranges = place.hours.weekly[d];
              const extra = ranges && ranges.length > 0 ? detailText(ranges) : null;
              return (
                <li key={d} className="flex gap-4 px-4 py-2.5 text-sm">
                  <span
                    className={cn("w-8 shrink-0", i === 0 ? "font-bold" : "text-muted-foreground")}
                  >
                    {DOW[d]}
                    {i === 0 ? <span className="sr-only"> (오늘)</span> : null}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={cn(
                        i === 0 && "font-semibold",
                        ranges === null && "text-muted-foreground",
                      )}
                    >
                      {ranges === null
                        ? "확인 필요"
                        : ranges.length === 0
                          ? "정기휴무"
                          : rangesText(ranges)}
                    </span>
                    {extra ? <span className="text-muted-foreground text-xs">{extra}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
      {upcoming.length > 0 ? (
        <ul className="border-border bg-warning-soft text-warning-soft-foreground flex flex-col gap-1 rounded-b-xl border-t px-4 py-3 text-sm">
          {upcoming.map((e) => (
            <li key={e.date}>
              {formatDateKo(e.date)} · {e.ranges.length === 0 ? "휴무" : rangesText(e.ranges)}
              {e.note ? ` (${e.note})` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
