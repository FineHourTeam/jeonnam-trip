// S06 저장한 장소 카드 — 대표 사진(없으면 자리표시), 종류·지역, 확인 필요 상태, 개인 태그·메모, 이 장소를 연결한 SNS 원문, 선택·고치기·저장 해제.
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { MoreIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hoursUnknown } from "@/features/places";
import { safeHttpUrl } from "@/shared/lib/format";
import { entryName, type LibraryEntry } from "../lib/library";

interface SavedPlaceCardProps {
  entry: LibraryEntry;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

export function SavedPlaceCard({
  entry,
  selected,
  onToggle,
  onEdit,
  onRemove,
}: SavedPlaceCardProps) {
  const { t, i18n } = useTranslation("library");
  const { place, custom, saved } = entry;
  const missing = !place && !custom;
  const name = entryName(entry, i18n.language);
  const location = place?.location ?? custom?.location ?? null;
  const noHours = place ? hoursUnknown(place.hours) : true;
  // 개인 장소·볼 수 없는 장소는 사진이 없다 — 장소 목록 카드(PlaceCard)와 같은 자리표시를 쓴다
  const photo = place?.photos[0];
  const thumb = photo ? (
    <img src={photo} alt="" loading="lazy" className="size-20 shrink-0 rounded-md object-cover" />
  ) : (
    <div className="bg-background-subtle text-muted-foreground flex size-20 shrink-0 items-center justify-center rounded-md p-1 text-center text-xs">
      {t("card.noPhoto")}
    </div>
  );

  return (
    <div className="border-border bg-card text-card-foreground flex items-start gap-3 rounded-lg border p-3">
      {place ? (
        <Link
          to={paths.placeDetail(place.id)}
          tabIndex={-1}
          aria-hidden
          className="shrink-0 rounded-md"
        >
          {thumb}
        </Link>
      ) : (
        thumb
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-muted-foreground text-xs">
          {[
            entry.category
              ? t(`placeCategory.${entry.category}`, { ns: "common" })
              : t("card.noCategory"),
            entry.sigun ? t(`sigun.${entry.sigun}`, { ns: "common" }) : t("noSigun"),
            custom ? t("linked.custom") : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {place ? (
          <Link
            to={paths.placeDetail(place.id)}
            className="font-medium text-pretty underline-offset-4 hover:underline"
          >
            {name}
          </Link>
        ) : (
          <p className="font-medium text-pretty">{name}</p>
        )}
        {missing ? (
          <p className="text-muted-foreground text-sm">{t("card.missing")}</p>
        ) : (
          (noHours || !location) && (
            <div className="flex flex-wrap gap-1.5">
              {noHours && <Badge variant="outline">{t("card.hoursUnknown")}</Badge>}
              {!location && <Badge variant="outline">{t("card.noLocation")}</Badge>}
            </div>
          )
        )}
        {saved.tags.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {saved.tags.map((tag) => `#${tag}`).join(" ")}
          </p>
        )}
        {saved.memo && (
          <p className="line-clamp-3 text-sm leading-relaxed whitespace-pre-line">{saved.memo}</p>
        )}
        {entry.links.length > 0 && (
          <ul className="flex flex-col gap-1">
            {entry.links.map((l) => {
              const href = safeHttpUrl(l.url);
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-x-2 text-sm">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {t("card.viewSource", { platform: t(`platform.${l.platform}`) })}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">{t("card.badUrl")}</span>
                  )}
                  <Link
                    to={paths.snsEdit(l.id)}
                    className="text-muted-foreground underline-offset-4 hover:underline"
                  >
                    {t("card.editLink")}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex flex-col items-center gap-2">
        <Checkbox
          checked={selected}
          disabled={missing}
          onCheckedChange={onToggle}
          aria-label={t("card.select", { name })}
          className="size-5"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t("card.more", { name })}>
              <MoreIcon size="sm" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>{t("card.editTags")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={onRemove}>{t("card.unsave")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
