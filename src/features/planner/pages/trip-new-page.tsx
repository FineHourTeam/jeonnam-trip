// S09 여행 시작 — 설정을 받아 로그인 전 초안으로 만들고 코스 편집(S10)으로 보낸다.
// 저장은 편집 화면에서 한다 (비회원도 작성 가능, 저장할 때 로그인).
import { useState } from "react";
import { useNavigate } from "react-router";
import { paths } from "@/app/paths";
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
import { newTripDraft, useTripDraftStore } from "@/features/trips";
import type { TripDraft } from "@/shared/domain";
import { TripSetupForm, type TripSetupValues } from "../components/trip-setup-form";

export default function TripNewPage() {
  const navigate = useNavigate();
  const existing = useTripDraftStore((s) => s.draft);
  const setDraft = useTripDraftStore((s) => s.setDraft);
  const [pending, setPending] = useState<TripDraft | null>(null);

  const start = (draft: TripDraft) => {
    setDraft(draft);
    void navigate(paths.tripDraft);
  };

  const onSubmit = (v: TripSetupValues) => {
    const draft = newTripDraft({ ...v, origin: { kind: "blank" } });
    // 저장 안 한 초안을 조용히 덮어쓰지 않는다
    if (existing) setPending(draft);
    else start(draft);
  };

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-balance">여행 만들기</h1>
        <p className="text-muted-foreground text-sm">
          날짜를 정하고 코스에 장소를 담으면 이동시간과 영업시간을 함께 계산해요.
        </p>
      </div>

      <TripSetupForm onSubmit={onSubmit} />

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>저장하지 않은 코스가 있어요</AlertDialogTitle>
            <AlertDialogDescription>
              「{existing?.title}」 코스를 아직 저장하지 않았어요. 새로 만들면 작성 중이던 내용은
              사라져요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                void navigate(paths.tripDraft);
              }}
            >
              작성 중인 코스 열기
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) start(pending);
              }}
            >
              새로 만들기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
