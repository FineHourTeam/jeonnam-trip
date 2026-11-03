// 체류시간 수정 — 고정하면 시간 계산이 체류를 줄이지 않는다.
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import i18n from "@/lib/i18n";
import type { VisitItem } from "@/shared/domain";

// 검증 메시지는 검사하는 순간의 언어로 — 모듈 상수여도 error 콜백이라 언어 변경을 따라간다
const msg = (key: "errorNumber" | "errorInt" | "errorMin" | "errorMax") => ({
  error: () => i18n.t(`stay.${key}`, { ns: "planner" }),
});

const schema = z.object({
  stayMin: z
    .number(msg("errorNumber"))
    .int(msg("errorInt"))
    .min(5, msg("errorMin"))
    .max(600, msg("errorMax")),
  stayLocked: z.boolean(),
});

type Values = z.infer<typeof schema>;

interface StayDialogProps {
  item: VisitItem | null;
  onClose: () => void;
  onSubmit: (values: Values) => void;
}

export function StayDialog({ item, onClose, onSubmit }: StayDialogProps) {
  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        {item && <StayForm key={item.id} item={item} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  );
}

function StayForm({ item, onSubmit }: { item: VisitItem; onSubmit: (v: Values) => void }) {
  const { t } = useTranslation("planner");
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { stayMin: item.stayMin, stayLocked: item.stayLocked },
  });
  const error = form.formState.errors.stayMin?.message;

  return (
    <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{t("stay.title")}</DialogTitle>
        <DialogDescription>{item.snapshot.name}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="stay-min">{t("stay.label")}</Label>
        <Input
          id="stay-min"
          type="number"
          inputMode="numeric"
          step={5}
          aria-invalid={error ? true : undefined}
          {...form.register("stayMin", { valueAsNumber: true })}
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="stay-locked">{t("stay.lock")}</Label>
          <p className="text-muted-foreground text-sm">{t("stay.lockHelp")}</p>
        </div>
        <Controller
          control={form.control}
          name="stayLocked"
          render={({ field }) => (
            <Switch id="stay-locked" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {t("close", { ns: "common" })}
          </Button>
        </DialogClose>
        <Button type="submit">{t("stay.apply")}</Button>
      </DialogFooter>
    </form>
  );
}
