// S12 공유 설정 — 공개될 내용을 미리 보여 주고 링크 만들기·업데이트·해제를 한다.
// 개인 메모·출발/종료 위치는 빠진다. 직접 입력한 장소는 공개 대상이라 미리 알린다 (기능명세 §8).
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { ShareLinkConflictError, useTrip } from "@/features/trips";
import type { Trip } from "@/shared/domain";
import { formatDay, kstDateOf } from "@/shared/lib/date";
import { SharedDays } from "../components/shared-days";
import { ShareInactiveError } from "../api/shares-api";
import { useOwnShare, usePublishShare, useUnshare } from "../hooks/use-shares";
import { customPlaceCount, toSharedTrip } from "../lib/share-copy";

export default function TripSharePage() {
  const { t } = useTranslation("account");
  const { tripId } = useParams();
  const trip = useTrip(tripId);

  if (trip.isPending) return <Skeleton className="mx-4 my-6 h-64" />;
  // 이미 불러온 코스가 있으면 배경 재조회 실패(일시적인 네트워크 오류)로 화면을 바꾸지 않는다
  if (!trip.data) {
    return (
      <section className="mx-auto flex max-w-screen-md flex-col gap-3 px-4 py-10">
        <h1 className="text-xl font-semibold">{t("share.loadErrorTitle")}</h1>
        <p className="text-muted-foreground">{t("share.loadErrorBody")}</p>
        <div className="flex gap-2">
          <Button onClick={() => void trip.refetch()}>{t("retry", { ns: "common" })}</Button>
          <Button variant="outline" asChild>
            <Link to={paths.myTrips}>{t("share.viewMyTrips")}</Link>
          </Button>
        </div>
      </section>
    );
  }
  return <ShareSettings trip={trip.data} />;
}

function ShareSettings({ trip }: { trip: Trip }) {
  const { t, i18n } = useTranslation("account");
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
        onSuccess: () => toast.success(t(active ? "share.updated" : "share.created")),
        onError: (e) => {
          toast.error(
            e instanceof ShareInactiveError || e instanceof ShareLinkConflictError
              ? e.message
              : t("share.publishFailed"),
          );
        },
      },
    );
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("share.linkCopied"));
    } catch {
      toast.error(t("share.linkCopyFailed"));
    }
  };

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-5 px-4 py-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to={paths.tripEdit(trip.id)} aria-label={t("share.backToTrip")}>
            <ChevronLeftIcon />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">{t("share.title")}</h1>
      </div>

      <div className="bg-background-subtle text-foreground flex flex-col gap-3 rounded-lg p-4">
        {trip.shareId && share.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : trip.shareId && share.isError ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm">{t("share.statusError")}</p>
            <Button variant="outline" size="sm" onClick={() => void share.refetch()}>
              {t("retry", { ns: "common" })}
            </Button>
          </div>
        ) : active ? (
          <>
            <p className="font-medium">{t("share.activeNotice")}</p>
            <div className="flex gap-2">
              <Input
                value={link}
                readOnly
                aria-label={t("share.linkLabel")}
                onFocus={(e) => {
                  e.target.select();
                }}
              />
              <Button variant="outline" onClick={() => void onCopy()}>
                {t("share.copy")}
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              {t("share.published", {
                date: formatDay(kstDateOf(current.publishedAt), i18n.language),
                version: current.publishedVersion,
              })}
              {outdated && ` ${t("share.outdated")}`}
            </p>
          </>
        ) : (
          <p className="font-medium">{t("share.notShared")}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onPublish}
            disabled={shareUnknown || publish.isPending || unshare.isPending}
          >
            {publish.isPending && <LoadingIcon size="sm" className="animate-spin" />}
            {t(active ? "share.update" : "share.create")}
          </Button>
          {active && (
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOff(true);
              }}
              disabled={unshare.isPending}
            >
              {t("share.unshare")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">{t("share.previewTitle")}</h2>
        <ul className="text-muted-foreground list-disc pl-5 text-sm">
          <li>{t("share.includes")}</li>
          <li>{t("share.excludes")}</li>
          {customs > 0 && (
            <li className="text-foreground">{t("share.customPlaces", { count: customs })}</li>
          )}
        </ul>
        <div className="border-border flex flex-col gap-1 rounded-lg border p-4">
          <p className="text-lg font-semibold">{preview.title}</p>
          <p className="text-muted-foreground text-sm">
            {formatDay(preview.startDate, i18n.language)} ~{" "}
            {formatDay(preview.endDate, i18n.language)} · {t("sharedTrip.car")}
          </p>
        </div>
        <SharedDays days={preview.days} />
      </div>

      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("share.unshareTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("share.unshareBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("close", { ns: "common" })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!current) return;
                unshare.mutate(
                  { trip, shareId: current.id },
                  {
                    onSuccess: () => toast.success(t("share.unshared")),
                    onError: (e) => {
                      toast.error(
                        e instanceof ShareLinkConflictError ? e.message : t("share.unshareFailed"),
                      );
                    },
                  },
                );
              }}
            >
              {t("share.unshareAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
