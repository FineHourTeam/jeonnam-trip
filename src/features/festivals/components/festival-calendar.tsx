// S02 달력 — 축제가 열리는 날에 점을 찍고, 날짜를 고르면 목록과 같은 날짜 조건이 걸린다.
// 달력 칸 계산만 Date를 쓰고, 값은 KST "YYYY-MM-DD" 문자열로 주고받는다.
import { ko } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";

function toDate(ymd: string): Date {
  const [y = 0, m = 1, d = 1] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toYmd(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${String(date.getFullYear())}-${m}-${d}`;
}

interface FestivalCalendarProps {
  /** 축제가 열리는 날짜 */
  dates: Set<string>;
  selected: string | null;
  today: string;
  onSelect: (date: string | null) => void;
}

export function FestivalCalendar({ dates, selected, today, onSelect }: FestivalCalendarProps) {
  const marked = [...dates].filter((d) => d >= today).map(toDate);
  return (
    <div className="border-border flex flex-col items-center gap-2 rounded-lg border p-2">
      <Calendar
        mode="single"
        locale={ko}
        selected={selected ? toDate(selected) : undefined}
        defaultMonth={toDate(selected ?? today)}
        startMonth={toDate(today)}
        disabled={{ before: toDate(today) }}
        onSelect={(d) => {
          onSelect(d ? toYmd(d) : null);
        }}
        modifiers={{ festival: marked }}
        modifiersClassNames={{
          festival:
            "font-semibold after:bg-primary after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full",
        }}
      />
      <p className="text-muted-foreground text-xs">점이 있는 날에 축제가 열려요.</p>
    </div>
  );
}
