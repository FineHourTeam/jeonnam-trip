// 로그인(S13) — Google 로그인 1종. 성공하면 location.state.from(예: /trips/draft)으로 돌아간다.
// 취소·실패·팝업 차단 때도 작성 중인 초안(localStorage)은 그대로 둔다.
import { Navigate, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { LoadingIcon } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTripDraftStore } from "@/features/trips";
import { LoginError } from "../api/auth-api";
import { useSignIn } from "../hooks/use-auth-actions";
import { returnPathOf, type LoginFailure } from "../lib/login";

const FAILURE_COPY: Record<LoginFailure, { title: string; description: string }> = {
  cancelled: {
    title: "로그인을 취소했어요",
    description: "저장하려면 다시 로그인해주세요.",
  },
  "popup-blocked": {
    title: "로그인 창이 열리지 않았어요",
    description: "브라우저가 팝업을 막았어요. 주소창에서 팝업을 허용하고 다시 시도해주세요.",
  },
  network: {
    title: "로그인하지 못했어요",
    description: "네트워크 연결을 확인하고 다시 시도해주세요.",
  },
  "unauthorized-domain": {
    title: "이 주소에서는 로그인할 수 없어요",
    description: "머물전남. 공식 주소에서 다시 시도해주세요.",
  },
  unknown: {
    title: "로그인하지 못했어요",
    description: "잠시 후 다시 시도해주세요.",
  },
};

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const authState = useAuthState();
  const draft = useTripDraftStore((s) => s.draft);
  const signIn = useSignIn();
  const returnTo = returnPathOf(location.state);

  // 로그인에 성공하면 인증 상태가 바뀌면서 여기서 원래 화면으로 돌아간다 (이미 로그인한 경우 포함)
  if (authState.status === "authed") return <Navigate to={returnTo} replace />;

  const failure =
    signIn.error instanceof LoginError ? signIn.error.reason : signIn.error && "unknown";
  const copy = failure ? FAILURE_COPY[failure] : null;

  const cancel = () => {
    // 앱 안에서 넘어왔으면 직전 화면으로, 주소로 바로 들어왔으면 홈으로
    if (location.key === "default") void navigate(paths.home, { replace: true });
    else void navigate(-1);
  };

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-balance">로그인</h1>
        <p className="text-muted-foreground text-sm">
          로그인하면 만든 코스를 저장하고, 다른 기기에서도 이어서 보고 고칠 수 있어요.
        </p>
      </div>

      {draft && (
        <div className="bg-background-subtle text-foreground rounded-lg p-4 text-sm">
          작성 중인 「{draft.title}」 코스는 이 기기에 그대로 있어요. 로그인한 뒤 이어서 저장할 수
          있어요.
        </div>
      )}

      {copy && (
        <Alert variant={failure === "cancelled" ? "default" : "destructive"} role="alert">
          <AlertTitle>{copy.title}</AlertTitle>
          <AlertDescription>{copy.description}</AlertDescription>
        </Alert>
      )}

      {authState.status === "loading" ? (
        <Skeleton className="h-9 w-full rounded-lg" />
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            disabled={signIn.isPending}
            onClick={() => {
              // 성공하면 인증 상태가 바뀌며 이 화면이 내려간다 — 언마운트 뒤에도 이어지게 then으로
              signIn
                .mutateAsync()
                .then(() => toast.success("로그인했어요."))
                .catch(() => undefined); // 실패 문구는 signIn.error로 그린다
            }}
          >
            {signIn.isPending && <LoadingIcon size="sm" className="animate-spin" />}
            {failure ? "다시 시도" : "Google 계정으로 로그인"}
          </Button>
          <Button variant="ghost" size="lg" onClick={cancel}>
            로그인 없이 돌아가기
          </Button>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Google 계정의 이름과 이메일 주소로 로그인해요. 저장한 코스는 공유하기 전까지 나만 볼 수
        있어요. 로그아웃하면 이 기기에 남은 작성 중 코스도 함께 지워져요.
      </p>
    </section>
  );
}
