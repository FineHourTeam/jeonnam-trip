import type { AdminKind } from "@/app/paths";
import type { ContentStatus } from "@/shared/domain";

export const KIND_LABEL: Record<AdminKind, string> = {
  festivals: "축제",
  places: "장소",
  creators: "크리에이터 코스",
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "임시저장",
  published: "공개",
  hidden: "비공개",
};

export function isAdminKind(v: string | undefined): v is AdminKind {
  return v === "festivals" || v === "places" || v === "creators";
}
