// 체류시간 수정 — 고정하면 시간 계산이 체류를 줄이지 않는다.
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
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
import type { VisitItem } from "@/shared/domain";

const schema = z.object({
  stayMin: z
    .number({ error: "숫자로 입력해 주세요." })
    .int("분 단위로 입력해 주세요.")
    .min(5, "5분 이상으로 입력해 주세요.")
    .max(600, "10시간(600분)까지 입력할 수 있어요."),
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
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { stayMin: item.stayMin, stayLocked: item.stayLocked },
  });
  const error = form.formState.errors.stayMin?.message;

  return (
    <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>체류시간 수정</DialogTitle>
        <DialogDescription>{item.snapshot.name}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="stay-min">체류시간(분)</Label>
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
          <Label htmlFor="stay-locked">체류시간 고정</Label>
          <p className="text-muted-foreground text-sm">
            고정하면 다음 일정에 맞추려고 체류시간을 줄이지 않아요.
          </p>
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
            닫기
          </Button>
        </DialogClose>
        <Button type="submit">적용하기</Button>
      </DialogFooter>
    </form>
  );
}
