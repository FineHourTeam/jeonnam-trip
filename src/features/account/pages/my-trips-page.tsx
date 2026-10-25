// S11 내 여행 — 저장 전 작성 중인 여행을 맨 위에, 저장한 여행은 제목·날짜·지역·수정일·공유 상태 카드로.
// 열기·복사·공유·삭제. 삭제하면 공유 링크 접근도 막는다 (SHR-02).
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AddIcon, MoreIcon, TripIcon } from "@/components/icons";
import { PageBody } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { EmptyState, ErrorState, RowListSkeleton } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreateTrip,
  useCurrentUid,
  useMyTrips,
  useTripDraftStore,
  useTripWorkingStore,
} from "@/features/trips";
import { errorMessage } from "@/lib/errors";
import { sigunName, type Trip } from "@/shared/domain";
import { diffDays, formatPeriodKo } from "@/shared/lib/date";
import { formatDateDot, tripLengthLabel } from "@/shared/lib/format";
import { useDeleteTripAndShare } from "../hooks/use-account";

function TripCardBody({
  title,
  startDate,
  endDate,
  siguns,
  count,
  footer,
}: {
  title: string;
  startDate: string;
  endDate: string;
  siguns: Trip["siguns"];
  count: number;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="truncate text-base font-semibold">{title}</span>
      <span className="text-muted-foreground text-sm">
        {formatPeriodKo(startDate, endDate)} · {tripLengthLabel(diffDays(startDate, endDate) + 1)}
        {siguns.length > 0 ? ` · ${siguns.map(sigunName).join("·")}` : ""} · 장소 {count}곳
      </span>
      <div className="flex flex-wrap items-center gap-1.5 pt-1">{footer}</div>
    </div>
  );
}

export default function MyTripsPage() {
  const navigate = useNavigate();
  const uid = useCurrentUid();
  const q = useMyTrips();
  const draft = useTripDraftStore((s) => s.draft);
  const copies = useTripWorkingStore((s) => s.copies);
  const create = useCreateTrip();
  const del = useDeleteTripAndShare();
  const [deleting, setDeleting] = useState<Trip | null>(null);

  function duplicate(t: Trip) {
    if (!uid) return;
    const {
      id: _id,
      ownerUid: _o,
      version: _v,
      createdAt: _c,
      updatedAt: _u,
      shareId: _s,
      ...rest
    } = copies[t.id]?.trip ?? t;
    create.mutate(
      { uid, draft: { ...rest, title: `${t.title} 사본` } },
      {
        onSuccess: (n) => {
          toast.success("코스를 복사했어요.", {
            action: {
              label: "열기",
              onClick: () => {
                void navigate(paths.tripEdit(n.id));
              },
            },
          });
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  return (
    <PageBody className="gap-5 pt-5 pb-8 md:pt-8">
      <Seo title="내 여행" noindex />
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">내 여행</h1>
        <Button asChild size="touch">
          <Link to={paths.tripNew}>
            <AddIcon size="sm" />
            여행 만들기
          </Link>
        </Button>
      </div>

      {draft ? (
        <Link
          to={paths.tripEdit("draft")}
          className="border-primary bg-primary-soft text-primary-soft-foreground flex items-center gap-3 rounded-xl border p-4"
        >
          <TripCardBody
            title={draft.title}
            startDate={draft.startDate}
            endDate={draft.endDate}
            siguns={draft.siguns}
            count={draft.days.reduce((n, d) => n + d.items.length, 0)}
            footer={<Badge>저장 전 · 이어서 만들기</Badge>}
          />
        </Link>
      ) : null}

      {q.isPending ? (
        <RowListSkeleton count={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 && !draft ? (
        <EmptyState
          icon={<TripIcon />}
          title="아직 저장한 여행이 없어요"
          description="축제나 장소에서 시작하거나 빈 일정으로 만들어 보세요."
          action={
            <Button asChild size="touch">
              <Link to={paths.tripNew}>여행 만들기</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {q.data.map((t) => (
            <li key={t.id} className="border-border flex items-start gap-2 rounded-xl border p-4">
              <Link to={paths.tripEdit(t.id)} className="flex min-w-0 flex-1">
                <TripCardBody
                  title={t.title}
                  startDate={t.startDate}
                  endDate={t.endDate}
                  siguns={t.siguns}
                  count={t.days.reduce((n, d) => n + d.items.length, 0)}
                  footer={
                    <>
                      <span className="text-muted-foreground text-xs">
                        {formatDateDot(t.updatedAt)} 수정
                      </span>
                      {t.shareId ? <Badge variant="secondary">공유 중</Badge> : null}
                      {copies[t.id] ? <Badge variant="outline">저장하지 않은 변경</Badge> : null}
                    </>
                  }
                />
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-touch"
                    aria-label={`${t.title} 더보기`}
                    className="-mt-2 -mr-2"
                  >
                    <MoreIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      void navigate(paths.tripEdit(t.id));
                    }}
                  >
                    열기
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      duplicate(t);
                    }}
                  >
                    복사
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      void navigate(paths.tripShare(t.id));
                    }}
                  >
                    공유 설정
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      setDeleting(t);
                    }}
                  >
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
        title="여행을 삭제할까요?"
        description={
          deleting?.shareId
            ? "공유 링크로도 더 이상 열 수 없어요. 이미 다른 사람이 복사한 코스는 남아요. 삭제하면 되돌릴 수 없어요."
            : "삭제하면 되돌릴 수 없어요. 보관함의 장소는 그대로예요."
        }
        actionLabel="삭제하기"
        destructive
        pending={del.isPending}
        onAction={() => {
          if (!deleting) return;
          del.mutate(deleting, {
            onSuccess: () => {
              setDeleting(null);
              toast.success("여행을 삭제했어요.");
            },
            onError: (e) => toast.error(`삭제하지 못했어요. ${errorMessage(e)}`),
          });
        }}
      />
    </PageBody>
  );
}
