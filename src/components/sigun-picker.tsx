// 시군 고르기 — 자주 쓰는 지역은 칩 줄로, 전체 22개는 시트로 (docs/DESIGN.md S01·S02).
import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { ChevronDownIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SIGUNS, sigunName, type SigunCode } from "@/shared/domain";

/** 단일 선택 (null = 전체) */
export function SigunPickerButton({
  value,
  onChange,
  allLabel = "전남 전체",
}: {
  value: SigunCode | null;
  onChange: (v: SigunCode | null) => void;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="touch"
        className="rounded-full"
        onClick={() => {
          setOpen(true);
        }}
        aria-haspopup="dialog"
      >
        {value ? sigunName(value) : allLabel}
        <ChevronDownIcon size="sm" />
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="지역 고르기">
        <ToggleGroup
          type="single"
          variant="chip"
          size="chip"
          className="w-full flex-wrap pb-4"
          value={value ?? "all"}
          onValueChange={(v) => {
            if (!v) return;
            onChange(v === "all" ? null : (v as SigunCode));
            setOpen(false);
          }}
          aria-label="지역"
        >
          <ToggleGroupItem value="all">{allLabel}</ToggleGroupItem>
          {SIGUNS.map((s) => (
            <ToggleGroupItem key={s.code} value={s.code}>
              {s.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </BottomSheet>
    </>
  );
}

/** 여러 개 선택 (여행 지역) */
export function SigunMultiPicker({
  value,
  onChange,
}: {
  value: SigunCode[];
  onChange: (v: SigunCode[]) => void;
}) {
  return (
    <ToggleGroup
      type="multiple"
      variant="chip"
      size="chip"
      className="w-full flex-wrap"
      value={value}
      onValueChange={(v) => {
        onChange(v as SigunCode[]);
      }}
      aria-label="여행 지역"
    >
      {SIGUNS.map((s) => (
        <ToggleGroupItem key={s.code} value={s.code}>
          {s.name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
