// "일정에 추가" — 작성 중인 코스의 일차를 골라 장소를 끝에 담는다 (기능명세 §3). 여러 곳을 한 번에 담을 수 있고,
// 그 일차에 이미 있는 장소는 빼고 안내한다. 작성 중인 코스가 없으면 여행 만들기로 안내한다.
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addItemsToDay, useTripDraftStore, visitFromPlace } from "@/features/trips";
import type { Place } from "@/shared/domain";
import { formatDateKo } from "@/shared/lib/date";

interface PlaceAddToTripProps {
  places: Place[];
  /** 담기에 성공한 뒤 (목록에서는 선택을 비운다) */
  onAdded?: () => void;
}

export function PlaceAddToTrip({ places, onAdded }: PlaceAddToTripProps) {
  const navigate = useNavigate();
  const draft = useTripDraftStore((s) => s.draft);
  const setDraft = useTripDraftStore((s) => s.setDraft);
  const [picked, setPicked] = useState("0");

  if (!draft) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-muted-foreground text-sm">
          작성 중인 코스가 없어요. 여행을 먼저 만들면 원하는 일차에 담을 수 있어요.
        </p>
        <Button asChild variant="outline">
          <Link to={paths.tripNew}>여행 만들기</Link>
        </Button>
      </div>
    );
  }

  const dayIndex = Number(picked) < draft.days.length ? Number(picked) : 0;
  const id = places.length === 1 ? "place-add-day" : "place-add-day-bulk";

  const add = () => {
    const result = addItemsToDay(draft, dayIndex, places.map(visitFromPlace));
    const day = `${String(dayIndex + 1)}일차`;
    if (result.added.length === 0) {
      toast(
        places.length === 1
          ? `이미 ${day}에 담긴 장소예요.`
          : `고른 장소가 모두 이미 ${day}에 담겨 있어요.`,
      );
      return;
    }
    setDraft(result.trip);
    const skipped =
      result.duplicates.length > 0
        ? ` 이미 담긴 ${String(result.duplicates.length)}곳은 뺐어요.`
        : "";
    toast(`「${draft.title}」 ${day}에 ${String(result.added.length)}곳을 담았어요.${skipped}`, {
      action: {
        label: "코스 보기",
        onClick: () => {
          void navigate(paths.tripDraft);
        },
      },
    });
    onAdded?.();
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>「{draft.title}」 코스</Label>
        <Select value={String(dayIndex)} onValueChange={setPicked}>
          <SelectTrigger id={id} className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {draft.days.map((d, i) => (
              <SelectItem key={d.date} value={String(i)}>
                {i + 1}일차 · {formatDateKo(d.date)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={add} disabled={places.length === 0}>
        일정에 추가
      </Button>
    </div>
  );
}
