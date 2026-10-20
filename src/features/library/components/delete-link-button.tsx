// SNS 링크 삭제 — 링크만 지우고, 연결했던 장소와 그 메모는 보관함에 남긴다.
import { useState } from "react";
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
        링크 삭제
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>링크를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              보관함에서 이 링크만 지워요. 연결했던 장소와 메모는 저장한 장소에 그대로 남아요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                remove.mutate(linkId, {
                  onSuccess: () => {
                    toast.success("링크를 삭제했어요.");
                    onDeleted?.();
                  },
                  onError: () =>
                    toast.error(
                      "링크를 삭제하지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
                    ),
                });
              }}
            >
              삭제하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
