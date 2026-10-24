// 내 계정 — 프로필, 로그아웃(이 기기의 개인 데이터 정리), 계정 삭제(코스·보관함·공유 링크 함께 삭제).
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { useAuthState } from "@/app/use-auth-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BookmarkIcon, ChevronRightIcon, LogoutIcon, TripIcon, UserIcon } from "@/components/icons";
import { PageBody } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";
import { useDeleteAccount, useSignOut } from "../hooks/use-account";

export default function AccountPage() {
  const auth = useAuthState();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const del = useDeleteAccount();
  const [confirm, setConfirm] = useState(false);
  const user = auth.status === "authed" ? auth.user : null;

  return (
    <PageBody className="gap-8 pt-5 pb-8 md:pt-8">
      <Seo title="내 계정" noindex />
      <h1 className="text-2xl font-bold tracking-tight">내 계정</h1>
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          {user?.photoURL ? <AvatarImage src={user.photoURL} alt="" /> : null}
          <AvatarFallback>
            <UserIcon />
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-lg font-semibold">{user?.displayName ?? "여행자"}</span>
          <span className="text-muted-foreground truncate text-sm">{user?.email ?? ""}</span>
        </div>
      </div>

      <nav className="border-border divide-border flex flex-col divide-y rounded-xl border" aria-label="내 정보">
        {[
          { to: paths.myTrips, label: "내 여행", icon: TripIcon },
          { to: paths.library, label: "보관함", icon: BookmarkIcon },
        ].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="hover:bg-background-subtle flex h-14 items-center gap-3 px-4">
            <Icon size="sm" className="text-muted-foreground" />
            <span className="flex-1 font-medium">{label}</span>
            <ChevronRightIcon size="sm" className="text-muted-foreground" />
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          size="xl"
          disabled={signOut.isPending}
          onClick={() => {
            signOut.mutate(undefined, {
              onSuccess: () => {
                toast.success("로그아웃했어요. 이 기기에 남은 작성 중 내용도 정리했어요.");
                void navigate(paths.home, { replace: true });
              },
              onError: (e) => toast.error(errorMessage(e)),
            });
          }}
        >
          <LogoutIcon size="sm" />
          로그아웃
        </Button>
        <Button variant="ghost" size="touch" className="text-muted-foreground self-center" onClick={() => { setConfirm(true); }}>
          계정 삭제
        </Button>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="계정을 삭제할까요?"
        description="저장한 코스·보관함·SNS 링크·공유 링크가 모두 지워지고 되돌릴 수 없어요. 다른 사람이 이미 복사한 코스는 그 사람에게 남아요."
        actionLabel="삭제하기"
        destructive
        pending={del.isPending}
        onAction={() => {
          del.mutate(undefined, {
            onSuccess: () => {
              setConfirm(false);
              toast.success("계정과 저장한 정보를 삭제했어요.");
              void navigate(paths.home, { replace: true });
            },
            onError: (e) => toast.error(`삭제하지 못했어요. ${errorMessage(e)}`),
          });
        }}
      />
    </PageBody>
  );
}
