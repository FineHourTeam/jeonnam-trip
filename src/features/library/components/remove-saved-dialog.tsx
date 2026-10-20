// 저장 해제 확인 — 보관함 항목만 지우고, 이미 담은 일정은 바꾸지 않는다 (화면설계 S06: 저장 해제와 일정 삭제 구분).
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
          <AlertDialogTitle>저장을 해제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            「{entry ? entryName(entry) : ""}」 저장을 해제하면 개인 태그·메모도 함께 지워져요. 이미
            일정에 담은 장소는 그대로 남아요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>닫기</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>저장 해제하기</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
