// 편집 하단 동작 — 초안 저장 / 공개(공개본 갱신) / 비공개 / 초안 버리기. 되돌리기 어려운 동작은 확인을 받는다.
import { useState } from "react";
import { LoadingIcon } from "@/components/icons";
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
import type { ContentStatus } from "@/shared/domain";
import type { ContentAction } from "../hooks/use-admin";

interface EditActionsProps {
  status: ContentStatus | null;
  hasDraft: boolean;
  pending: ContentAction | null;
  onAction: (action: ContentAction) => void;
}

const CONFIRM: Partial<Record<ContentAction, { title: string; body: string; label: string }>> = {
  hide: {
    title: "비공개로 바꿀까요?",
    body: "사용자 목록과 상세에서 빠져요. 이미 사용자 코스에 담긴 사본은 그대로 남아요.",
    label: "비공개하기",
  },
  discard: {
    title: "수정 초안을 버릴까요?",
    body: "공개본은 그대로 두고, 저장해 둔 수정 내용만 지워요. 버리면 되돌릴 수 없어요.",
    label: "버리기",
  },
};

export function EditActions({ status, hasDraft, pending, onAction }: EditActionsProps) {
  const [confirm, setConfirm] = useState<ContentAction | null>(null);
  const busy = pending !== null;
  const spin = (a: ContentAction) =>
    pending === a && <LoadingIcon size="sm" className="animate-spin" />;
  const c = confirm ? CONFIRM[confirm] : undefined;

  return (
    <div className="bg-background border-border sticky bottom-0 flex flex-wrap items-center gap-2 border-t py-3">
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => {
          onAction("draft");
        }}
      >
        {spin("draft")}
        초안 저장
      </Button>
      <Button
        type="button"
        disabled={busy}
        onClick={() => {
          onAction("publish");
        }}
      >
        {spin("publish")}
        {status === "published" ? "공개본 갱신" : "공개하기"}
      </Button>
      {status === "published" && (
        <Button
          type="button"
          variant="destructive"
          disabled={busy}
          onClick={() => {
            setConfirm("hide");
          }}
        >
          {spin("hide")}
          비공개
        </Button>
      )}
      {hasDraft && (
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setConfirm("discard");
          }}
        >
          {spin("discard")}
          수정 초안 버리기
        </Button>
      )}
      <AlertDialog
        open={c !== undefined}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{c?.title}</AlertDialogTitle>
            <AlertDialogDescription>{c?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) onAction(confirm);
                setConfirm(null);
              }}
            >
              {c?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
