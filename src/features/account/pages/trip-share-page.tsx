// S12 공유 설정 — 공개될 내용을 미리 보여 주고 링크 만들기·업데이트·해제를 한다.
// 개인 메모·출발/종료 위치는 빠진다. 직접 입력한 장소는 공개 대상이라 미리 알린다 (기능명세 §8).
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { ChevronLeftIcon, LoadingIcon } from "@/components/icons";
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
import { useTrip } from "@/features/trips";
import type { Trip } from "@/shared/domain";
import { formatDateKo, kstDateOf } from "@/shared/lib/date";
import { SharedDays } from "../components/shared-days";
import { ShareInactiveError } from "../api/shares-api";
import { useOwnShare, usePublishShare, useUnshare } from "../hooks/use-shares";
import { customPlaceCount, toSharedTrip } from "../lib/share-copy";

export default function TripSharePage() {
  const { tripId } = useParams();
  const trip = useTrip(tripId);

  if (trip.isPending) return <Skeleton className="mx-4 my-6 h-64" />;
  if (trip.isError) {
    return (
      <section className="mx-auto flex max-w-screen-md flex-col gap-3 px-4 py-10">
        <h1 className="text-xl font-semibold">코스를 불러오지 못했어요</h1>
        <p className="text-muted-foreground">내 코스가 아니거나 삭제된 코스예요.</p>
        <div className="flex gap-2">
          <Button onClick={() => void trip.refetch()}>다시 시도</Button>
          <Button variant="outline" asChild>
            <Link to={paths.myTrips}>내 여행 보기</Link>
          </Button>
        </div>
      </section>
    );
  }
  return <ShareSettings trip={trip.data} />;
}

function ShareSettings({ trip }: { trip: Trip }) {
  const share = useOwnShare(trip.shareId);
  const publish = usePublishShare();
  const unshare = useUnshare();
  const [confirmOff, setConfirmOff] = useState(false);
  const current = share.data ?? null;
  const active = current?.active === true;
  // 연결된 공유본을 확인하기 전에는 새로 만들지 않는다 — 확인 전에 만들면 옛 공유본이 막을 수 없게 남는다
  const shareUnknown = trip.shareId !== null && (share.isPending || share.isError);
  const link = active ? `${window.location.origin}${paths.sharedTrip(current.id)}` : "";
  const outdated = active && trip.updatedAt > current.publishedAt;
  const preview = toSharedTrip(trip, { id: "preview", publishedVersion: 0, publishedAt: "" });
  const customs = customPlaceCount(trip);

  const onPublish = () => {
    publish.mutate(
      { trip, current },
      {
        onSuccess: () =>
          toast.success(
            active ? "공유 내용을 지금 코스로 업데이트했어요." : "공유 링크를 만들었어요.",
          ),
        onError: (e) => {
          toast.error(
            e instanceof ShareInactiveError
              ? e.message
              : "공유하지 못했어요. 네트워크를 확인하고 다시 시도해주세요.",
          );
        },
      },
    );
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("링크를 복사했어요.");
    } catch {
      toast.error("복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.");
    }
  };

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-5 px-4 py-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to={paths.tripEdit(trip.id)} aria-label="코스로 돌아가기">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">공유 설정</h1>
      </div>

      <div className="bg-background-subtle text-foreground flex flex-col gap-3 rounded-lg p-4">
        {trip.shareId && share.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : trip.shareId && share.isError ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm">공유 상태를 확인하지 못했어요.</p>
            <Button variant="outline" size="sm" onClick={() => void share.refetch()}>
              다시 시도
            </Button>
          </div>
        ) : active ? (
          <>
            <p className="font-medium">링크를 아는 사람은 누구나 이 코스를 볼 수 있어요.</p>
            <div className="flex gap-2">
              <Input
                value={link}
                readOnly
                aria-label="공유 링크"
                onFocus={(e) => {
                  e.target.select();
                }}
              />
              <Button variant="outline" onClick={() => void onCopy()}>
                복사
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              {formatDateKo(kstDateOf(current.publishedAt))}에 공개한 내용이에요 (공개 버전{" "}
              {current.publishedVersion}).
              {outdated && " 그 뒤에 코스를 고쳤어요. 업데이트해야 받는 사람에게 보여요."}
            </p>
          </>
        ) : (
          <p className="font-medium">
            아직 공유하지 않은 코스예요. 링크를 만들면 아래 내용이 공개돼요.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onPublish}
            disabled={shareUnknown || publish.isPending || unshare.isPending}
          >
            {publish.isPending && <LoadingIcon size="sm" className="animate-spin" />}
            {active ? "공유 내용 업데이트" : "공유 링크 만들기"}
          </Button>
          {active && (
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOff(true);
              }}
              disabled={unshare.isPending}
            >
              공유 해제
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">공개될 내용</h2>
        <ul className="text-muted-foreground list-disc pl-5 text-sm">
          <li>제목·날짜·지역·일차별 방문 장소와 순서·머무는 시간·위치</li>
          <li>빠지는 정보: 개인 메모, 출발·종료 위치(숙소 등)</li>
          {customs > 0 && (
            <li className="text-foreground">
              직접 입력한 장소 {customs}곳도 이름·위치가 공개돼요.
            </li>
          )}
        </ul>
        <div className="border-border flex flex-col gap-1 rounded-lg border p-4">
          <p className="text-lg font-semibold">{preview.title}</p>
          <p className="text-muted-foreground text-sm">
            {formatDateKo(preview.startDate)} ~ {formatDateKo(preview.endDate)} · 자동차
          </p>
        </div>
        <SharedDays days={preview.days} />
      </div>

      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공유를 해제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              지금 링크로는 더 이상 열리지 않아요. 이미 자기 코스로 복사해 간 사람의 코스는 그대로
              남아요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!current) return;
                unshare.mutate(
                  { trip, shareId: current.id },
                  {
                    onSuccess: () => toast.success("공유를 해제했어요."),
                    onError: () => toast.error("공유를 해제하지 못했어요. 다시 시도해주세요."),
                  },
                );
              }}
            >
              해제하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
