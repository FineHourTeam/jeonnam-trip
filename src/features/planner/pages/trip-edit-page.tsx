// S10 코스 편집 — /trips/draft(로그인 전 초안) 또는 /trips/:tripId(저장된 코스).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { paths } from "@/app/paths";
import { ChevronLeftIcon } from "@/components/icons";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TripNotFoundError } from "@/features/trips";
import { formatDay } from "@/shared/lib/date";
import { DayPanel } from "../components/day-panel";
import { UnplacedList } from "../components/unplaced-list";
import { useTripEditor } from "../hooks/use-trip-editor";
import { placeUnplaced } from "../lib/trip-edits";

export default function TripEditPage() {
  const { t, i18n } = useTranslation("planner");
  const { tripId = "draft" } = useParams();
  const editor = useTripEditor(tripId);
  const [dayTab, setDayTab] = useState("0");
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

      <p className="text-muted-foreground text-sm">
        {t("edit.period", {
          start: formatDay(trip.startDate, i18n.language),
          end: formatDay(trip.endDate, i18n.language),
        })}
        {editor.isDraft && (editor.isGuest ? t("edit.draftGuest") : t("edit.draftAuthed"))}
      </p>

      <Tabs value={dayTab} onValueChange={setDayTab}>
        <TabsList>
          {trip.days.map((d, i) => (
            <TabsTrigger key={d.date} value={String(i)}>
              {t("dayLabel", { day: i + 1 })}
            </TabsTrigger>
          ))}
        </TabsList>
        {trip.days.map((d, i) => (
          <TabsContent key={d.date} value={String(i)} className="pt-2">
            <h2 className="mb-3 font-semibold">
              {t("dayWithDate", { day: i + 1, date: formatDay(d.date, i18n.language) })}
            </h2>
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
