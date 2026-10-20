// S06 저장한 장소 카드 — 종류·지역, 확인 필요 상태, 개인 태그·메모, 이 장소를 연결한 SNS 원문, 선택·고치기·저장 해제.
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
import { PLACE_CATEGORY_LABEL, sigunName } from "@/shared/domain";
import { safeHttpUrl } from "@/shared/lib/format";
import { SNS_PLATFORM_LABEL, entryName, type LibraryEntry } from "../lib/library";

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
  const { place, custom, saved } = entry;
  const missing = !place && !custom;
  const name = entryName(entry);
  const location = place?.location ?? custom?.location ?? null;
  const noHours = place ? hoursUnknown(place.hours) : true;

  return (
    <div className="border-border bg-card text-card-foreground flex items-start gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-muted-foreground text-xs">
          {entry.category ? PLACE_CATEGORY_LABEL[entry.category] : "종류 미분류"} ·{" "}
          {entry.sigun ? sigunName(entry.sigun) : "지역 미분류"}
          {custom ? " · 직접 등록" : ""}
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
          <p className="text-muted-foreground text-sm">
            공개가 끝났거나 지워진 장소예요. 일정에는 담을 수 없어요.
          </p>
        ) : (
          (noHours || !location) && (
            <div className="flex flex-wrap gap-1.5">
              {noHours && <Badge variant="outline">영업시간 확인 필요</Badge>}
              {!location && <Badge variant="outline">위치 미확인 · 경로 계산 제외</Badge>}
            </div>
          )
        )}
        {saved.tags.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {saved.tags.map((t) => `#${t}`).join(" ")}
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
                      {SNS_PLATFORM_LABEL[l.platform]} 원문 보기
                    </a>
                  ) : (
                    <span className="text-muted-foreground">열 수 없는 주소예요</span>
                  )}
                  <Link
                    to={paths.snsEdit(l.id)}
                    className="text-muted-foreground underline-offset-4 hover:underline"
                  >
                    링크 고치기
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
          aria-label={`${name} 선택`}
          className="size-5"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`${name} 더보기`}>
              <MoreIcon size="sm" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>태그·메모 고치기</DropdownMenuItem>
            <DropdownMenuItem onSelect={onRemove}>저장 해제</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
