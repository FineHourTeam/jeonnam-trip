// S10 코스 편집 — /trips/draft(로그인 전 초안) 또는 /trips/:tripId(저장된 코스).
import { useState } from "react";
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
import { formatDateKo } from "@/shared/lib/date";
import { DayPanel } from "../components/day-panel";
import { UnplacedList } from "../components/unplaced-list";
import { useTripEditor } from "../hooks/use-trip-editor";
import { placeUnplaced } from "../lib/trip-edits";

export default function TripEditPage() {
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
          <AlertTitle>{notFound ? "코스를 찾을 수 없어요" : "코스를 불러오지 못했어요"}</AlertTitle>
          <AlertDescription>
            {notFound
              ? "삭제됐거나 주소가 잘못된 코스예요."
              : "내 코스가 아니거나 네트워크 연결이 불안정해요."}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          {!notFound && <Button onClick={editor.retryLoad}>다시 시도</Button>}
          <Button variant="outline" asChild>
            <Link to={paths.myTrips}>내 여행 보기</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!trip) {
    return (
      <section className="mx-auto flex max-w-screen-md flex-col gap-3 px-4 py-10">
        <h1 className="text-xl font-semibold">작성 중인 코스가 없어요</h1>
        <p className="text-muted-foreground">여행 날짜를 정하면 코스를 만들 수 있어요.</p>
        <Button asChild className="self-start">
          <Link to={paths.tripNew}>여행 만들기</Link>
        </Button>
      </section>
    );
  }

  const saveLabel = editor.isDraft ? "저장하기" : editor.dirty ? "저장하기" : "저장됨";

  return (
    <section className="mx-auto flex max-w-screen-xl flex-col gap-4 px-4 py-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to={editor.isDraft ? paths.home : paths.myTrips} aria-label="뒤로">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <label htmlFor="trip-title" className="sr-only">
          여행 제목
        </label>
        <Input
          id="trip-title"
          value={trip.title}
          maxLength={40}
          className="min-w-0 flex-1 text-base font-semibold"
          onChange={(e) => {
            const title = e.target.value;
            editor.update((t) => ({ ...t, title }));
          }}
        />
        <Button
          onClick={() => void editor.save()}
          disabled={editor.isSaving || editor.authPending || (!editor.isDraft && !editor.dirty)}
        >
          {editor.isSaving ? "저장 중..." : saveLabel}
        </Button>
        {!editor.isDraft && (
          <Button variant="outline" asChild>
            <Link to={paths.tripShare(tripId)}>공유</Link>
          </Button>
        )}
      </header>

      <p className="text-muted-foreground text-sm">
        {formatDateKo(trip.startDate)} ~ {formatDateKo(trip.endDate)} · 자동차
        {editor.isDraft && " · 저장하지 않은 코스예요. 저장하려면 로그인이 필요해요."}
      </p>

      <Tabs value={dayTab} onValueChange={setDayTab}>
        <TabsList>
          {trip.days.map((d, i) => (
            <TabsTrigger key={d.date} value={String(i)}>
              {i + 1}일차
            </TabsTrigger>
          ))}
        </TabsList>
        {trip.days.map((d, i) => (
          <TabsContent key={d.date} value={String(i)} className="pt-2">
            <h2 className="mb-3 font-semibold">
              {i + 1}일차 · {formatDateKo(d.date)}
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
            <AlertDialogTitle>다른 기기에서 먼저 저장된 코스예요</AlertDialogTitle>
            <AlertDialogDescription>
              지금 내용을 저장하면 최신 내용을 덮어쓰게 돼서 저장하지 않았어요. 최신 코스를 불러오면
              이 화면에서 바꾼 내용은 사라져요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={editor.dismissConflict}>닫기</AlertDialogCancel>
            <AlertDialogAction onClick={() => void editor.reloadLatest()}>
              최신 코스 불러오기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={editor.blocker.state === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>저장하지 않은 변경이 있어요</AlertDialogTitle>
            <AlertDialogDescription>
              지금 나가면 이 화면에서 바꾼 내용이 사라져요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => editor.blocker.reset?.()}>닫기</AlertDialogCancel>
            <AlertDialogAction onClick={() => editor.blocker.proceed?.()}>
              저장하지 않고 나가기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
