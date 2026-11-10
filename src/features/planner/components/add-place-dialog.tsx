// 일정 화면에서 바로 장소 담기 — 지역·종류·이름으로 걸러 이 일차 끝에 담는다. 지역 기본값은 여행 지역(첫 지역).
// 창이 열린 상태와 조건은 주소(?add=일차&aq=&acat=&asig=)에 둔다: 장소 이름을 눌러 상세에 다녀와도 뒤로 가기로 같은 창이 다시 열린다.
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { AddIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PLACE_CATEGORIES } from "@/features/places";
import { isSigunCode, type SigunCode } from "@/shared/domain";
import type { TripEdit } from "../hooks/use-trip-editor";
import { PlaceSearchPanel } from "./place-search-panel";

const ALL = "all";
type FilterKey = "add" | "aq" | "acat" | "asig";

interface AddPlaceDialogProps {
  dayIndex: number;
  dayLabel: string;
  /** 이 일차에 이미 담은 등록 장소 id */
  addedIds: Set<string>;
  /** 지역 조건의 기본값 — 여행 지역(첫 지역) */
  sigun: SigunCode | null;
  update: (edit: TripEdit) => void;
}

export function AddPlaceDialog({
  dayIndex,
  dayLabel,
  addedIds,
  sigun,
  update,
}: AddPlaceDialogProps) {
  const { t } = useTranslation("planner");
  const [params, setParams] = useSearchParams();
  const open = params.get("add") === String(dayIndex);
  const q = (params.get("aq") ?? "").trim().slice(0, 50);
  const category = PLACE_CATEGORIES.find((c) => c === params.get("acat")) ?? null;
  const sigParam = params.get("asig");
  const filterSigun =
    sigParam === ALL ? null : sigParam && isSigunCode(sigParam) ? sigParam : sigun;

  const setParam = (next: Partial<Record<FilterKey, string | null>>) => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(next)) {
          if (v) p.set(k, v);
          else p.delete(k);
        }
        return p;
      },
      { replace: true },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setParam(o ? { add: String(dayIndex) } : { add: null, aq: null, acat: null, asig: null });
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <AddIcon size="sm" />
          {t("addPlace.open")}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col">
        <DialogHeader>
          <DialogTitle>{t("addPlace.title", { day: dayLabel })}</DialogTitle>
          <DialogDescription>{t("addPlace.description")}</DialogDescription>
        </DialogHeader>
        <PlaceSearchPanel
          filters={{ q, category, sigun: filterSigun }}
          onFiltersChange={(next) => {
            setParam({
              ...(next.q !== undefined && { aq: next.q || null }),
              ...(next.category !== undefined && { acat: next.category }),
              ...(next.sigun !== undefined && { asig: next.sigun ?? ALL }),
            });
          }}
          dayIndex={dayIndex}
          dayLabel={dayLabel}
          addedIds={addedIds}
          update={update}
        />
      </DialogContent>
    </Dialog>
  );
}
