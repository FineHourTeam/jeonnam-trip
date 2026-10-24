// 콘텐츠 메타 표시 조각 — 종류 아이콘·확인 상태 배지·축제 단계 배지.
// 확인 상태는 색만으로 구분하지 않고 문구를 함께 쓴다 (화면설계 §6 "색 외 상태 문구").
import type { ComponentType } from "react";
import {
  AttractionIcon,
  CafeIcon,
  CheckIcon,
  FestivalIcon,
  InfoIcon,
  LodgingIcon,
  RestaurantIcon,
  ShopIcon,
  WarningIcon,
  type IconProps,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { FieldCheck, FestivalState, PlaceCategory } from "@/shared/domain";
import { formatDateDot } from "@/shared/lib/format";

const CATEGORY_ICON: Record<PlaceCategory | "festival", ComponentType<IconProps>> = {
  attraction: AttractionIcon,
  restaurant: RestaurantIcon,
  cafe: CafeIcon,
  shop: ShopIcon,
  lodging: LodgingIcon,
  festival: FestivalIcon,
};

export function CategoryIcon({
  category,
  ...props
}: { category: PlaceCategory | "festival" } & IconProps) {
  const Icon = CATEGORY_ICON[category];
  return <Icon {...props} />;
}

const VERIFY_LABEL = { verified: "확인됨", unverified: "미확인", conflict: "정보 상충" } as const;

/** 항목별 확인 상태 — "확인됨"은 확인 당시 상태라 확인일을 함께 보여준다 */
export function VerifyBadge({ check, className }: { check: FieldCheck | undefined; className?: string }) {
  const state = check?.state ?? "unverified";
  const Icon = state === "verified" ? CheckIcon : state === "conflict" ? WarningIcon : InfoIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
        state === "verified" && "bg-success-soft text-success-soft-foreground",
        state === "conflict" && "bg-warning-soft text-warning-soft-foreground",
        state === "unverified" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon size="sm" />
      {VERIFY_LABEL[state]}
      {state !== "unverified" && check?.checkedAt ? ` · ${formatDateDot(check.checkedAt)} 기준` : null}
    </span>
  );
}

/** 사진 위에 얹는 상태 배지 */
export function PhotoBadge({
  tone,
  children,
}: {
  tone: "primary" | "neutral" | "warning" | "destructive" | "muted";
  children: string;
}) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-1 text-xs font-semibold shadow-sm",
        tone === "primary" && "bg-primary text-primary-foreground",
        tone === "neutral" && "bg-background text-foreground",
        tone === "warning" && "bg-warning text-warning-foreground",
        tone === "destructive" && "bg-destructive text-destructive-foreground",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export const FESTIVAL_STATE_LABEL: Record<FestivalState, string | null> = {
  scheduled: null,
  changed: "일정 변경",
  cancelled: "취소",
};
