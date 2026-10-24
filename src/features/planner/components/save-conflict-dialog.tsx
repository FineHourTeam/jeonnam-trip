// 버전 충돌 — 다른 기기에서 먼저 저장된 코스. 오래된 저장이 최신을 조용히 덮어쓰지 않게 사용자가 고른다 (기능명세 §8).
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function SaveConflictDialog({
  open,
  onClose,
  onKeepServer,
  onOverwrite,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onKeepServer: () => void;
  onOverwrite: () => void;
  pending: boolean;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>다른 기기에서 먼저 저장했어요</AlertDialogTitle>
          <AlertDialogDescription>
            이 코스를 다른 곳에서 고쳐 저장했어요. 최신 코스를 불러오면 이 기기의 변경은 사라지고, 내 변경으로 저장하면 다른 곳의 변경이 사라져요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button size="touch" disabled={pending} onClick={onOverwrite}>
            {pending ? "저장하는 중..." : "내 변경으로 저장하기"}
          </Button>
          <Button size="touch" variant="outline" disabled={pending} onClick={onKeepServer}>
            최신 코스 불러오기
          </Button>
          <AlertDialogCancel size="touch">닫기</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
