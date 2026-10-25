// 개인 장소 직접 등록 — 외부 검색 API 없이도 저장할 수 있어야 한다 (기능명세 §4). 위치는 지도에서 고르거나 비워 둔다.
// 위치를 모르면 "위치 미확인"으로 보관하고 경로 계산에서 뺀다 (SNS-03).
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "@/features/map";
import {
  PLACE_CATEGORIES,
  PLACE_CATEGORY_LABEL,
  SIGUNS,
  type CustomPlace,
  type LatLng,
  type PlaceCategory,
  type SigunCode,
} from "@/shared/domain";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "장소 이름을 넣어 주세요.")
    .max(60, "이름은 60자까지 쓸 수 있어요."),
  sigun: z.string(),
  category: z.string(),
  address: z.string().max(120, "주소는 120자까지 쓸 수 있어요."),
});

export function CustomPlaceForm({
  onAdd,
  onCancel,
}: {
  onAdd: (p: Omit<CustomPlace, "id" | "createdAt">) => void;
  onCancel: () => void;
}) {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [showMap, setShowMap] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", sigun: "unknown", category: "unknown", address: "" },
  });
  const e = form.formState.errors;
  const submit = form.handleSubmit((v) => {
    onAdd({
      name: v.name.trim(),
      sigun: v.sigun === "unknown" ? null : (v.sigun as SigunCode),
      category: v.category === "unknown" ? null : (v.category as PlaceCategory),
      ...(v.address.trim() ? { address: v.address.trim() } : {}),
      location,
    });
  });
  return (
    <div className="bg-background-subtle flex flex-col gap-4 rounded-xl p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-name">장소 이름</Label>
        <Input
          id="cp-name"
          inputSize="touch"
          className="bg-background"
          aria-invalid={Boolean(e.name)}
          {...form.register("name")}
        />
        {e.name?.message ? <p className="text-destructive text-sm">{e.name.message}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>지역</Label>
          <Controller
            control={form.control}
            name="sigun"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="bg-background h-11 w-full" aria-label="지역">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">모름 (미분류)</SelectItem>
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
          <Label>종류</Label>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="bg-background h-11 w-full" aria-label="종류">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">모름</SelectItem>
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
        <Label htmlFor="cp-address">주소 (선택)</Label>
        <Input
          id="cp-address"
          inputSize="touch"
          className="bg-background"
          {...form.register("address")}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">위치</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowMap((v) => !v);
            }}
          >
            {showMap ? "지도 닫기" : "지도에서 고르기"}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          {location
            ? `고른 위치 ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
            : "위치를 고르지 않으면 '위치 미확인'으로 보관하고 경로 계산에서 빼요."}
        </p>
        {showMap ? (
          <LocationPicker value={location} onChange={setLocation} className="aspect-video w-full" />
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="touch" className="flex-1" onClick={onCancel}>
          닫기
        </Button>
        <Button type="button" size="touch" className="flex-1" onClick={() => void submit()}>
          장소 추가하기
        </Button>
      </div>
    </div>
  );
}
