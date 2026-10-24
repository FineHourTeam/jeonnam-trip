// 보관함 저장 버튼 — "저장"은 개인 보관함 연결, "일정에 추가"와 다른 동작이다 (PLC-06).
// 비회원은 로그인 화면으로 보내고, 로그인 뒤 이 화면으로 돌아온다 (ACC-02).
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { BookmarkFilledIcon, BookmarkIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useCurrentUid } from "@/features/trips";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { SavedPlace } from "@/shared/domain";
import { AlreadySavedError, savedIdFor } from "../api/library-api";
import { useSavedPlaces, useSavePlace, useUnsavePlace } from "../hooks/use-library";

export function useIsSaved(ref: SavedPlace["ref"]): boolean {
  const saved = useSavedPlaces();
  const id = savedIdFor(ref);
  return (saved.data ?? []).some((s) => s.id === id);
}

export function SaveButton({
  placeId,
  placeName,
  variant = "overlay",
  size = "touch",
  className,
}: {
  placeId: string;
  placeName: string;
  /** overlay: 사진 위 동그란 아이콘 버튼 / inline: 글자 있는 버튼 */
  variant?: "overlay" | "inline";
  /** inline일 때 버튼 크기 */
  size?: "touch" | "xl";
  className?: string;
}) {
  const uid = useCurrentUid();
  const navigate = useNavigate();
  const location = useLocation();
  const ref = { kind: "place", placeId } as const;
  const isSaved = useIsSaved(ref);
  const save = useSavePlace();
  const unsave = useUnsavePlace();
  const busy = save.isPending || unsave.isPending;

  function onClick() {
    if (!uid) {
      toast.info("로그인하면 보관함에 저장할 수 있어요.", {
        action: {
          label: "로그인",
          onClick: () => {
            void navigate(paths.login, { state: { from: location.pathname + location.search } });
          },
        },
      });
      return;
    }
    if (isSaved) {
      unsave.mutate(savedIdFor(ref), {
        onSuccess: () => {
          toast.success(`${placeName} 저장을 해제했어요. 담아 둔 코스는 그대로예요.`);
        },
        onError: (e) => toast.error(errorMessage(e)),
      });
      return;
    }
    save.mutate(
      { ref },
      {
        onSuccess: () => {
          toast.success("보관함에 저장했어요.", {
            action: {
              label: "보관함 보기",
              onClick: () => {
                void navigate(paths.library);
              },
            },
          });
        },
        onError: (e) => {
          if (e instanceof AlreadySavedError) toast.info(e.message);
          else toast.error(errorMessage(e));
        },
      },
    );
  }

  const label = isSaved ? `${placeName} 저장 해제` : `${placeName} 저장`;
  if (variant === "inline") {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={onClick}
        disabled={busy}
        aria-pressed={isSaved}
        className={className}
      >
        {isSaved ? <BookmarkFilledIcon size="sm" className="text-primary" /> : <BookmarkIcon size="sm" />}
        {isSaved ? "저장됨" : "저장"}
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      size="icon-touch"
      onClick={onClick}
      disabled={busy}
      aria-pressed={isSaved}
      aria-label={label}
      className={cn("bg-background/90 rounded-full border-0 shadow-sm backdrop-blur", className)}
    >
      {isSaved ? <BookmarkFilledIcon className="text-primary" /> : <BookmarkIcon />}
    </Button>
  );
}
