// SNS 링크 삭제 — 링크만 지우고, 연결했던 장소와 그 메모는 보관함에 남긴다.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
import { useDeleteSnsLink } from "../hooks/use-library";

interface DeleteLinkButtonProps {
  linkId: string;
  /** 지운 뒤 (편집 화면은 보관함으로 돌아간다) */
  onDeleted?: () => void;
}

export function DeleteLinkButton({ linkId, onDeleted }: DeleteLinkButtonProps) {
  const { t } = useTranslation("library");
  const [open, setOpen] = useState(false);
  const remove = useDeleteSnsLink();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={remove.isPending}
        onClick={() => {
          setOpen(true);
        }}
      >
        {t("deleteLink.button")}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteLink.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteLink.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("close", { ns: "common" })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                remove.mutate(linkId, {
                  onSuccess: () => {
                    toast.success(t("deleteLink.done"));
                    onDeleted?.();
                  },
                  onError: () => toast.error(t("deleteLink.failed")),
                });
              }}
            >
              {t("deleteLink.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
