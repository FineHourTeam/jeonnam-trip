// 장소 카드 — 사진 중심(탐색·보관함). 저장·선택 같은 동작은 action·selection 슬롯으로 받는다.
import type { ReactNode } from "react";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { CategoryIcon } from "@/components/content-meta";
import { Photo } from "@/components/photo";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PLACE_CATEGORY_LABEL, sigunName, type Place } from "@/shared/domain";
import { nowKstTime, todayKst } from "@/shared/lib/date";
import { openStateAt, openStateShortLabel } from "../lib/content-status";

export function placeMetaLine(
  p: Pick<Place, "category" | "subcategory" | "sigun" | "area">,
): string {
  return [p.subcategory ?? PLACE_CATEGORY_LABEL[p.category], sigunName(p.sigun), p.area]
    .filter(Boolean)
    .join(" · ");
}

export function PlaceCard({
  place,
  action,
  note,
  selectable,
  selected,
  onSelectedChange,
  className,
}: {
  place: Place;
  /** 사진 오른쪽 위 (저장 버튼 등) */
  action?: ReactNode;
  /** 영업 상태 대신 보여줄 보조 문구 (예: "축제에서 직선 1.2km") */
  note?: string;
  selectable?: boolean;
  selected?: boolean;
  onSelectedChange?: (v: boolean) => void;
  className?: string;
}) {
  const state = openStateAt(place, todayKst(), nowKstTime());
  return (
    <article className={cn("relative flex flex-col gap-2", className)}>
      <Link
        to={paths.placeDetail(place.id)}
        className="group flex flex-col gap-2 rounded-xl outline-none"
      >
        <Photo
          photo={place.photos[0]}
          alt={place.name}
          fallbackIcon={<CategoryIcon category={place.category} size="lg" />}
          className={cn(
            "aspect-4/3 w-full rounded-xl transition-opacity group-hover:opacity-90",
            selected && "ring-primary ring-3",
          )}
        />
        <div className="flex min-w-0 flex-col gap-0.5 px-0.5">
          <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
            <CategoryIcon category={place.category} size="sm" />
            <span className="truncate">{placeMetaLine(place)}</span>
          </p>
          <h3 className="line-clamp-1 text-base leading-snug font-semibold group-focus-visible:underline">
            {place.name}
          </h3>
          <p
            className={cn(
              "truncate text-sm",
              state.kind === "open" ? "text-success" : "text-muted-foreground",
            )}
          >
            {note ?? openStateShortLabel(state)}
          </p>
        </div>
      </Link>
      {action ? <div className="absolute top-2 right-2">{action}</div> : null}
      {selectable ? (
        <label
          htmlFor={`select-${place.id}`}
          className="bg-background/90 absolute top-2 left-2 flex size-9 cursor-pointer items-center justify-center rounded-lg shadow-sm"
        >
          <Checkbox
            id={`select-${place.id}`}
            checked={selected}
            onCheckedChange={(v) => onSelectedChange?.(v === true)}
            aria-label={`${place.name} 선택`}
          />
        </label>
      ) : null}
    </article>
  );
}

/** 좁은 목록용 가로 행 (주변 장소·검색 결과) */
export function PlaceRow({
  place,
  note,
  trailing,
  to = paths.placeDetail(place.id),
}: {
  place: Place;
  note?: string;
  trailing?: ReactNode;
  to?: string | null;
}) {
  const body = (
    <>
      <Photo
        photo={place.photos[0]}
        alt={place.name}
        fallbackIcon={<CategoryIcon category={place.category} />}
        className="size-18 shrink-0 rounded-lg"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-muted-foreground truncate text-xs">{placeMetaLine(place)}</p>
        <p className="truncate text-base font-semibold">{place.name}</p>
        {note ? <p className="text-muted-foreground truncate text-sm">{note}</p> : null}
      </div>
    </>
  );
  return (
    <div className="flex items-center gap-3">
      {to ? (
        <Link
          to={to}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:underline"
        >
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
