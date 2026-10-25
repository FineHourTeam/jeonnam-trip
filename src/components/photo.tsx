// 운영 콘텐츠 사진 — 비율 고정 + 지연 로딩 + 실패 시 대체 영역 + 저작자 표시.
// 라이선스가 저작자 표시를 요구하는 사진(CC BY 등)은 credit을 화면에 남긴다 (서비스기획 §5 "사용 가능한 이미지").
import { useState, type ReactNode } from "react";
import { PhotoIcon } from "@/components/icons";
import { safeHref } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { PhotoAsset } from "@/shared/domain";

interface PhotoProps {
  photo: PhotoAsset | undefined;
  alt: string;
  /** 비율·모서리 등 컨테이너 클래스 (예: "aspect-4/3 rounded-xl") */
  className?: string;
  /** 저작자 표시 위치 — overlay: 사진 위 작은 글씨, none: 표시 안 함(목록 카드 — 상세에서 표시) */
  credit?: "overlay" | "none";
  priority?: boolean;
  /** 사진이 없을 때 가운데 둘 아이콘 (종류 아이콘 등). 없으면 사진 아이콘 */
  fallbackIcon?: ReactNode;
}

export function photoCreditText(photo: PhotoAsset): string | null {
  const parts = [photo.credit, photo.license].filter(Boolean);
  return parts.length > 0 ? `사진 ${parts.join(" · ")}` : null;
}

export function Photo({
  photo,
  alt,
  className,
  credit = "none",
  priority = false,
  fallbackIcon,
}: PhotoProps) {
  const [failed, setFailed] = useState(false);
  const creditText = photo ? photoCreditText(photo) : null;
  return (
    <div
      className={cn(
        "bg-background-subtle text-muted-foreground relative overflow-hidden",
        className,
      )}
    >
      {photo && !failed ? (
        <img
          src={photo.url}
          alt={photo.alt ?? alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => {
            setFailed(true);
          }}
          className="size-full object-cover"
        />
      ) : (
        <div
          className="flex size-full items-center justify-center"
          role="img"
          aria-label={`${alt} 사진 없음`}
        >
          {fallbackIcon ?? <PhotoIcon size="lg" />}
        </div>
      )}
      {credit === "overlay" && creditText && photo && !failed ? (
        <span className="absolute inset-x-2 bottom-2 flex justify-end">
          <span className="bg-foreground/60 text-background truncate rounded-md px-1.5 py-0.5 text-xs">
            {safeHref(photo.sourceUrl) ? (
              <a
                href={safeHref(photo.sourceUrl) ?? undefined}
                target="_blank"
                rel="noreferrer noopener"
                className="underline-offset-2 hover:underline"
              >
                {creditText}
              </a>
            ) : (
              creditText
            )}
          </span>
        </span>
      ) : null}
    </div>
  );
}
