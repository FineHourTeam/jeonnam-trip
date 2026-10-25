// S13 로그인 — 저장 목적 안내, 소셜 로그인 1종(Google), 개인정보 안내, 취소. 로그인 뒤 직전 작업으로 돌아간다.
// 취소·실패·팝업 차단에도 작성한 내용은 이 기기에 남아 있다 (ACC-01·02).
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { Notice } from "@/components/detail-parts";
import { PageBody, PageTopBar } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTripDraftStore } from "@/features/trips";
import { errorMessage } from "@/lib/errors";
import { isTestAuthEnabled, TEST_AUTH } from "@/lib/test-auth";
import { useGoogleSignIn, useTestSignIn } from "../hooks/use-account";

function loginErrorMessage(e: unknown): string | null {
  const code = (e as { code?: string } | null)?.code ?? "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
  if (code === "auth/popup-blocked")
    return "로그인 창이 막혔어요. 브라우저에서 팝업을 허용한 뒤 다시 눌러 주세요.";
  if (code === "auth/network-request-failed")
    return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
  return `로그인하지 못했어요. ${errorMessage(e)}`;
}

export default function LoginPage() {
  const auth = useAuthState();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { from?: string; purpose?: string } | null;
  const from = state?.from?.startsWith("/") ? state.from : paths.myTrips;
  const hasDraft = useTripDraftStore((s) => s.draft !== null);
  const google = useGoogleSignIn();
  const test = useTestSignIn();
  const [testEmail, setTestEmail] = useState("user@test.local");

  // 저장하려고 온 경우 돌아간 화면이 저장을 이어서 한다
  const resume = state?.purpose === "save" ? { resumeSave: true } : null;
  if (auth.status === "authed") return <Navigate to={from} replace state={resume} />;

  const done = () => {
    toast.success("로그인했어요.");
    void navigate(from, { replace: true, state: resume });
  };
  const fail = (e: unknown) => {
    const msg = loginErrorMessage(e);
    if (msg) toast.error(msg);
    else toast.info("로그인을 취소했어요. 작성한 내용은 그대로 있어요.");
  };

  return (
    <div className="flex flex-col pb-10">
      <Seo title="로그인" noindex />
      <PageTopBar fallback={paths.home} title="로그인" />
      <PageBody className="gap-8 pt-8">
        <div className="flex flex-col gap-2">
          <p className="text-primary text-lg font-bold">머물전남.</p>
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            {state?.purpose === "save"
              ? "로그인하고 여행을 저장해요"
              : "로그인하고 여행을 이어 가요"}
          </h1>
          <p className="text-muted-foreground leading-relaxed text-pretty">
            코스와 보관함을 계정에 저장해 모바일과 PC에서 다시 열 수 있어요. 둘러보기와 코스 작성은
            로그인하지 않아도 돼요.
          </p>
        </div>

        {hasDraft ? (
          <Notice tone="info" title="작성 중인 여행이 이 기기에 있어요">
            로그인해도, 취소해도 그대로 남아요.{" "}
            {resume ? "로그인하면 바로 이어서 저장해요." : "로그인하면 저장을 이어서 할 수 있어요."}
          </Notice>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            size="xl"
            disabled={google.isPending}
            onClick={() => {
              google.mutate(undefined, { onSuccess: done, onError: fail });
            }}
          >
            <img src="/images/google-g.svg" alt="" className="size-5" />
            {google.isPending ? "로그인하는 중..." : "Google 계정으로 계속하기"}
          </Button>
          <Button
            variant="ghost"
            size="touch"
            onClick={() => {
              if (location.key !== "default") void navigate(-1);
              else void navigate(paths.home);
            }}
          >
            로그인하지 않고 돌아가기
          </Button>
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          로그인하면 Google 계정의 이름·이메일·프로필 사진을 계정 확인에만 써요. 코스와 보관함은
          기본 비공개이고, 공유 링크를 만들 때만 고른 내용이 공개돼요. 계정을 삭제하면 저장한
          코스·보관함·공유 링크도 함께 지워져요.
        </p>

        {isTestAuthEnabled ? (
          <form
            className="border-border flex flex-col gap-3 rounded-xl border border-dashed p-4"
            onSubmit={(e) => {
              e.preventDefault();
              test.mutate(testEmail.trim(), { onSuccess: done, onError: fail });
            }}
          >
            <p className="text-sm font-semibold">개발용 테스트 로그인 (에뮬레이터 전용)</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="test-email">@{TEST_AUTH.emailDomain} 이메일</Label>
              <Input
                id="test-email"
                inputSize="touch"
                value={testEmail}
                onChange={(e) => {
                  setTestEmail(e.target.value);
                }}
              />
            </div>
            <Button type="submit" variant="secondary" size="touch" disabled={test.isPending}>
              테스트 계정으로 로그인
            </Button>
          </form>
        ) : null}
      </PageBody>
    </div>
  );
}
