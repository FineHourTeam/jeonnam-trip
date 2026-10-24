// "일정에 담기" 시트 — 여행 고르기 → 일차 고르기 → 담기. 저장(보관함)과 다른 동작이다 (PLC-06).
// 축제처럼 날짜가 정해진 항목은 그 날짜가 있는 일차만 고를 수 있다 (기능명세 §2 기간 적합성 검사).
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { BottomSheet } from "@/components/bottom-sheet";
import { AddIcon } from "@/components/icons";
import { ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { VisitItem } from "@/shared/domain";
import { formatDateShort, formatPeriodKo } from "@/shared/lib/date";
import { useAddItemsToTrip, useTripTargets, type TripTarget } from "../hooks/use-add-to-trip";
import { useCurrentUid } from "../hooks/use-trips";

const targetKey = (t: TripTarget) => (t.kind === "draft" ? "draft" : t.tripId);

export function AddToTripSheet({
  open,
  onOpenChange,
  items,
  requiredDate,
  newTripHref,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 담을 방문 항목 (호출 측이 visitFromPlace 등으로 만든다) */
  items: VisitItem[];
  /** 이 날짜의 일차에만 담을 수 있다 (축제 방문일) */
  requiredDate?: string;
  /** 새 여행으로 시작하기 링크 (선택한 장소를 쿼리로 넘긴다) */
  newTripHref: string;
  onAdded?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const uid = useCurrentUid();
  const { options, isLoading, error, refetch } = useTripTargets();
  const add = useAddItemsToTrip();
  const [picked, setPicked] = useState<string | null>(null);
  const [dayIndex, setDayIndex] = useState<number | null>(null);

  const selectedKey = picked ?? (options[0] ? targetKey(options[0].target) : null);
  const selected = options.find((o) => targetKey(o.target) === selectedKey) ?? null;
  const allowedDays = (selected?.days ?? []).map((d, i) => ({
    i,
    date: d.date,
    ok: !requiredDate || d.date === requiredDate,
  }));
  const autoDay = allowedDays.find((d) => d.ok)?.i ?? null;
  const day = dayIndex !== null && allowedDays[dayIndex]?.ok ? dayIndex : autoDay;
  const noDateMatch = Boolean(selected && requiredDate && autoDay === null);

  function submit() {
    if (!selected || day === null) return;
    add.mutate(
      { target: selected.target, dayIndex: day, items },
      {
        onSuccess: (r) => {
          onOpenChange(false);
          onAdded?.();
          const go = () => {
            void navigate(paths.tripEdit(r.editId));
          };
          if (r.added.length === 0) {
            toast.info("이미 이 일차에 담긴 장소예요.", { action: { label: "코스 보기", onClick: go } });
            return;
          }
          const dup = r.duplicates.length > 0 ? ` (이미 담긴 ${String(r.duplicates.length)}곳은 뺐어요)` : "";
          toast.success(`${String(day + 1)}일차에 ${String(r.added.length)}곳을 담았어요${dup}`, {
            action: { label: "코스 보기", onClick: go },
          });
        },
        onError: (e) => {
          toast.error(errorMessage(e));
        },
      },
    );
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="일정에 담기"
      description={`${String(items.length)}곳을 담을 여행과 일차를 골라 주세요.`}
      footer={
        <div className="flex gap-2">
          <Button asChild variant="outline" size="xl" className="flex-1">
            <Link to={newTripHref}>
              <AddIcon size="sm" />새 여행으로
            </Link>
          </Button>
          <Button
            size="xl"
            className="flex-1"
            disabled={!selected || day === null || add.isPending}
            onClick={submit}
          >
            {add.isPending ? "담는 중..." : day !== null ? `${String(day + 1)}일차에 담기` : "담기"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 pb-2">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">여행</h3>
          {isLoading ? (
            <Skeleton className="h-16 w-full rounded-xl" />
          ) : error && options.length === 0 ? (
            <ErrorState
              error={error}
              onRetry={() => {
                void refetch();
              }}
              className="py-4"
            />
          ) : options.length === 0 && !uid ? (
            <div className="bg-background-subtle flex items-center justify-between gap-3 rounded-xl p-4 text-sm">
              <span className="text-muted-foreground">로그인하면 저장한 여행에도 담을 수 있어요.</span>
              <Button asChild variant="outline" size="sm" className="bg-background shrink-0">
                <Link to={paths.login} state={{ from: location.pathname + location.search }}>
                  로그인하기
                </Link>
              </Button>
            </div>
          ) : options.length === 0 ? (
            <p className="text-muted-foreground bg-background-subtle rounded-xl p-4 text-sm">
              아직 만든 여행이 없어요. 새 여행으로 시작해 주세요.
            </p>
          ) : (
            <RadioGroup
              value={selectedKey ?? undefined}
              onValueChange={(v) => {
                setPicked(v);
                setDayIndex(null);
              }}
              aria-label="담을 여행"
            >
              {options.map((o) => {
                const key = targetKey(o.target);
                return (
                  <label
                    key={key}
                    htmlFor={`target-${key}`}
                    className={cn(
                      "border-border flex cursor-pointer items-center gap-3 rounded-xl border p-3",
                      key === selectedKey && "border-primary bg-primary-soft text-primary-soft-foreground",
                    )}
                  >
                    <RadioGroupItem id={`target-${key}`} value={key} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">{o.title}</span>
                      <span className="text-muted-foreground text-sm">
                        {formatPeriodKo(o.startDate, o.endDate)}
                        {o.target.kind === "draft" ? " · 저장 전" : o.unsaved ? " · 저장하지 않은 변경 있음" : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          )}
        </section>

        {selected ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">일차</h3>
            {noDateMatch && requiredDate ? (
              <p className="bg-warning-soft text-warning-soft-foreground rounded-xl p-3 text-sm">
                이 여행 기간에는 {formatDateShort(requiredDate)} 일차가 없어요. 다른 여행을 고르거나 새 여행으로 시작해 주세요.
              </p>
            ) : null}
            <ToggleGroup
              type="single"
              variant="chip"
              size="chip"
              className="w-full flex-wrap"
              value={day !== null ? String(day) : ""}
              onValueChange={(v) => {
                if (v) setDayIndex(Number(v));
              }}
              aria-label="담을 일차"
            >
              {allowedDays.map((d) => (
                <ToggleGroupItem key={d.date} value={String(d.i)} disabled={!d.ok}>
                  {d.i + 1}일차 · {formatDateShort(d.date)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>
        ) : null}
      </div>
    </BottomSheet>
  );
}
