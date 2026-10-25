// 축제 카드 — 사진 위에 진행 단계·변경/취소 배지. 가짜 인기 수치는 쓰지 않는다 (화면설계 S01).
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { CategoryIcon, FESTIVAL_STATE_LABEL, PhotoBadge } from "@/components/content-meta";
import { Photo } from "@/components/photo";
import { cn } from "@/lib/utils";
import { sigunName, type Festival } from "@/shared/domain";
import { formatPeriodKo, todayKst } from "@/shared/lib/date";
import { FESTIVAL_PHASE_LABEL, festivalPhase } from "../lib/content-status";

export function FestivalBadges({ festival }: { festival: Festival }) {
  const phase = festivalPhase(festival, todayKst());
  const stateLabel = FESTIVAL_STATE_LABEL[festival.state];
  return (
    <div className="flex flex-wrap gap-1">
      {festival.state === "cancelled" ? null : (
        <PhotoBadge
          tone={phase === "ongoing" ? "primary" : phase === "ended" ? "muted" : "neutral"}
        >
          {FESTIVAL_PHASE_LABEL[phase]}
        </PhotoBadge>
      )}
      {stateLabel ? (
        <PhotoBadge tone={festival.state === "cancelled" ? "destructive" : "warning"}>
          {stateLabel}
        </PhotoBadge>
      ) : null}
    </div>
  );
}

export function FestivalCard({ festival, className }: { festival: Festival; className?: string }) {
  return (
    <article className={cn("relative", className)}>
      <Link
        to={paths.festivalDetail(festival.id)}
        className="group flex flex-col gap-2 rounded-xl outline-none"
      >
        <div className="relative">
          <Photo
            photo={festival.photos[0]}
            alt={festival.name}
            fallbackIcon={<CategoryIcon category="festival" size="lg" />}
            className="aspect-4/3 w-full rounded-xl transition-opacity group-hover:opacity-90"
          />
          <div className="absolute top-2 left-2">
            <FestivalBadges festival={festival} />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 px-0.5">
          <p className="text-muted-foreground text-xs">{sigunName(festival.sigun)}</p>
          <h3
            className={cn(
              "line-clamp-2 text-base leading-snug font-semibold group-focus-visible:underline",
              festival.state === "cancelled" && "text-muted-foreground line-through",
            )}
          >
            {festival.name}
          </h3>
          <p className="text-muted-foreground text-sm">
            {formatPeriodKo(festival.startDate, festival.endDate)}
          </p>
        </div>
      </Link>
    </article>
  );
}
