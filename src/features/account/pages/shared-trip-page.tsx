// S12 공개 코스 — 받은 사람 화면. 맨 위에 "보기 전용" 안내 + 내 코스로 복사(로그인 후). 해제된 링크는 열 수 없다 (SHR-02·03).
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { Notice } from "@/components/detail-parts";
import { CopyIcon } from "@/components/icons";
import { PageBody, PageTopBar } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";
import { ShareUnavailableError } from "../api/account-api";
import { PublicTripView } from "../components/public-trip-view";
import { useCopyShare, useShare } from "../hooks/use-account";

export default function SharedTripPage() {
  const { shareId = "" } = useParams();
  const auth = useAuthState();
  const navigate = useNavigate();
  const location = useLocation();
  const q = useShare(shareId);
  const copy = useCopyShare();

  if (q.isPending) {
    return (
      <>
        <PageTopBar fallback={paths.home} title="공유 코스" />
        <DetailSkeleton />
      </>
    );
  }
  if (q.isError || !q.data.active) {
    return (
      <>
        <PageTopBar fallback={paths.home} title="공유 코스" />
        {q.isError && !(q.error instanceof ShareUnavailableError) ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : (
          <EmptyState
            title="공유가 중지됐거나 없는 링크예요"
            description="작성자가 공유를 멈췄거나 코스를 지웠을 수 있어요."
            action={
              <Button asChild variant="outline" size="touch">
                <Link to={paths.home}>전남 여행 둘러보기</Link>
              </Button>
            }
          />
        )}
      </>
    );
  }

  const share = q.data;
  function onCopy() {
    if (auth.status !== "authed") {
      void navigate(paths.login, { state: { from: location.pathname } });
      return;
    }
    copy.mutate(share, {
      onSuccess: (t) => {
        toast.success("내 코스로 복사했어요. 날짜와 시간을 내 여행에 맞게 고쳐 보세요.");
        void navigate(paths.tripEdit(t.id));
      },
      onError: (e) => toast.error(`복사하지 못했어요. ${errorMessage(e)}`),
    });
  }

  return (
    <div className="flex flex-col pb-10">
      <Seo title={share.title} description="머물전남.에서 공유한 전남 여행 코스예요." />
      <PageTopBar fallback={paths.home} title="공유 코스" />
      <PageBody className="gap-6 pt-5">
        <Notice tone="info" title="보기 전용 코스예요">
          <p>복사하면 내 코스로 따로 저장돼요. 원본이나 공유 중지와 상관없이 남아요.</p>
          <Button size="touch" className="mt-3" disabled={copy.isPending} onClick={onCopy}>
            <CopyIcon size="sm" />
            {copy.isPending
              ? "복사하는 중..."
              : auth.status === "authed"
                ? "내 코스로 복사하기"
                : "로그인하고 복사하기"}
          </Button>
        </Notice>
        <PublicTripView share={share} />
      </PageBody>
    </div>
  );
}
