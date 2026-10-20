// 장소 연결 전 링크 카드 — 원문 보기(http/https만), 지역·태그·메모, 장소 연결하기·삭제.
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sigunName, type SnsLink } from "@/shared/domain";
import { kstDateOf } from "@/shared/lib/date";
import { formatDotDate, safeHttpUrl } from "@/shared/lib/format";
import { SNS_PLATFORM_LABEL } from "../lib/library";
import { DeleteLinkButton } from "./delete-link-button";

export function SnsLinkCard({ link }: { link: SnsLink }) {
  const href = safeHttpUrl(link.url);
  return (
    <div className="border-border bg-card text-card-foreground flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{SNS_PLATFORM_LABEL[link.platform]}</Badge>
        <span className="text-muted-foreground text-xs">
          {link.sigun ? sigunName(link.sigun) : "지역 미분류"} · 보관{" "}
          {formatDotDate(kstDateOf(link.createdAt))}
        </span>
      </div>
      <p className="text-sm break-all">{link.url}</p>
      {link.tags.length > 0 && (
        <p className="text-muted-foreground text-sm">{link.tags.map((t) => `#${t}`).join(" ")}</p>
      )}
      {link.memo && (
        <p className="line-clamp-3 text-sm leading-relaxed whitespace-pre-line">{link.memo}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link to={paths.snsEdit(link.id)}>장소 연결하기</Link>
        </Button>
        {href && (
          <Button asChild variant="outline" size="sm">
            <a href={href} target="_blank" rel="noopener noreferrer">
              원문 보기
            </a>
          </Button>
        )}
        <DeleteLinkButton linkId={link.id} />
      </div>
    </div>
  );
}
