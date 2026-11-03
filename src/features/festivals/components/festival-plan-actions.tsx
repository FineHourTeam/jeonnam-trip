// S03 일정 연결 — 방문일(·프로그램)을 골라 "이 축제로 여행 만들기"(S09) 또는 "현재 일정에 추가"(작성 중 코스).
// 취소된 축제·지난 축제는 새로 담지 않는다. 운영시간 미확인 날은 담되 확인이 필요하다고 알린다 (기능명세 §2).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
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
import { addItemsToDay, dayIndexOf, useTripDraftStore, visitFromFestival } from "@/features/trips";
import type { Festival } from "@/shared/domain";
import { formatDay } from "@/shared/lib/date";
import { visitableDates } from "../lib/festival-filter";
import { formatPeriod } from "../lib/format";

const NO_PROGRAM = "none";

export function FestivalPlanActions({ festival, today }: { festival: Festival; today: string }) {
  const { t, i18n } = useTranslation("festivals");
  const navigate = useNavigate();
  const draft = useTripDraftStore((s) => s.draft);
  const setDraft = useTripDraftStore((s) => s.setDraft);
  const dates = visitableDates(festival, today);
  const [picked, setPicked] = useState<string | null>(null);
  const [programId, setProgramId] = useState(NO_PROGRAM);

  if (festival.state === "cancelled") {
    return <Notice>{t("plan.cancelled")}</Notice>;
  }
  const date = picked && dates.includes(picked) ? picked : dates[0];
  if (!date) return <Notice>{t("plan.ended")}</Notice>;

  const programs = festival.programs.filter((p) => p.date === date);
  const program = programs.find((p) => p.id === programId);
  const hoursUnknown = !festival.days.find((d) => d.date === date)?.ranges;
  const dayIndex = draft ? dayIndexOf(draft, date) : -1;

  const startTrip = () => {
    const q = new URLSearchParams({ festival: festival.id, date });
    if (program) q.set("program", program.id);
    void navigate(`${paths.tripNew}?${q.toString()}`);
  };

  const addToDraft = () => {
    if (!draft || dayIndex < 0) return;
    const result = addItemsToDay(draft, dayIndex, [visitFromFestival(festival, date, program?.id)]);
    if (result.added.length === 0) {
      toast(t("plan.alreadyAdded"));
      return;
    }
    setDraft(result.trip);
    toast(t("plan.added", { title: draft.title, day: dayIndex + 1 }), {
      action: {
        label: t("plan.viewCourse"),
        onClick: () => {
          void navigate(paths.tripDraft);
        },
      },
    });
  };

  return (
    <div className="border-border flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="festival-visit-date">{t("plan.visitDate")}</Label>
          <Select
            value={date}
            onValueChange={(v) => {
              setPicked(v);
              setProgramId(NO_PROGRAM);
            }}
          >
            <SelectTrigger id="festival-visit-date" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dates.map((d) => (
                <SelectItem key={d} value={d}>
                  {formatDay(d, i18n.language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {programs.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="festival-program">{t("plan.program")}</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger id="festival-program" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROGRAM}>{t("plan.noProgram")}</SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.start}~{p.end} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {hoursUnknown && !program && (
        <p className="text-muted-foreground text-sm">{t("plan.hoursUnknown")}</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={startTrip}>{t("plan.startTrip")}</Button>
        {draft && (
          <Button variant="outline" disabled={dayIndex < 0} onClick={addToDraft}>
            {t("plan.addToDraft")}
          </Button>
        )}
      </div>
      {draft && dayIndex < 0 && (
        <p className="text-muted-foreground text-sm">
          {t("plan.outOfRange", {
            title: draft.title,
            period: formatPeriod(draft.startDate, draft.endDate, i18n.language),
          })}
        </p>
      )}
    </div>
  );
}

function Notice({ children }: { children: string }) {
  return <p className="bg-background-subtle text-foreground rounded-lg p-4 text-sm">{children}</p>;
}
