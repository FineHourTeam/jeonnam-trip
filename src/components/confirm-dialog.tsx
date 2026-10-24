// 확인 다이얼로그 — window.confirm 대신. 버튼 쌍은 [닫기] [동사+하기]로 고정 (rules.md § 한국어 카피 — 다이얼로그).
import type { ReactNode } from "react";
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

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  onAction,
  destructive = false,
  pending = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: ReactNode;
  actionLabel: string;
  onAction: () => void;
  destructive?: boolean;
  pending?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="touch">닫기</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            variant={destructive ? "destructive" : "default"}
            size="touch"
            onClick={(e) => {
              e.preventDefault();
              onAction();
            }}
          >
            {pending ? "처리하는 중..." : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
