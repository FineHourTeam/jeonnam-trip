// 지도 공통 틀 — SDK 상태(불러오는 중·인증 실패·실패)를 화면에 구분해 보여주고, 실패하면 외부 네이버 지도로 안내한다.
import type { ReactNode } from "react";
import { ExternalLinkIcon, MapIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { naverMapSearchUrl, type MapSdkStatus } from "../lib/naver-maps";

export function MapFrame({
  status,
  fallbackQuery,
  className,
  children,
}: {
  status: MapSdkStatus;
  /** 지도를 못 띄울 때 외부 지도에서 검색할 말 (장소 이름·주소) */
  fallbackQuery?: string;
  className?: string;
  children: ReactNode;
}) {
  const failed = status === "auth-failed" || status === "error";
  return (
    <div className={cn("bg-background-subtle relative overflow-hidden rounded-xl", className)}>
      {children}
      {status === "loading" || status === "idle" ? (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : null}
      {failed ? (
        <div
          role="status"
          className="bg-background-subtle text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center"
        >
          <MapIcon size="lg" />
          <p className="text-foreground text-sm font-medium">지도를 불러오지 못했어요</p>
          <p className="text-xs">
            {status === "auth-failed"
              ? "이 주소에서는 지도 사용이 허용되지 않았어요. 목록의 시간·이동 정보는 그대로 볼 수 있어요."
              : "네트워크를 확인한 뒤 새로고침해 주세요."}
          </p>
          {fallbackQuery ? (
            <Button asChild variant="outline" size="touch">
              <a href={naverMapSearchUrl(fallbackQuery)} target="_blank" rel="noreferrer noopener">
                <ExternalLinkIcon size="sm" />
                네이버 지도에서 보기
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
