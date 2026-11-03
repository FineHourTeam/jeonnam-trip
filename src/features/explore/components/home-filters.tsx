// S01 상단 — 지역·날짜와 "이 날짜로 여행 만들기". 값은 URL 검색 파라미터가 들고 있다.
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
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
import { SIGUNS, isSigunCode } from "@/shared/domain";
import type { HomeFilter } from "../lib/home-filter";

interface HomeFiltersProps {
  values: HomeFilter;
  today: string;
  /** null = 파라미터를 지운다 (전체 지역 · 오늘) */
  onChange: (next: { sigun?: string | null; date?: string | null }) => void;
  tripNewTo: string;
}

const ALL = "all";

export function HomeFilters({ values, today, onChange, tripNewTo }: HomeFiltersProps) {
  const { t } = useTranslation("explore");
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="home-sigun">{t("filters.region")}</Label>
        <Select
          value={values.sigun ?? ALL}
          onValueChange={(v) => {
            onChange({ sigun: isSigunCode(v) ? v : null });
          }}
        >
          <SelectTrigger id="home-sigun" className="w-36">
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
        <Label htmlFor="home-date">{t("filters.date")}</Label>
        <DateFilterInput
          id="home-date"
          min={today}
          className="w-auto"
          value={values.date}
          onCommit={(date) => {
            // 비우거나 오늘을 고르면 파라미터를 지워 "오늘"을 따라가게 한다
            onChange({ date: date > today ? date : null });
          }}
        />
      </div>
      <Button asChild className="w-full sm:ml-auto sm:w-auto">
        <Link to={tripNewTo}>{t("filters.startTrip")}</Link>
      </Button>
    </div>
  );
}
