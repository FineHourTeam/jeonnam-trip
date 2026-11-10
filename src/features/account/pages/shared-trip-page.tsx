// 공개 코스(받는 사람) — 링크로 열람하고, 로그인 후 내 코스로 복사한다. 해제된 링크는 열리지 않는다.
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { LoadingIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateTrip } from "@/features/trips";
import { formatDay } from "@/shared/lib/date";
import { SharedDays } from "../components/shared-days";
import { useActiveShare } from "../hooks/use-shares";
import { ShareNotFoundError } from "../api/shares-api";
import { draftFromShare } from "../lib/share-copy";

export default function SharedTripPage() {
  const { t, i18n } = useTranslation("account");
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
          {t(gone ? "sharedTrip.goneTitle" : "sharedTrip.errorTitle")}
        </h1>
        <p className="text-muted-foreground">
          {t(gone ? "errors.shareNotFound" : "sharedTrip.errorBody")}
        </p>
        <div className="flex gap-2">
          {!gone && (
            <Button onClick={() => void share.refetch()}>{t("retry", { ns: "common" })}</Button>
          )}
          <Button variant="outline" asChild>
            <Link to={paths.home}>{t("sharedTrip.explore")}</Link>
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
          toast.success(t("sharedTrip.copied"));
          void navigate(paths.tripEdit(trip.id));
        },
        onError: () => toast.error(t("sharedTrip.copyFailed")),
      },
    );
  };

  return (
    <section className="mx-auto flex max-w-screen-xl flex-col gap-5 px-4 py-6">
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm">{t("sharedTrip.label")}</p>
        <h1 className="text-xl font-semibold text-balance">{s.title}</h1>
        <p className="text-muted-foreground text-sm">
          {formatDay(s.startDate, i18n.language)} ~ {formatDay(s.endDate, i18n.language)} ·{" "}
          {t("sharedTrip.car")}
          {s.siguns.length > 0 &&
            ` · ${s.siguns.map((code) => t(`sigun.${code}`, { ns: "common" })).join(", ")}`}
        </p>
      </div>
      <div className="bg-background-subtle text-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
        <p className="text-sm">{t("sharedTrip.copyHint")}</p>
        <Button onClick={onCopy} disabled={create.isPending || auth.status === "loading"}>
          {create.isPending && <LoadingIcon size="sm" className="animate-spin" />}
          {t(auth.status === "authed" ? "sharedTrip.copyMine" : "sharedTrip.loginCopy")}
        </Button>
      </div>
      <SharedDays days={s.days} />
      <p className="text-muted-foreground text-sm">{t("sharedTrip.notice")}</p>
    </section>
  );
}
