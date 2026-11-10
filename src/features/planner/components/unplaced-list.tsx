// 미배치 후보 — 일정에 넣지 못한 장소와 이유. 사용자가 고른 일차에만 넣는다.
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TripDraft } from "@/shared/domain";
import { formatDay } from "@/shared/lib/date";

interface UnplacedListProps {
  trip: TripDraft;
  onPlace: (itemId: string, dayIndex: number) => void;
}

export function UnplacedList({ trip, onPlace }: UnplacedListProps) {
  const { t, i18n } = useTranslation("planner");
  if (trip.unplaced.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="unplaced-title">
      <h2 id="unplaced-title" className="font-semibold">
        {t("unplaced.title", { count: trip.unplaced.length })}
      </h2>
      <ul className="flex flex-col gap-2">
        {trip.unplaced.map((item) => (
          <li
            key={item.id}
            className="border-border bg-card text-card-foreground flex items-center gap-3 rounded-lg border p-3"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium break-words">{item.snapshot.name}</span>
              {item.reason && <span className="text-muted-foreground text-sm">{item.reason}</span>}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {t("unplaced.place")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {trip.days.map((d, i) => (
                  <DropdownMenuItem
                    key={d.date}
                    onSelect={() => {
                      onPlace(item.id, i);
                    }}
                  >
                    {t("dayWithDate", { day: i + 1, date: formatDay(d.date, i18n.language) })}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
    </section>
  );
}
