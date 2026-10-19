import { Link } from "react-router";
import { paths } from "@/app/paths";
import { sigunName, type Festival } from "@/shared/domain";
import { formatPeriod } from "../lib/format";
import { FestivalStateBadge } from "./festival-state-badge";

export function FestivalCard({ festival, today }: { festival: Festival; today: string }) {
  const photo = festival.photos[0];
  return (
    <Link
      to={paths.festivalDetail(festival.id)}
      className="border-border bg-card text-card-foreground hover:bg-background-subtle focus-visible:ring-ring flex gap-3 rounded-lg border p-3 focus-visible:ring-2 focus-visible:outline-none"
    >
      {photo ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          className="size-20 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="bg-background-subtle text-muted-foreground flex size-20 shrink-0 items-center justify-center rounded-md text-xs">
          사진 없음
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <FestivalStateBadge festival={festival} today={today} />
        <p className="line-clamp-2 font-medium text-pretty">{festival.name}</p>
        <p className="text-muted-foreground text-sm">
          {sigunName(festival.sigun)} · {formatPeriod(festival.startDate, festival.endDate)}
        </p>
      </div>
    </Link>
  );
}
