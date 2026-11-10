// 내 계정(S13) — 로그인한 계정 정보와 로그아웃. 로그아웃하면 이 기기의 작성 중 초안과 조회 캐시를 지운다.
// ProtectedRoute 안에서만 열린다.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTripDraftStore } from "@/features/trips";
import { useSignOut } from "../hooks/use-auth-actions";
import { providerNameOf } from "../lib/login";

export default function AccountPage() {
  const { t } = useTranslation("account");
  const authState = useAuthState();
  const navigate = useNavigate();
  const hasDraft = useTripDraftStore((s) => s.draft !== null);
  const signOut = useSignOut();
  const [confirming, setConfirming] = useState(false);
  const user = authState.status === "authed" ? authState.user : null;

  // mutate()의 호출별 콜백은 언마운트되면 불리지 않는다 — 로그아웃하면 가드가 이 화면을 바로 내리므로 await로 이어간다
  const onSignOut = async () => {
    try {
      await signOut.mutateAsync();
      toast.success(t("account.signedOut"));
      void navigate(paths.home, { replace: true });
    } catch {
      toast.error(t("account.signOutFailed"));
    }
  };

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-10">
      <h1 className="text-xl font-semibold text-balance">{t("account.title")}</h1>

      {!user ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : (
        <dl className="bg-background-subtle text-foreground flex flex-col gap-3 rounded-lg p-4 text-sm">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">{t("account.name")}</dt>
            <dd>{user.displayName ?? t("account.noName")}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">{t("account.email")}</dt>
            <dd className="break-all">{user.email ?? t("account.noEmail")}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">{t("account.method")}</dt>
            <dd>
              {providerNameOf(
                user.uid,
                user.providerData.map((p) => p.providerId),
              )}
            </dd>
          </div>
        </dl>
      )}

      <Button
        variant="outline"
        size="lg"
        disabled={!user || signOut.isPending}
        onClick={() => {
          setConfirming(true);
        }}
      >
        {t("account.signOut")}
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("account.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(hasDraft ? "account.confirmWithDraft" : "account.confirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("close", { ns: "common" })}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onSignOut()}>
              {t("account.confirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
