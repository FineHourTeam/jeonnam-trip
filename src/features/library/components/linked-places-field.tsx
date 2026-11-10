// S07 링크에 연결할 장소 — 등록 장소 검색·직접 입력으로 여러 곳을 연결하고 뺄 수 있다 (게시물 ↔ 장소 다대다).
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { Place, SigunCode } from "@/shared/domain";
import { MAX_LINKED_PLACES } from "../lib/library";
import { draftKey, type LinkedPlaceDraft } from "../lib/sns-form";
import { CustomPlaceDialog } from "./custom-place-dialog";
import { RegisteredPlaceSearch } from "./registered-place-search";

interface LinkedPlacesFieldProps {
  value: LinkedPlaceDraft[];
  onChange: (next: LinkedPlaceDraft[]) => void;
  error?: string;
}

function draftLabel(
  d: LinkedPlaceDraft,
  t: TFunction<"library">,
): { name: string; detail: string } {
  const sigun = (code: SigunCode) => t(`sigun.${code}`, { ns: "common" });
  if (d.kind === "place") {
    return {
      name: d.name ?? t("unknownPlace"),
      detail: d.name
        ? [t("linked.registered"), d.sigun ? sigun(d.sigun) : null].filter(Boolean).join(" · ")
        : t("linked.ended"),
    };
  }
  if (d.kind === "custom")
    return { name: d.name ?? t("linked.deletedCustom"), detail: t("linked.custom") };
  const p = d.place;
  const parts = [
    t("linked.manual"),
    p.sigun ? sigun(p.sigun) : null,
    p.category ? t(`placeCategory.${p.category}`, { ns: "common" }) : null,
    p.location ? null : t("linked.noLocation"),
  ].filter(Boolean);
  return { name: p.name, detail: parts.join(" · ") };
}

export function LinkedPlacesField({ value, onChange, error }: LinkedPlacesFieldProps) {
  const { t } = useTranslation("library");
  const linkedIds = new Set(value.flatMap((d) => (d.kind === "place" ? [d.placeId] : [])));
  const add = (draft: LinkedPlaceDraft) => {
    if (value.length >= MAX_LINKED_PLACES) {
      toast(t("validation.placesMax", { max: MAX_LINKED_PLACES }));
      return;
    }
    onChange([...value, draft]);
  };
  const pickRegistered = (p: Place) => {
    add({ kind: "place", placeId: p.id, name: p.name, sigun: p.sigun });
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">{t("linked.legend")}</legend>
      <p className="text-muted-foreground text-sm text-pretty">{t("linked.help")}</p>
      {value.length > 0 && (
        <ul className="border-border flex flex-col rounded-md border">
          {value.map((d) => {
            const label = draftLabel(d, t);
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
                  aria-label={t("linked.remove", { name: label.name })}
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
