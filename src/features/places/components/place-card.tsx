import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { Checkbox } from "@/components/ui/checkbox";
import { subcategoryLabel } from "../lib/place-filter";
import type { Place } from "@/shared/domain";
import { placeText } from "@/shared/lib/place-text";

interface PlaceCardProps {
  place: Place;
  /** onToggle을 넘기면 선택 체크박스를 보여 준다 (장소 목록). 탐색 홈은 넘기지 않는다 */
  selected?: boolean;
  onToggle?: () => void;
}

export function PlaceCard({ place, selected = false, onToggle }: PlaceCardProps) {
  const { t, i18n } = useTranslation("places");
  const photo = place.photos[0];
  const { name } = placeText(place, i18n.language);
  return (
    <div className="border-border bg-card text-card-foreground has-[a:hover]:bg-background-subtle flex items-center gap-3 rounded-lg border p-3">
      <Link
        to={paths.placeDetail(place.id)}
        className="focus-visible:ring-ring flex min-w-0 flex-1 gap-3 rounded-md focus-visible:ring-2 focus-visible:outline-none"
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
            {t("card.noPhoto")}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-muted-foreground text-xs">
            {t(`placeCategory.${place.category}`, { ns: "common" })}
            {place.subcategory ? ` · ${subcategoryLabel(place.subcategory, i18n.language)}` : ""}
          </p>
          <p className="line-clamp-2 font-medium text-pretty">{name}</p>
          <p className="text-muted-foreground text-sm">
            {t(`sigun.${place.sigun}`, { ns: "common" })}
          </p>
        </div>
      </Link>
      {onToggle && (
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={t("card.select", { name })}
          className="size-5"
        />
      )}
    </div>
  );
}
