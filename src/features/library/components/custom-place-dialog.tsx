// S07 장소 직접 입력 — 등록되지 않은 곳을 개인 장소로 연결한다 (SNS-03). 이름만 필수.
// 좌표를 모르면 위치 미확인으로 보관하고 경로 계산에서 뺀다. 외부 검색 API 없이 동작한다.
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AddIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLACE_CATEGORIES } from "@/features/places";
import {
  PLACE_CATEGORY_LABEL,
  SIGUNS,
  isSigunCode,
  type CustomPlace,
  type PlaceCategory,
} from "@/shared/domain";
import { parseLatLng } from "../lib/library";
import { NO_SIGUN } from "../lib/sns-form";

const NONE = "none";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "장소 이름을 입력해 주세요.")
    .max(60, "이름은 60자까지 쓸 수 있어요."),
  sigun: z.string(),
  category: z.string(),
  address: z.string().trim().max(200, "주소는 200자까지 쓸 수 있어요."),
  coords: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || parseLatLng(v) !== null,
      "위도, 경도 순서로 국내 좌표를 입력해 주세요. 예: 34.7936, 126.3886",
    ),
});

type Values = z.infer<typeof schema>;

const EMPTY: Values = { name: "", sigun: NO_SIGUN, category: NONE, address: "", coords: "" };

function isCategory(v: string): v is PlaceCategory {
  return v in PLACE_CATEGORY_LABEL;
}

export function CustomPlaceDialog({
  onAdd,
}: {
  onAdd: (place: Omit<CustomPlace, "id" | "createdAt">) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="self-start">
          <AddIcon size="sm" />
          장소 직접 입력
        </Button>
      </DialogTrigger>
      <DialogContent>
        {open && (
          <CustomPlaceForm
            onAdd={(place) => {
              onAdd(place);
              setOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomPlaceForm({
  onAdd,
}: {
  onAdd: (place: Omit<CustomPlace, "id" | "createdAt">) => void;
}) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const { errors } = form.formState;
  const submit = form.handleSubmit((v) => {
    onAdd({
      name: v.name,
      sigun: isSigunCode(v.sigun) ? v.sigun : null,
      category: isCategory(v.category) ? v.category : null,
      address: v.address || undefined,
      location: parseLatLng(v.coords),
    });
  });

  return (
    <form
      onSubmit={(e) => {
        // 대화상자는 SNS 폼 밖에 그려지지만 React 이벤트는 바깥 폼까지 올라간다 — 여기서 멈춘다
        e.stopPropagation();
        void submit(e);
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      <DialogHeader>
        <DialogTitle>장소 직접 입력</DialogTitle>
        <DialogDescription>
          등록되지 않은 장소를 나만 보는 개인 장소로 보관해요. 이름만 넣어도 돼요.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="custom-name">장소 이름</Label>
        <Input
          id="custom-name"
          maxLength={60}
          aria-invalid={errors.name ? true : undefined}
          {...form.register("name")}
        />
        {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="custom-sigun">지역 (선택)</Label>
          <Controller
            control={form.control}
            name="sigun"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="custom-sigun" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SIGUN}>모름</SelectItem>
                  {SIGUNS.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="custom-category">종류 (선택)</Label>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="custom-category" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>모름</SelectItem>
                  {PLACE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {PLACE_CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="custom-address">주소 (선택)</Label>
        <Input
          id="custom-address"
          maxLength={200}
          aria-invalid={errors.address ? true : undefined}
          {...form.register("address")}
        />
        {errors.address && <p className="text-destructive text-sm">{errors.address.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="custom-coords">좌표 (선택)</Label>
        <Input
          id="custom-coords"
          inputMode="decimal"
          placeholder="예: 34.7936, 126.3886"
          aria-describedby="custom-coords-hint"
          aria-invalid={errors.coords ? true : undefined}
          {...form.register("coords")}
        />
        <p id="custom-coords-hint" className="text-muted-foreground text-xs">
          지도 앱에서 복사한 위도, 경도를 붙여 넣어 주세요. 비워 두면 위치 미확인으로 보관하고 경로
          계산에서 빠져요.
        </p>
        {errors.coords && <p className="text-destructive text-sm">{errors.coords.message}</p>}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            닫기
          </Button>
        </DialogClose>
        <Button type="submit">연결하기</Button>
      </DialogFooter>
    </form>
  );
}
