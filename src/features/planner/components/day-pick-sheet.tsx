// 일차 고르기 — "다른 일차로 옮기기"·"미배치 후보 넣기"가 함께 쓴다. 드래그 없이 일차를 바꾼다 (UX-01).
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { TripDay } from "@/shared/domain";
import { formatDateShort } from "@/shared/lib/date";

export function DayPickSheet({
  open,
  onOpenChange,
  title,
  days,
  currentDay,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  days: TripDay[];
  /** 지금 있는 일차 (고를 수 없음). 미배치에서 넣을 때는 null */
  currentDay: number | null;
  onPick: (dayIndex: number) => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="그 일차의 끝에 넣고 시간을 다시 계산해요."
    >
      <div className="flex flex-col gap-2 pb-4">
        {days.map((d, i) => (
          <Button
            key={d.date}
            variant="outline"
            size="xl"
            className="justify-between"
            disabled={i === currentDay}
            onClick={() => {
              onPick(i);
              onOpenChange(false);
            }}
          >
            <span>
              {i + 1}일차 · {formatDateShort(d.date)}
            </span>
            <span className="text-muted-foreground text-sm font-normal">
              {i === currentDay ? "지금 일차" : `장소 ${String(d.items.length)}곳`}
            </span>
          </Button>
        ))}
      </div>
    </BottomSheet>
  );
}
