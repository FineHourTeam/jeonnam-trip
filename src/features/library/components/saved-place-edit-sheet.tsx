// 개인 태그·메모 편집 — 공통 장소 정보는 바꾸지 않고 내 보관함 항목만 고친다 (PLC-05). 메모는 비공개.
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { errorMessage } from "@/lib/errors";
import { PERSONAL_TAGS, type SavedPlace } from "@/shared/domain";
import { useUpdateSavedPlace } from "../hooks/use-library";

const schema = z.object({
  tags: z.array(z.string()),
  memo: z.string().max(1000, "메모는 1,000자까지 쓸 수 있어요."),
});
type Values = z.infer<typeof schema>;

export function SavedPlaceEditSheet({
  saved,
  placeName,
  open,
  onOpenChange,
}: {
  saved: SavedPlace;
  placeName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const update = useUpdateSavedPlace();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: { tags: saved.tags, memo: saved.memo },
  });
  const onSubmit = form.handleSubmit((v) => {
    update.mutate(
      { id: saved.id, ...v },
      {
        onSuccess: () => {
          toast.success("메모를 저장했어요.");
          onOpenChange(false);
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  });
  const memoError = form.formState.errors.memo?.message;
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${placeName} 내 메모`}
      description="나만 볼 수 있어요. 코스를 공유해도 메모는 빠져요."
      footer={
        <Button size="xl" disabled={update.isPending} onClick={() => void onSubmit()}>
          {update.isPending ? "저장하는 중..." : "저장하기"}
        </Button>
      }
    >
      <form
        className="flex flex-col gap-6 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold" id="personal-tags">
            개인 태그
          </span>
          <Controller
            control={form.control}
            name="tags"
            render={({ field }) => (
              <ToggleGroup
                type="multiple"
                variant="chip"
                size="chip"
                className="w-full flex-wrap"
                value={field.value}
                onValueChange={field.onChange}
                aria-labelledby="personal-tags"
              >
                {PERSONAL_TAGS.map((t) => (
                  <ToggleGroupItem key={t} value={t}>
                    {t}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="saved-memo" className="text-sm font-semibold">
            메모
          </Label>
          <Textarea
            id="saved-memo"
            rows={4}
            placeholder="예: 창가 자리가 좋아요, 주말엔 웨이팅이 길어요"
            aria-invalid={Boolean(memoError)}
            {...form.register("memo")}
          />
          {memoError ? <p className="text-destructive text-sm">{memoError}</p> : null}
        </div>
      </form>
    </BottomSheet>
  );
}
