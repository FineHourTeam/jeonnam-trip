// 방문 장소 개인 메모 고치기 — 공유본에는 실리지 않는다. 저장은 다른 편집처럼 작업 사본에 반영된다.
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import i18n from "@/lib/i18n";
import type { VisitItem } from "@/shared/domain";

const MAX_MEMO = 500;

const schema = z.object({
  memo: z
    .string()
    .max(MAX_MEMO, { error: () => i18n.t("memo.errorMax", { ns: "planner", max: MAX_MEMO }) }),
});

type Values = z.infer<typeof schema>;

interface VisitMemoDialogProps {
  item: VisitItem;
  open: boolean;
  onClose: () => void;
  onSubmit: (memo: string) => void;
}

export function VisitMemoDialog({ item, open, onClose, onSubmit }: VisitMemoDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        {open && (
          <MemoForm
            item={item}
            onSubmit={(memo) => {
              onSubmit(memo);
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MemoForm({ item, onSubmit }: { item: VisitItem; onSubmit: (memo: string) => void }) {
  const { t } = useTranslation("planner");
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { memo: item.memo ?? "" },
  });
  const memo = useWatch({ control: form.control, name: "memo" });
  const { errors } = form.formState;
  const submit = form.handleSubmit((v) => {
    onSubmit(v.memo);
  });

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{t(item.memo ? "memo.editTitle" : "memo.addTitle")}</DialogTitle>
        <DialogDescription>{t("memo.description", { name: item.snapshot.name })}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="visit-memo">{t("memo.label")}</Label>
        <Textarea
          id="visit-memo"
          rows={4}
          maxLength={MAX_MEMO}
          placeholder={t("memo.placeholder")}
          aria-describedby="visit-memo-count"
          aria-invalid={errors.memo ? true : undefined}
          {...form.register("memo")}
        />
        <p id="visit-memo-count" className="text-muted-foreground text-right text-xs tabular-nums">
          {t("memo.count", { n: memo.length, max: MAX_MEMO })}
        </p>
        {errors.memo && <p className="text-destructive text-sm">{errors.memo.message}</p>}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {t("memo.cancel")}
          </Button>
        </DialogClose>
        <Button type="submit">{t("memo.save")}</Button>
      </DialogFooter>
    </form>
  );
}
