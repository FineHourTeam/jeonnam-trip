// S10 코스 편집 — /trips/draft(로그인 전 초안) 또는 /trips/:tripId(저장된 코스).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";
import { paths } from "@/app/paths";
import { AddIcon, ChevronLeftIcon } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TripNotFoundError } from "@/features/trips";
import { MAX_TRIP_DAYS } from "@/shared/domain";
import { formatDay } from "@/shared/lib/date";
import { DayPanel } from "../components/day-panel";
import { UnplacedList } from "../components/unplaced-list";
import { useTripEditor } from "../hooks/use-trip-editor";
import { addDay, placeUnplaced, shiftStartDate } from "../lib/trip-edits";

export default function TripEditPage() {
  const { t, i18n } = useTranslation("planner");
  const { tripId = "draft" } = useParams();
  const editor = useTripEditor(tripId);
  const [params] = useSearchParams();
  // 장소 추가 창(?add=일차)을 연 채 장소 상세에 다녀오면 그 일차 탭으로 돌아온다
  const [dayTab, setDayTab] = useState(() => params.get("add") ?? "0");
  const { trip } = editor;

  if (editor.isLoading) {
    return (
      <div className="mx-auto flex max-w-screen-xl flex-col gap-4 px-4 py-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (editor.loadError) {
    const notFound = editor.loadError instanceof TripNotFoundError;
    return (
      <section className="mx-auto flex max-w-screen-md flex-col gap-4 px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>{notFound ? t("edit.notFoundTitle") : t("edit.loadErrorTitle")}</AlertTitle>
          <AlertDescription>
            {notFound ? t("edit.notFoundBody") : t("edit.loadErrorBody")}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          {!notFound && <Button onClick={editor.retryLoad}>{t("retry", { ns: "common" })}</Button>}
          <Button variant="outline" asChild>
            <Link to={paths.myTrips}>{t("edit.viewMyTrips")}</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!trip) {
    return (
      <section className="mx-auto flex max-w-screen-md flex-col gap-3 px-4 py-10">
        <h1 className="text-xl font-semibold">{t("edit.noDraftTitle")}</h1>
        <p className="text-muted-foreground">{t("edit.noDraftBody")}</p>
        <Button asChild className="self-start">
          <Link to={paths.tripNew}>{t("nav.newTrip", { ns: "common" })}</Link>
        </Button>
      </section>
    );
  }

  const saveLabel = editor.isDraft || editor.dirty ? t("edit.save") : t("edit.saved");

  return (
    <section className="mx-auto flex max-w-screen-xl flex-col gap-4 px-4 py-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link
            to={editor.isDraft ? paths.home : paths.myTrips}
            aria-label={t("back", { ns: "common" })}
          >
            <ChevronLeftIcon />
          </Link>
        </Button>
        <label htmlFor="trip-title" className="sr-only">
          {t("edit.titleLabel")}
        </label>
        <Input
          id="trip-title"
          value={trip.title}
          maxLength={40}
          className="min-w-0 flex-1 text-base font-semibold"
          onChange={(e) => {
            const title = e.target.value;
            editor.update((draft) => ({ ...draft, title }));
          }}
        />
        <Button
          onClick={() => void editor.save()}
          disabled={editor.isSaving || editor.authPending || (!editor.isDraft && !editor.dirty)}
        >
          {editor.isSaving ? t("edit.saving") : saveLabel}
        </Button>
        {!editor.isDraft && (
          <Button variant="outline" asChild>
            <Link to={paths.tripShare(tripId)}>{t("edit.share")}</Link>
          </Button>
        )}
      </header>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <label htmlFor="trip-start" className="sr-only">
          {t("edit.startDate")}
        </label>
        <Input
          id="trip-start"
          type="date"
          className="w-auto"
          value={trip.startDate}
          onChange={(e) => {
            const date = e.target.value;
            if (date) editor.update((draft) => shiftStartDate(draft, date));
          }}
        />
        <span>
          {t("edit.periodFrom", {
            count: trip.days.length,
            end: formatDay(trip.endDate, i18n.language),
          })}
        </span>
        {editor.isDraft && (
          <span>{editor.isGuest ? t("edit.draftGuest") : t("edit.draftAuthed")}</span>
        )}
      </div>

      <Tabs value={dayTab} onValueChange={setDayTab}>
        {/* 일차가 많으면 탭 줄만 가로로 넘긴다 — 브라우저 스크롤바 대신 넘길 때만 보이는 얇은 막대.
            "1박 추가"는 마지막 일차 탭 바로 옆에 붙어 함께 넘어간다 */}
        <ScrollArea type="scroll" className="min-w-0">
          <div className="flex w-max items-center gap-2">
            <TabsList>
              {trip.days.map((d, i) => (
                <TabsTrigger key={d.date} value={String(i)}>
                  {t("dayWithDate", { day: i + 1, date: formatDay(d.date, i18n.language) })}
                </TabsTrigger>
              ))}
            </TabsList>
            {trip.days.length < MAX_TRIP_DAYS && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  editor.update(addDay);
                  setDayTab(String(trip.days.length));
                }}
              >
                <AddIcon size="sm" />
                {t("edit.addNight")}
              </Button>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        {trip.days.map((d, i) => (
          <TabsContent key={d.date} value={String(i)} className="pt-2">
            <DayPanel trip={trip} day={d} dayIndex={i} update={editor.update} />
          </TabsContent>
        ))}
      </Tabs>

      <UnplacedList
        trip={trip}
        onPlace={(itemId, dayIndex) => {
          editor.update((t) => placeUnplaced(t, itemId, dayIndex));
        }}
      />

      <AlertDialog open={editor.conflict}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("edit.conflictTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("edit.conflictBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={editor.dismissConflict}>
              {t("close", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void editor.reloadLatest()}>
              {t("edit.reloadLatest")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={editor.blocker.state === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("edit.leaveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("edit.leaveBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => editor.blocker.reset?.()}>
              {t("close", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => editor.blocker.proceed?.()}>
              {t("edit.leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
