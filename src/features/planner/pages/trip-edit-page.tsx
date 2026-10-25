// S10 코스 편집 화면 — 상태(불러오는 중·작성 중 없음·권한 없음·준비) 분기 + 저장(로그인 연결·버전 충돌).
// 실제 서버 성공 응답 전에는 저장 완료를 표시하지 않는다. 로그인 취소·실패에도 작성 내용은 이 기기에 남는다 (ACC-02).
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Notice } from "@/components/detail-parts";
import { ShareIcon } from "@/components/icons";
import { PageTopBar } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { TripNotFoundError, VersionConflictError } from "@/features/trips";
import { errorMessage } from "@/lib/errors";
import { TripEditor } from "../components/trip-editor";
import { SaveConflictDialog } from "../components/save-conflict-dialog";
import { useTripEditor } from "../hooks/use-trip-editor";

export default function TripEditPage() {
  const { tripId = "draft" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuthState();
  const editor = useTripEditor(tripId);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [overwriting, setOverwriting] = useState(false);
  const { state } = editor;

  async function onSave() {
    if (editor.needsLogin) {
      toast.info("로그인하면 이 여행을 계정에 저장해요. 작성한 내용은 그대로 남아요.");
      void navigate(paths.login, { state: { from: paths.tripEdit("draft"), purpose: "save" } });
      return;
    }
    try {
      const saved = await editor.save();
      toast.success("저장했어요. 다른 기기에서도 열 수 있어요.");
      if (tripId === "draft") void navigate(paths.tripEdit(saved.id), { replace: true });
    } catch (e) {
      if (e instanceof VersionConflictError) return;
      toast.error(`저장하지 못했어요. ${errorMessage(e)}`);
    }
  }

  // "로그인하고 저장"으로 로그인한 뒤 돌아오면 저장까지 이어서 한다 (한 번만 — 실패하면 저장 버튼으로 다시)
  const resumeSave = (location.state as { resumeSave?: boolean } | null)?.resumeSave === true;
  const canResume = resumeSave && state.status === "ready" && state.isDraft && !editor.needsLogin;
  const resumed = useRef(false);
  useEffect(() => {
    if (!canResume || resumed.current) return;
    resumed.current = true;
    void onSave();
  });

  if (state.status === "loading" || (tripId !== "draft" && auth.status === "loading")) {
    return (
      <>
        <PageTopBar fallback={paths.myTrips} title="코스" />
        <DetailSkeleton />
      </>
    );
  }
  if (state.status === "no-draft") {
    return (
      <>
        <PageTopBar fallback={paths.home} title="코스" />
        <EmptyState
          title="작성 중인 여행이 없어요"
          description="저장한 여행은 내 여행에서 열 수 있어요."
          action={
            <div className="flex gap-2">
              <Button asChild variant="outline" size="touch">
                <Link to={paths.myTrips}>내 여행</Link>
              </Button>
              <Button asChild size="touch">
                <Link to={paths.tripNew}>여행 만들기</Link>
              </Button>
            </div>
          }
        />
      </>
    );
  }
  if (state.status === "error") {
    const denied = (state.error as { code?: string } | null)?.code === "permission-denied";
    return (
      <>
        <PageTopBar fallback={paths.myTrips} title="코스" />
        {auth.status === "guest" ? (
          <EmptyState
            title="로그인하면 저장한 코스를 열 수 있어요"
            action={
              <Button asChild size="touch">
                <Link to={paths.login} state={{ from: paths.tripEdit(tripId) }}>
                  로그인하기
                </Link>
              </Button>
            }
          />
        ) : state.error instanceof TripNotFoundError || denied ? (
          <EmptyState
            title="코스를 열 수 없어요"
            description="삭제됐거나 다른 계정의 코스예요."
            action={
              <Button asChild variant="outline" size="touch">
                <Link to={paths.myTrips}>내 여행 보기</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState error={state.error} onRetry={state.retry} />
        )}
      </>
    );
  }

  const { trip, isDraft, dirty, staleBase } = state;
  const banners = (
    <>
      {isDraft ? (
        <Notice tone="info" title="아직 저장 전이에요">
          이 기기에만 보관돼요. 저장하면 다른 기기에서도 열고 공유할 수 있어요.
        </Notice>
      ) : dirty ? (
        <Notice tone="warning" title="저장하지 않은 변경이 있어요">
          <span>이 기기에 보관 중이에요. 저장해야 다른 기기에 반영돼요.</span>
          <Button
            size="sm"
            variant="outline"
            className="bg-background mt-2"
            onClick={() => {
              setDiscardOpen(true);
            }}
          >
            변경 버리기
          </Button>
        </Notice>
      ) : null}
      {staleBase ? (
        <Notice tone="warning" title="다른 기기에서 이 코스가 바뀌었어요">
          저장할 때 어떤 내용을 남길지 고를 수 있어요.
        </Notice>
      ) : null}
    </>
  );

  return (
    <div className="flex flex-col">
      <Seo title={trip.title} noindex />
      <PageTopBar
        fallback={paths.myTrips}
        title={trip.title}
        right={
          <>
            {!isDraft && !dirty ? (
              <Button asChild variant="ghost" size="icon-touch" aria-label="공유 설정">
                <Link to={paths.tripShare(tripId)}>
                  <ShareIcon />
                </Link>
              </Button>
            ) : null}
            <Button size="touch" disabled={!dirty || editor.isSaving} onClick={() => void onSave()}>
              {editor.isSaving
                ? "저장 중..."
                : dirty
                  ? editor.needsLogin
                    ? "로그인하고 저장"
                    : "저장"
                  : "저장됨"}
            </Button>
          </>
        }
      />
      <TripEditor trip={trip} update={editor.update} banners={banners} />

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="저장하지 않은 변경을 버릴까요?"
        description="마지막으로 저장한 코스로 돌아가요. 버리면 되돌릴 수 없어요."
        actionLabel="버리기"
        destructive
        onAction={() => {
          editor.discard();
          setDiscardOpen(false);
          toast.success("저장된 코스로 돌아왔어요.");
        }}
      />
      <SaveConflictDialog
        open={editor.conflict}
        pending={overwriting}
        onClose={editor.dismissConflict}
        onKeepServer={() => {
          editor.discard();
          toast.success("최신 코스를 불러왔어요.");
        }}
        onOverwrite={() => {
          setOverwriting(true);
          editor
            .overwriteWithMine()
            .then(() => toast.success("내 변경으로 저장했어요."))
            .catch((e: unknown) => toast.error(`저장하지 못했어요. ${errorMessage(e)}`))
            .finally(() => {
              setOverwriting(false);
            });
        }}
      />
    </div>
  );
}
