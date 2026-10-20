// S11 내 여행 — 저장한 코스 카드(제목·날짜·지역·수정일·공개 상태)와 열기·복사·공유·삭제.
// 삭제는 공유본을 먼저 막고 코스를 지운다. 저장·삭제가 실제로 성공하기 전에는 완료로 표시하지 않는다.
import { useState } from "react";
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
import { sigunName, type Trip } from "@/shared/domain";
import { formatDateKo } from "@/shared/lib/date";
import { useDeactivateShareOnly } from "../hooks/use-shares";
import { draftFromTrip } from "../lib/share-copy";

export default function MyTripsPage() {
  const trips = useMyTrips();
  const navigate = useNavigate();
  const create = useCreateTrip();
  const remove = useDeleteTrip();
  const unshare = useDeactivateShareOnly();
  const [deleting, setDeleting] = useState<Trip | null>(null);

  const duplicate = (trip: Trip) => {
    create.mutate(
      { uid: trip.ownerUid, draft: draftFromTrip(trip) },
      {
        onSuccess: (copy) => {
          toast.success("코스를 복사했어요.");
          void navigate(paths.tripEdit(copy.id));
        },
        onError: () => toast.error("코스를 복사하지 못했어요. 다시 시도해주세요."),
      },
    );
  };

  const confirmDelete = async () => {
    const trip = deleting;
    if (!trip) return;
    setDeleting(null);
    try {
      if (trip.shareId) await unshare.mutateAsync(trip.shareId);
      await remove.mutateAsync(trip);
      toast.success("코스를 삭제했어요.");
    } catch {
      toast.error("코스를 삭제하지 못했어요. 다시 시도해주세요.");
    }
  };

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">내 여행</h1>
        <Button size="sm" asChild>
          <Link to={paths.tripNew}>
            <AddIcon size="sm" />
            여행 만들기
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
          <p className="text-muted-foreground text-sm">내 여행을 불러오지 못했어요.</p>
          <Button variant="outline" size="sm" onClick={() => void trips.refetch()}>
            다시 시도
          </Button>
        </div>
      )}
      {trips.data?.length === 0 && (
        <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p>아직 저장한 여행이 없어요.</p>
          <p className="text-muted-foreground text-sm">
            축제나 장소를 골라 첫 코스를 만들어 보세요.
          </p>
          <Button asChild>
            <Link to={paths.tripNew}>여행 만들기</Link>
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
            <AlertDialogTitle>코스를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleting?.title}」 코스를 지우면 되돌릴 수 없어요.
              {deleting?.shareId ? " 공유 링크도 더 이상 열리지 않아요." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>삭제하기</AlertDialogAction>
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
  const places = trip.days.reduce((n, d) => n + d.items.length, 0);
  return (
    <li className="border-border bg-card text-card-foreground flex items-start gap-3 rounded-lg border p-4">
      <Link to={paths.tripEdit(trip.id)} className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-semibold break-words">{trip.title}</span>
        <span className="text-muted-foreground text-sm">
          {formatDateKo(trip.startDate)} ~ {formatDateKo(trip.endDate)} · 장소 {places}곳
        </span>
        <span className="text-muted-foreground text-sm">
          {trip.siguns.length > 0 ? trip.siguns.map(sigunName).join(", ") : "지역 미정"} · 수정{" "}
          {trip.updatedAt.slice(0, 10)}
        </span>
        <span>
          <Badge variant={trip.shareId ? "secondary" : "outline"}>
            {trip.shareId ? "공유 중" : "비공개"}
          </Badge>
        </span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${trip.title} 더보기`}
            disabled={busy}
          >
            <MoreIcon size="sm" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={paths.tripEdit(trip.id)}>열기·편집</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDuplicate}>복사</DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={paths.tripShare(trip.id)}>공유 설정</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
