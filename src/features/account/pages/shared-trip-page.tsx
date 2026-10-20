// 공개 코스(받는 사람) — 링크로 열람하고, 로그인 후 내 코스로 복사한다. 해제된 링크는 열리지 않는다.
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { LoadingIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateTrip } from "@/features/trips";
import { sigunName } from "@/shared/domain";
import { formatDateKo } from "@/shared/lib/date";
import { SharedDays } from "../components/shared-days";
import { useActiveShare } from "../hooks/use-shares";
import { ShareNotFoundError } from "../api/shares-api";
import { draftFromShare } from "../lib/share-copy";

export default function SharedTripPage() {
  const { shareId } = useParams();
  const share = useActiveShare(shareId);
  const auth = useAuthState();
  const create = useCreateTrip();
  const navigate = useNavigate();

  if (share.isPending) return <Skeleton className="mx-4 my-6 h-64" />;
  if (share.isError) {
    const gone = share.error instanceof ShareNotFoundError;
    return (
      <section className="mx-auto flex max-w-screen-md flex-col gap-3 px-4 py-10">
        <h1 className="text-xl font-semibold">
          {gone ? "열 수 없는 코스예요" : "코스를 불러오지 못했어요"}
        </h1>
        <p className="text-muted-foreground">
          {gone
            ? "공유가 해제됐거나 없는 링크예요."
            : "네트워크 연결을 확인하고 다시 시도해주세요."}
        </p>
        <div className="flex gap-2">
          {!gone && <Button onClick={() => void share.refetch()}>다시 시도</Button>}
          <Button variant="outline" asChild>
            <Link to={paths.home}>여행지 둘러보기</Link>
          </Button>
        </div>
      </section>
    );
  }

  const s = share.data;
  const onCopy = () => {
    if (auth.status !== "authed") {
      void navigate(paths.login, { state: { from: paths.sharedTrip(s.id) } });
      return;
    }
    create.mutate(
      { uid: auth.user.uid, draft: draftFromShare(s) },
      {
        onSuccess: (trip) => {
          toast.success("내 코스로 복사했어요. 날짜와 순서를 내 여행에 맞게 고쳐 보세요.");
          void navigate(paths.tripEdit(trip.id));
        },
        onError: () => toast.error("복사하지 못했어요. 다시 시도해주세요."),
      },
    );
  };

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-5 px-4 py-6">
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm">공유받은 코스</p>
        <h1 className="text-xl font-semibold text-balance">{s.title}</h1>
        <p className="text-muted-foreground text-sm">
          {formatDateKo(s.startDate)} ~ {formatDateKo(s.endDate)} · 자동차
          {s.siguns.length > 0 && ` · ${s.siguns.map(sigunName).join(", ")}`}
        </p>
      </div>
      <div className="bg-background-subtle text-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
        <p className="text-sm">
          내 코스로 복사하면 날짜·순서를 바꿔 쓸 수 있어요. 원래 코스는 바뀌지 않아요.
        </p>
        <Button onClick={onCopy} disabled={create.isPending || auth.status === "loading"}>
          {create.isPending && <LoadingIcon size="sm" className="animate-spin" />}
          {auth.status === "authed" ? "내 코스로 복사" : "로그인하고 복사"}
        </Button>
      </div>
      <SharedDays days={s.days} />
      <p className="text-muted-foreground text-sm">
        영업시간·축제 일정은 공개 시점 정보예요. 복사하면 코스 편집에서 이동시간과 방문 가능 시간을
        다시 계산해요.
      </p>
    </section>
  );
}
