// S02 조회 조건 — 시군·진행 상태·날짜. 값은 URL 검색 파라미터가 들고 있어 뒤로 가기·공유에도 유지된다.
import { useTranslation } from "react-i18next";
import { DateFilterInput } from "@/components/date-filter-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SIGUNS, isSigunCode, type SigunCode } from "@/shared/domain";
import type { FestivalFilter } from "../lib/festival-filter";

export interface FestivalFilterValues extends FestivalFilter {
  sigun: SigunCode | null;
}

interface FestivalFiltersProps {
  values: FestivalFilterValues;
  today: string;
  onChange: (next: Partial<FestivalFilterValues>) => void;
  onReset: () => void;
}

const ALL = "all";

export function FestivalFilters({ values, today, onChange, onReset }: FestivalFiltersProps) {
  const { t } = useTranslation("festivals");
  const dirty = values.sigun !== null || values.phase !== null || values.date !== null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="festival-sigun">{t("filters.region")}</Label>
          <Select
            value={values.sigun ?? ALL}
            onValueChange={(v) => {
              onChange({ sigun: isSigunCode(v) ? v : null });
            }}
          >
            <SelectTrigger id="festival-sigun" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filters.allRegions")}</SelectItem>
              {SIGUNS.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {t(`sigun.${s.code}`, { ns: "common" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="festival-date">{t("filters.date")}</Label>
          <DateFilterInput
            id="festival-date"
            min={today}
            className="w-auto"
            value={values.date ?? ""}
            onCommit={(date) => {
              onChange({ date: date === "" ? null : date });
            }}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          value={values.phase ?? ALL}
          onValueChange={(v) => {
            if (!v) return;
            onChange({ phase: v === "ongoing" || v === "upcoming" ? v : null });
          }}
          aria-label={t("filters.phase")}
        >
          <ToggleGroupItem value={ALL}>{t("filters.all")}</ToggleGroupItem>
          <ToggleGroupItem value="ongoing">{t("state.ongoing")}</ToggleGroupItem>
          <ToggleGroupItem value="upcoming">{t("state.upcoming")}</ToggleGroupItem>
        </ToggleGroup>
        {dirty && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            {t("filters.reset")}
          </Button>
        )}
      </div>
    </div>
  );
}
