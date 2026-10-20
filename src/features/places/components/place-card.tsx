import { Link } from "react-router";
import { paths } from "@/app/paths";
import { Checkbox } from "@/components/ui/checkbox";
import { PLACE_CATEGORY_LABEL, sigunName, type Place } from "@/shared/domain";

interface PlaceCardProps {
  place: Place;
  selected: boolean;
  onToggle: () => void;
}

export function PlaceCard({ place, selected, onToggle }: PlaceCardProps) {
  const photo = place.photos[0];
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
            사진 없음
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-muted-foreground text-xs">
            {PLACE_CATEGORY_LABEL[place.category]}
            {place.subcategory ? ` · ${place.subcategory}` : ""}
          </p>
          <p className="line-clamp-2 font-medium text-pretty">{place.name}</p>
          <p className="text-muted-foreground text-sm">{sigunName(place.sigun)}</p>
        </div>
      </Link>
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        aria-label={`${place.name} 선택`}
        className="size-5"
      />
    </div>
  );
}
