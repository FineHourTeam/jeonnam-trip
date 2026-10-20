// S07 링크에 연결할 장소 — 등록 장소 검색·직접 입력으로 여러 곳을 연결하고 뺄 수 있다 (게시물 ↔ 장소 다대다).
import { toast } from "sonner";
import { CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { PLACE_CATEGORY_LABEL, sigunName, type Place } from "@/shared/domain";
import { MAX_LINKED_PLACES } from "../lib/library";
import { draftKey, type LinkedPlaceDraft } from "../lib/sns-form";
import { CustomPlaceDialog } from "./custom-place-dialog";
import { RegisteredPlaceSearch } from "./registered-place-search";

interface LinkedPlacesFieldProps {
  value: LinkedPlaceDraft[];
  onChange: (next: LinkedPlaceDraft[]) => void;
  error?: string;
}

function draftLabel(d: LinkedPlaceDraft): { name: string; detail: string } {
  if (d.kind === "place") {
    return {
      name: d.name ?? "볼 수 없는 장소",
      detail: d.name ? `등록 장소${d.sigun ? ` · ${sigunName(d.sigun)}` : ""}` : "공개가 끝난 장소",
    };
  }
  if (d.kind === "custom") return { name: d.name ?? "지워진 개인 장소", detail: "직접 등록" };
  const p = d.place;
  const parts = [
    "직접 입력",
    p.sigun ? sigunName(p.sigun) : null,
    p.category ? PLACE_CATEGORY_LABEL[p.category] : null,
    p.location ? null : "위치 미확인",
  ].filter(Boolean);
  return { name: p.name, detail: parts.join(" · ") };
}

export function LinkedPlacesField({ value, onChange, error }: LinkedPlacesFieldProps) {
  const linkedIds = new Set(value.flatMap((d) => (d.kind === "place" ? [d.placeId] : [])));
  const add = (draft: LinkedPlaceDraft) => {
    if (value.length >= MAX_LINKED_PLACES) {
      toast(`한 링크에 장소는 ${String(MAX_LINKED_PLACES)}곳까지 연결할 수 있어요.`);
      return;
    }
    onChange([...value, draft]);
  };
  const pickRegistered = (p: Place) => {
    add({ kind: "place", placeId: p.id, name: p.name, sigun: p.sigun });
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">장소 연결 (선택)</legend>
      <p className="text-muted-foreground text-sm text-pretty">
        원문에서 확인한 장소를 직접 골라 주세요. 연결한 장소는 보관함의 저장한 장소에도 담겨요.
        장소를 몰라도 링크만 먼저 보관하고 나중에 연결할 수 있어요.
      </p>
      {value.length > 0 && (
        <ul className="border-border flex flex-col rounded-md border">
          {value.map((d) => {
            const label = draftLabel(d);
            return (
              <li
                key={draftKey(d)}
                className="border-border flex items-center gap-2 border-b px-3 py-2 last:border-b-0"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium break-words">{label.name}</span>
                  <span className="text-muted-foreground text-xs">{label.detail}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${label.name} 연결 빼기`}
                  onClick={() => {
                    onChange(value.filter((x) => draftKey(x) !== draftKey(d)));
                  }}
                >
                  <CloseIcon size="sm" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
      <RegisteredPlaceSearch linkedIds={linkedIds} onPick={pickRegistered} />
      <CustomPlaceDialog
        onAdd={(place) => {
          add({ kind: "new", key: crypto.randomUUID(), place });
        }}
      />
    </fieldset>
  );
}
