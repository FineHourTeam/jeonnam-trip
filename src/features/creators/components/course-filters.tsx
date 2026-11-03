// S08 조회 조건 — 지역·일수·태그. 값은 URL 검색 파라미터가 들고 있어 뒤로 가기·공유에도 유지된다.
import { useTranslation } from "react-i18next";
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
import { MAX_TRIP_DAYS, SIGUNS, isSigunCode } from "@/shared/domain";
import { formatDays, tagLabel, type CourseFilter } from "../lib/course";

const ALL = "all";
const DAY_OPTIONS = Array.from({ length: MAX_TRIP_DAYS }, (_, i) => i + 1);

interface CourseFiltersProps {
  values: CourseFilter;
  tags: string[];
  onChange: (next: Partial<CourseFilter>) => void;
  onReset: () => void;
}

export function CourseFilters({ values, tags, onChange, onReset }: CourseFiltersProps) {
  const { t, i18n } = useTranslation("creators");
  const dirty = values.sigun !== null || values.days !== null || values.tag !== null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="course-sigun">{t("filters.region")}</Label>
          <Select
            value={values.sigun ?? ALL}
            onValueChange={(v) => {
              onChange({ sigun: isSigunCode(v) ? v : null });
            }}
          >
            <SelectTrigger id="course-sigun" className="w-36">
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
          <Label htmlFor="course-days">{t("filters.days")}</Label>
          <Select
            value={values.days === null ? ALL : String(values.days)}
            onValueChange={(v) => {
              onChange({ days: v === ALL ? null : Number(v) });
            }}
          >
            <SelectTrigger id="course-days" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filters.allDays")}</SelectItem>
              {DAY_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {formatDays(n)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {tags.length > 0 && (
          <ToggleGroup
            type="single"
            variant="outline"
            value={values.tag ?? ALL}
            onValueChange={(v) => {
              if (!v) return;
              onChange({ tag: v === ALL ? null : v });
            }}
            className="flex flex-wrap justify-start"
            aria-label={t("filters.tags")}
          >
            <ToggleGroupItem value={ALL}>{t("filters.allTags")}</ToggleGroupItem>
            {tags.map((tag) => (
              <ToggleGroupItem key={tag} value={tag}>
                {tagLabel(tag, i18n.language)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        {dirty && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            {t("filters.reset")}
          </Button>
        )}
      </div>
    </div>
  );
}
