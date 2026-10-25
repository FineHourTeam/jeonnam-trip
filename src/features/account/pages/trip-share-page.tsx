// S12 공유 설정 — 공개 미리보기 + 빠지는 정보 → 링크 만들기 / 링크 복사 / 공유 내용 업데이트 / 공유 중지.
// 공유본은 공개 시점 사본이라 코스를 고쳐도 자동 반영되지 않는다 (SHR-01·02).
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Notice } from "@/components/detail-parts";
import { CopyIcon, ShareIcon } from "@/components/icons";
import { PageBody, PageTopBar } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { DetailSkeleton, ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTripSchedule } from "@/features/planner";
import { useTrip, useTripWorkingStore } from "@/features/trips";
import { errorMessage } from "@/lib/errors";
import { formatDateDot } from "@/shared/lib/format";
import { PublicTripView } from "../components/public-trip-view";
import { useCreateShare, useShare, useStopShare, useUpdateShare } from "../hooks/use-account";
import { buildShareContent, excludedSummary } from "../lib/share-content";

export default function TripSharePage() {
  const { tripId = "" } = useParams();
  const q = useTrip(tripId);
  const dirty = useTripWorkingStore((s) => Boolean(s.copies[tripId]));
  const { schedules, isFetching } = useTripSchedule(q.data?.days ?? []);
  const share = useShare(q.data?.shareId);
  const create = useCreateShare();
  const update = useUpdateShare();
  const stop = useStopShare();
  const [confirmStop, setConfirmStop] = useState(false);

  if (q.isPending) {
    return (
      <>
        <PageTopBar fallback={paths.myTrips} title="공유 설정" />
        <DetailSkeleton />
      </>
    );
  }
  if (q.isError) {
    return (
      <>
        <PageTopBar fallback={paths.myTrips} title="공유 설정" />
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      </>
    );
  }

  const trip = q.data;
  const content = buildShareContent(trip, schedules);
  const ex = excludedSummary(trip);
  const active = share.data?.active === true;
  const url =
    active && share.data ? `${window.location.origin}${paths.sharedTrip(share.data.id)}` : null;
  const busy = create.isPending || update.isPending || stop.isPending;

  async function copyLink() {
    if (!url) return;
    try {
      if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: trip.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("링크를 복사했어요.");
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") return;
      toast.error("복사하지 못했어요. 링크를 길게 눌러 직접 복사해 주세요.");
    }
  }

  return (
    <div className="flex flex-col pb-10">
      <Seo title="공유 설정" noindex />
      <PageTopBar fallback={paths.tripEdit(tripId)} title="공유 설정" />
      <PageBody className="gap-6 pt-5">
        {dirty ? (
          <Notice tone="warning" title="저장하지 않은 변경은 공유에 들어가지 않아요">
            <Link to={paths.tripEdit(tripId)} className="underline underline-offset-2">
              편집 화면에서 저장한 뒤
            </Link>{" "}
            공유해 주세요.
          </Notice>
        ) : null}

        <section className="border-border flex flex-col gap-3 rounded-xl border p-4">
          <h2 className="font-semibold">{active ? "공유 중이에요" : "아직 공유하지 않았어요"}</h2>
          {active && share.data ? (
            <>
              <p className="text-muted-foreground text-sm">
                {formatDateDot(share.data.publishedAt)}에 공개한 내용이 보여요. 코스를 고쳐도
                자동으로 바뀌지 않아요.
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={url ?? ""}
                  inputSize="touch"
                  aria-label="공유 링크"
                  onFocus={(e) => {
                    e.currentTarget.select();
                  }}
                />
                <Button size="touch" onClick={() => void copyLink()}>
                  <CopyIcon size="sm" />
                  복사
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="touch"
                  disabled={busy || dirty || isFetching}
                  onClick={() => {
                    update.mutate(
                      { share: share.data, content },
                      {
                        onSuccess: () => toast.success("지금 코스로 공유 내용을 바꿨어요."),
                        onError: (e) => toast.error(errorMessage(e)),
                      },
                    );
                  }}
                >
                  공유 내용 업데이트
                </Button>
                <Button
                  variant="ghost"
                  size="touch"
                  disabled={busy}
                  onClick={() => {
                    setConfirmStop(true);
                  }}
                >
                  공유 중지
                </Button>
              </div>
            </>
          ) : share.isError && trip.shareId ? (
            <ErrorState error={share.error} onRetry={() => void share.refetch()} className="py-4" />
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                링크를 아는 사람은 로그인 없이 볼 수 있고, 로그인하면 자기 코스로 복사할 수 있어요.
              </p>
              <Button
                size="xl"
                disabled={busy || dirty || isFetching}
                onClick={() => {
                  create.mutate(
                    { trip, content },
                    {
                      onSuccess: () => toast.success("공유 링크를 만들었어요."),
                      onError: (e) => toast.error(`링크를 만들지 못했어요. ${errorMessage(e)}`),
                    },
                  );
                }}
              >
                <ShareIcon size="sm" />
                {isFetching ? "시간 계산 중..." : "공유 링크 만들기"}
              </Button>
            </>
          )}
        </section>

        <Notice tone="info" title="공유에서 빠지는 정보">
          <ul className="list-disc pl-4">
            <li>개인 메모 {ex.memos}건</li>
            <li>
              출발·종료 위치(숙소 등) {ex.points > 0 ? `${String(ex.points)}일차 분` : "없음"}
            </li>
            <li>미배치 후보 {ex.unplaced}곳</li>
            <li>보관함·SNS 링크 전체</li>
          </ul>
          {ex.customs > 0 ? (
            <p className="mt-2">직접 등록한 장소 {ex.customs}곳은 이름·위치가 공유에 들어가요.</p>
          ) : null}
        </Notice>

        <section className="flex flex-col gap-3">
          <h2 className="text-muted-foreground text-sm font-semibold">받는 사람에게 보이는 화면</h2>
          <div className="border-border rounded-xl border border-dashed p-4">
            <PublicTripView share={content} />
          </div>
        </section>
      </PageBody>

      <ConfirmDialog
        open={confirmStop}
        onOpenChange={setConfirmStop}
        title="공유를 중지할까요?"
        description="지금 링크로는 더 이상 열 수 없어요. 이미 복사해 간 코스는 남아요. 다시 공유하면 새 링크가 만들어져요."
        actionLabel="중지하기"
        destructive
        pending={stop.isPending}
        onAction={() => {
          if (!share.data) return;
          stop.mutate(
            { shareId: share.data.id, tripId: trip.id },
            {
              onSuccess: () => {
                setConfirmStop(false);
                toast.success("공유를 중지했어요.");
              },
              onError: (e) => toast.error(errorMessage(e)),
            },
          );
        }}
      />
    </div>
  );
}
