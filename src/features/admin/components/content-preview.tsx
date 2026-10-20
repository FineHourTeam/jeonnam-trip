// 공개 미리보기 — 사용자에게 보일 핵심 정보와 확인 상태를 저장 전에 훑어본다.
import { Badge } from "@/components/ui/badge";
import type { FieldCheck } from "@/shared/domain";

const STATE_LABEL: Record<FieldCheck["state"], string> = {
  verified: "확인됨",
  unverified: "미확인",
  conflict: "정보 상충",
};

interface ContentPreviewProps {
  title: string;
  photo?: string;
  lines: (string | undefined)[];
  checks: { label: string; check: FieldCheck }[];
}

export function ContentPreview({ title, photo, lines, checks }: ContentPreviewProps) {
  return (
    <details className="border-border rounded-lg border p-4">
      <summary className="cursor-pointer font-semibold">공개 미리보기</summary>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        {photo ? (
          <img src={photo} alt="" className="aspect-video w-full rounded-md object-cover sm:w-60" />
        ) : (
          <div className="bg-background-subtle text-muted-foreground flex aspect-video w-full items-center justify-center rounded-md text-sm sm:w-60">
            사진 없음
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-lg font-semibold break-words">{title || "제목 없음"}</p>
          {lines.filter(Boolean).map((l) => (
            <p key={l} className="text-muted-foreground text-sm break-words">
              {l}
            </p>
          ))}
          <div className="mt-1 flex flex-wrap gap-1">
            {checks.map(({ label, check }) => (
              <Badge key={label} variant={check.state === "verified" ? "secondary" : "outline"}>
                {label} {STATE_LABEL[check.state]}
                {check.checkedAt ? ` · ${check.checkedAt}` : ""}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
