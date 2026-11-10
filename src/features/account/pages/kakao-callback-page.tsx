// 카카오 로그인 콜백(/auth/kakao/callback) — 카카오가 돌려준 인가 코드로 로그인을 마무리하고 원래 화면으로 돌아간다.
// 취소·만료·실패 때는 이유와 함께 다시 로그인할 길을 보여 준다. 작성 중인 초안(localStorage)은 그대로 둔다.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useSearchParams } from "react-router";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { LoadingIcon } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoginError } from "../api/auth-api";
import { useKakaoCallback } from "../hooks/use-auth-actions";
import { useKakaoLoginStore } from "../hooks/use-kakao-login-store";
import { kakaoCallbackOf, type LoginFailure } from "../lib/login";
import { failureCopyOf } from "../lib/login-copy";

export default function KakaoCallbackPage() {
  const { t } = useTranslation("account");
  const [params] = useSearchParams();
  const authState = useAuthState();
  // 처음 그릴 때 저장 값과 비교한다 — 로그인을 마치며 저장 값을 지워도 결과가 '확인 못함'으로 바뀌지 않게
  const [initial] = useState(() => useKakaoLoginStore.getState().pending);
  const [callback] = useState(() => kakaoCallbackOf(params, initial?.state ?? null));
  const login = useKakaoCallback(callback.kind === "code" ? callback.code : null);
  const returnTo = initial?.returnTo ?? paths.home;

  if (authState.status === "authed" && (login.data || callback.kind !== "code")) {
    return <Navigate to={login.data ?? returnTo} replace />;
  }

  const failure: LoginFailure | null =
    callback.kind === "cancelled"
      ? "cancelled"
      : callback.kind === "failed"
        ? "unknown"
        : callback.kind === "invalid"
          ? "expired"
          : login.error instanceof LoginError
            ? login.error.reason
            : login.error
              ? "unknown"
              : null;

  if (!failure) {
    return (
      <section
        className="mx-auto flex max-w-sm flex-col items-center gap-3 px-4 py-16 text-center"
        aria-busy="true"
      >
        <LoadingIcon className="text-muted-foreground animate-spin" />
        <p className="text-muted-foreground text-sm">{t("kakaoCallback.loading")}</p>
      </section>
    );
  }

  const copy = failureCopyOf(failure, "kakao");
  return (
    <section className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-10">
      <h1 className="text-xl font-semibold text-balance">{t("kakaoCallback.title")}</h1>
      <Alert variant={failure === "cancelled" ? "default" : "destructive"} role="alert">
        <AlertTitle>{copy.title}</AlertTitle>
        <AlertDescription>{copy.description}</AlertDescription>
      </Alert>
      <Button asChild size="lg">
        <Link to={paths.login} state={{ from: returnTo }} replace>
          {t("kakaoCallback.retry")}
        </Link>
      </Button>
      <Button asChild variant="ghost" size="lg">
        <Link to={returnTo} replace>
          {t("login.backWithoutLogin")}
        </Link>
      </Button>
    </section>
  );
}
