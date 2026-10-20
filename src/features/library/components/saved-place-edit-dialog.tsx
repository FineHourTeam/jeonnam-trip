// 저장한 장소의 개인 태그·메모 고치기 — 공통 장소 정보는 바꾸지 않는다 (기능명세 §1).
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateSavedPlace } from "../hooks/use-library";
import {
  MAX_MEMO_LENGTH,
  MAX_TAGS,
  entryName,
  formatTags,
  parseTags,
  type LibraryEntry,
} from "../lib/library";
import { memoSchema, tagsSchema } from "../lib/sns-form";

const schema = z.object({ tags: tagsSchema, memo: memoSchema });

type Values = z.infer<typeof schema>;

interface SavedPlaceEditDialogProps {
  entry: LibraryEntry | null;
  onClose: () => void;
}

export function SavedPlaceEditDialog({ entry, onClose }: SavedPlaceEditDialogProps) {
  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        {entry && <EditForm key={entry.saved.id} entry={entry} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ entry, onDone }: { entry: LibraryEntry; onDone: () => void }) {
  const update = useUpdateSavedPlace();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { tags: formatTags(entry.saved.tags), memo: entry.saved.memo },
  });
  const { errors } = form.formState;

  const submit = form.handleSubmit((v) => {
    update.mutate(
      { id: entry.saved.id, tags: parseTags(v.tags), memo: v.memo.trim() },
      {
        onSuccess: () => {
          toast.success("태그와 메모를 저장했어요.");
          onDone();
        },
        onError: () =>
          toast.error(
            "태그와 메모를 저장하지 못했어요. 다른 기기에서 저장을 해제했는지 확인하고 다시 시도해 주세요.",
          ),
      },
    );
  });

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>태그·메모 고치기</DialogTitle>
        <DialogDescription>{entryName(entry)} · 나만 보는 정보예요.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="saved-tags">태그</Label>
        <Input
          id="saved-tags"
          placeholder="예: 오션뷰, 사진"
          aria-describedby="saved-tags-hint"
          aria-invalid={errors.tags ? true : undefined}
          {...form.register("tags")}
        />
        <p id="saved-tags-hint" className="text-muted-foreground text-xs">
          쉼표로 나눠 {MAX_TAGS}개까지 붙일 수 있어요.
        </p>
        {errors.tags && <p className="text-destructive text-sm">{errors.tags.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="saved-memo">메모</Label>
        <Textarea
          id="saved-memo"
          rows={4}
          maxLength={MAX_MEMO_LENGTH}
          placeholder="예: 창가 자리가 좋아요"
          aria-invalid={errors.memo ? true : undefined}
          {...form.register("memo")}
        />
        {errors.memo && <p className="text-destructive text-sm">{errors.memo.message}</p>}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            닫기
          </Button>
        </DialogClose>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "저장하는 중…" : "저장하기"}
        </Button>
      </DialogFooter>
    </form>
  );
}
