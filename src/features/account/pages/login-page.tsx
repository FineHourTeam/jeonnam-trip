// 로그인(S13) — 카카오·Google 로그인 2종. 성공하면 location.state.from(예: /trips/draft)으로 돌아간다.
// 카카오는 카카오 화면에 다녀와 /auth/kakao/callback에서 마무리한다(kakao-callback-page).
// 취소·실패·팝업 차단 때도 작성 중인 초안(localStorage)은 그대로 둔다.
// 버튼은 각 브랜드 가이드(카카오 로그인 디자인 가이드·Google Identity 브랜딩)대로 — 레이블·로고·색을 바꾸지 않는다.
// 카카오톡·네이버 앱 같은 앱 안 브라우저는 Google이 로그인을 막으므로(403 disallowed_useragent) Google 버튼만 잠그고
// 외부 브라우저로 안내한다. 카카오 로그인은 막힌다는 근거가 없어 그대로 열어 둔다.
import { Navigate, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import googleG from "@/assets/brand/google-g.svg";
import kakaoSymbol from "@/assets/brand/kakao-symbol.svg";
import { LoadingIcon } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTripDraftStore } from "@/features/trips";
import { LoginError } from "../api/auth-api";
import { useSignIn } from "../hooks/use-auth-actions";
import { externalOpenUrlOf, inAppBrowserOf, returnPathOf } from "../lib/login";
import { failureCopyOf } from "../lib/login-copy";

// 카카오 먼저, Google 다음 (레이블은 각 가이드의 표준 문구)
const PROVIDER_BUTTONS = [
  { provider: "kakao", label: "카카오 로그인", logo: kakaoSymbol },
  { provider: "google", label: "Google 계정으로 로그인", logo: googleG },
] as const;

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const authState = useAuthState();
  const draft = useTripDraftStore((s) => s.draft);
  const returnTo = returnPathOf(location.state);
  const signIn = useSignIn(returnTo);
  const inApp = inAppBrowserOf(navigator.userAgent);

  // 로그인에 성공하면 인증 상태가 바뀌면서 여기서 원래 화면으로 돌아간다 (이미 로그인한 경우 포함)
  if (authState.status === "authed") return <Navigate to={returnTo} replace />;

  const failure =
    signIn.error instanceof LoginError ? signIn.error.reason : signIn.error && "unknown";
  const copy = failure && signIn.variables ? failureCopyOf(failure, signIn.variables) : null;

  const cancel = () => {
    // 앱 안에서 넘어왔으면 직전 화면으로, 첫 화면이면(주소로 바로 들어왔거나 가드가 replace로 보낸 경우) 홈으로
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) void navigate(-1);
    else void navigate(paths.home, { replace: true });
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
          {inApp
            ? `작성 중인 「${draft.title}」 코스는 지금 이 앱 안 브라우저에만 남아 있어요. 다른 브라우저에서는 보이지 않아요.`
            : `작성 중인 「${draft.title}」 코스는 이 기기에 그대로 있어요. 로그인한 뒤 이어서 저장할 수 있어요.`}
        </div>
      )}

      {copy && (
        <Alert
          variant={
            failure === "cancelled" || failure === "provider-unavailable"
              ? "default"
              : "destructive"
          }
          role="alert"
        >
          <AlertTitle>{copy.title}</AlertTitle>
          <AlertDescription>{copy.description}</AlertDescription>
        </Alert>
      )}

      {inApp && <InAppNotice externalUrl={externalOpenUrlOf(inApp, window.location.href)} />}

      <div className="flex flex-col gap-2">
        {authState.status === "loading" ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : (
          PROVIDER_BUTTONS.map(({ provider, label, logo }) => (
            <Button
              key={provider}
              variant={provider}
              size="xl"
              disabled={signIn.isPending || (inApp !== null && provider === "google")}
              onClick={() => {
                // Google: 성공하면 인증 상태가 바뀌며 이 화면이 내려간다 — 언마운트 뒤에도 이어지게 then으로.
                // 카카오: 카카오 화면으로 떠날 뿐이라 여기서는 알리지 않는다 (콜백 화면이 마무리한다)
                signIn
                  .mutateAsync(provider)
                  .then(() => {
                    if (provider === "google") toast.success("로그인했어요.");
                  })
                  .catch(() => undefined); // 실패 문구는 signIn.error로 그린다
              }}
            >
              {signIn.isPending && signIn.variables === provider ? (
                <LoadingIcon size="sm" className="animate-spin" />
              ) : (
                <img src={logo} alt="" aria-hidden className="size-4.5" />
              )}
              {label}
            </Button>
          ))
        )}
        <Button variant="ghost" size="lg" onClick={cancel}>
          로그인 없이 돌아가기
        </Button>
      </div>
    </section>
  );
}

function InAppNotice({ externalUrl }: { externalUrl: string | null }) {
  return (
    <div className="flex flex-col gap-2">
      <Alert role="alert">
        <AlertTitle>이 앱 안에서는 Google 로그인을 할 수 없어요</AlertTitle>
        <AlertDescription>
          {externalUrl
            ? "Google 계정으로 로그인하려면 아래 버튼으로 다른 브라우저에서 열어주세요."
            : "Google 계정으로 로그인하려면 화면의 더보기(⋯) 메뉴에서 'Safari로 열기'를 눌러 열어주세요."}
        </AlertDescription>
      </Alert>
      {externalUrl && (
        <Button asChild variant="outline" size="lg">
          <a href={externalUrl}>다른 브라우저로 열기</a>
        </Button>
      )}
    </div>
  );
}
