// 장소 상세(S05)의 "저장" — 개인 보관함에 연결한다. 일정에 추가와는 별개 동작이다 (기능명세 §3).
// 비회원은 로그인 화면으로 보내고 돌아오게 한다. 저장 해제는 되돌리기를 함께 띄운다 (태그·메모 보존).
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { AddIcon, CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useSavePlace, useSavedPlaces, useUnsavePlace } from "../hooks/use-library";

export function PlaceSaveAction({ placeId }: { placeId: string }) {
  const { t } = useTranslation("library");
  const authState = useAuthState();
  const navigate = useNavigate();
  const location = useLocation();
  const savedList = useSavedPlaces();
  const save = useSavePlace();
  const unsave = useUnsavePlace();
  const saved = savedList.data?.find((s) => s.ref.kind === "place" && s.ref.placeId === placeId);
  // 저장 직후 목록을 새로 받는 동안에도 막는다 (옛 목록으로 "저장" 버튼이 잠깐 다시 보이지 않게)
  const busy = save.isPending || unsave.isPending || savedList.isFetching;

  if (authState.status !== "authed") {
    return (
      <Button
        variant="outline"
        disabled={authState.status === "loading"}
        onClick={() => {
          void navigate(paths.login, { state: { from: location.pathname + location.search } });
        }}
      >
        <AddIcon size="sm" />
        {t("saveAction.save")}
      </Button>
    );
  }

  if (!saved) {
    return (
      <Button
        variant="outline"
        // 목록을 못 불러와도 저장은 안전하다 — 이미 있으면 그대로 둔다
        disabled={busy || savedList.isPending}
        onClick={() => {
          save.mutate(placeId, {
            onSuccess: () =>
              toast(t("toast.saved"), {
                action: {
                  label: t("toast.viewLibrary"),
                  onClick: () => void navigate(paths.library),
                },
              }),
            onError: () => toast.error(t("toast.saveFailed")),
          });
        }}
      >
        <AddIcon size="sm" />
        {t("saveAction.save")}
      </Button>
    );
  }

  // 액션 줄(flex-wrap) 안에 놓인다 — 태그는 다음 줄로 내린다
  return (
    <>
      <Button
        variant="outline"
        className="border-primary text-primary"
        aria-pressed="true"
        disabled={busy}
        onClick={() => {
          unsave.unsave(saved);
        }}
      >
        <CheckIcon size="sm" />
        {t("saveAction.saved")}
      </Button>
      {saved.tags.length > 0 && (
        <p className="text-muted-foreground basis-full text-sm">
          {t("saveAction.myTags", { tags: saved.tags.map((tag) => `#${tag}`).join(" ") })}
        </p>
      )}
    </>
  );
}
