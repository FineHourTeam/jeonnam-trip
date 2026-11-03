// S11 내 여행 — 저장한 코스 카드(제목·날짜·지역·수정일·공개 상태)와 열기·복사·공유·삭제.
// 삭제는 공유본을 먼저 막고 코스를 지운다. 저장·삭제가 실제로 성공하기 전에는 완료로 표시하지 않는다.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { AddIcon, MoreIcon } from "@/components/icons";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateTrip, useDeleteTrip, useMyTrips } from "@/features/trips";
import type { Trip } from "@/shared/domain";
import { formatDay, kstDateOf } from "@/shared/lib/date";
import { useDeactivateTripShares } from "../hooks/use-shares";
import { draftFromTrip } from "../lib/share-copy";

export default function MyTripsPage() {
  const { t } = useTranslation("account");
  const trips = useMyTrips();
  const navigate = useNavigate();
  const create = useCreateTrip();
  const remove = useDeleteTrip();
  const unshare = useDeactivateTripShares();
  const [deleting, setDeleting] = useState<Trip | null>(null);

  const duplicate = (trip: Trip) => {
    create.mutate(
      { uid: trip.ownerUid, draft: draftFromTrip(trip) },
      {
        onSuccess: (copy) => {
          toast.success(t("myTrips.duplicated"));
          void navigate(paths.tripEdit(copy.id));
        },
        onError: () => toast.error(t("myTrips.duplicateFailed")),
      },
    );
  };

  const confirmDelete = async () => {
    const trip = deleting;
    if (!trip) return;
    setDeleting(null);
    try {
      await unshare.mutateAsync(trip);
      await remove.mutateAsync(trip);
      toast.success(t("myTrips.deleted"));
    } catch {
      toast.error(t("myTrips.deleteFailed"));
    }
  };

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t("myTrips.title")}</h1>
        <Button size="sm" asChild>
          <Link to={paths.tripNew}>
            <AddIcon size="sm" />
            {t("myTrips.newTrip")}
          </Link>
        </Button>
      </div>

      {trips.isPending && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {trips.isError && (
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-sm">{t("myTrips.loadError")}</p>
          <Button variant="outline" size="sm" onClick={() => void trips.refetch()}>
            {t("retry", { ns: "common" })}
          </Button>
        </div>
      )}
      {trips.data?.length === 0 && (
        <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p>{t("myTrips.empty")}</p>
          <p className="text-muted-foreground text-sm">{t("myTrips.emptyHint")}</p>
          <Button asChild>
            <Link to={paths.tripNew}>{t("myTrips.newTrip")}</Link>
          </Button>
        </div>
      )}
      {trips.data && trips.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {trips.data.map((t) => (
            <TripCard
              key={t.id}
              trip={t}
              busy={create.isPending || remove.isPending}
              onDuplicate={() => {
                duplicate(t);
              }}
              onDelete={() => {
                setDeleting(t);
              }}
            />
          ))}
        </ul>
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("myTrips.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(deleting?.shareId ? "myTrips.deleteBodyShared" : "myTrips.deleteBody", {
                title: deleting?.title ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("close", { ns: "common" })}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              {t("myTrips.deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

interface TripCardProps {
  trip: Trip;
  busy: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}

function TripCard({ trip, busy, onDuplicate, onDelete }: TripCardProps) {
  const { t, i18n } = useTranslation("account");
  const places = trip.days.reduce((n, d) => n + d.items.length, 0);
  const regions =
    trip.siguns.length > 0
      ? trip.siguns.map((code) => t(`sigun.${code}`, { ns: "common" })).join(", ")
      : t("myTrips.card.noRegion");
  return (
    <li className="border-border bg-card text-card-foreground flex items-start gap-3 rounded-lg border p-4">
      <Link to={paths.tripEdit(trip.id)} className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-semibold break-words">{trip.title}</span>
        <span className="text-muted-foreground text-sm">
          {t("myTrips.card.dates", {
            start: formatDay(trip.startDate, i18n.language),
            end: formatDay(trip.endDate, i18n.language),
            count: places,
          })}
        </span>
        <span className="text-muted-foreground text-sm">
          {t("myTrips.card.meta", { regions, date: kstDateOf(trip.updatedAt) })}
        </span>
        <span>
          <Badge variant={trip.shareId ? "secondary" : "outline"}>
            {t(trip.shareId ? "myTrips.card.shared" : "myTrips.card.private")}
          </Badge>
        </span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("myTrips.card.more", { title: trip.title })}
            disabled={busy}
          >
            <MoreIcon size="sm" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={paths.tripEdit(trip.id)}>{t("myTrips.card.open")}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDuplicate}>{t("myTrips.card.duplicate")}</DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={paths.tripShare(trip.id)}>{t("myTrips.card.shareSettings")}</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            {t("delete", { ns: "common" })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
