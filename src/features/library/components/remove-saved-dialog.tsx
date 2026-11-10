// 저장 해제 확인 — 보관함 항목만 지우고, 이미 담은 일정은 바꾸지 않는다 (화면설계 S06: 저장 해제와 일정 삭제 구분).
import { useTranslation } from "react-i18next";
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
import { useUnsavePlace } from "../hooks/use-library";
import { entryName, type LibraryEntry } from "../lib/library";

interface RemoveSavedDialogProps {
  entry: LibraryEntry | null;
  onClose: () => void;
}

export function RemoveSavedDialog({ entry, onClose }: RemoveSavedDialogProps) {
  const { t, i18n } = useTranslation("library");
  const { unsave } = useUnsavePlace();

  const confirm = () => {
    if (!entry) return;
    onClose();
    unsave(entry.saved);
  };

  return (
    <AlertDialog
      open={entry !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("remove.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              entry?.saved.ref.kind === "custom"
                ? "remove.descriptionCustom"
                : "remove.description",
              {
                name: entry ? entryName(entry, i18n.language) : "",
              },
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("close", { ns: "common" })}</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>{t("remove.confirm")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
