// 장소 연결 전 링크 카드 — 원문 보기(http/https만), 지역·태그·메모, 장소 연결하기·삭제.
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SnsLink } from "@/shared/domain";
import { kstDateOf } from "@/shared/lib/date";
import { formatDotDate, safeHttpUrl } from "@/shared/lib/format";
import { DeleteLinkButton } from "./delete-link-button";

export function SnsLinkCard({ link }: { link: SnsLink }) {
  const { t, i18n } = useTranslation("library");
  const href = safeHttpUrl(link.url);
  return (
    <div className="border-border bg-card text-card-foreground flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{t(`platform.${link.platform}`)}</Badge>
        <span className="text-muted-foreground text-xs">
          {link.sigun ? t(`sigun.${link.sigun}`, { ns: "common" }) : t("noSigun")} ·{" "}
          {t("snsCard.savedOn", { date: formatDotDate(kstDateOf(link.createdAt), i18n.language) })}
        </span>
      </div>
      <p className="text-sm break-all">{link.url}</p>
      {link.linked.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t("snsCard.allUnsaved", { count: link.linked.length })}
        </p>
      )}
      {link.tags.length > 0 && (
        <p className="text-muted-foreground text-sm">
          {link.tags.map((tag) => `#${tag}`).join(" ")}
        </p>
      )}
      {link.memo && (
        <p className="line-clamp-3 text-sm leading-relaxed whitespace-pre-line">{link.memo}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link to={paths.snsEdit(link.id)}>{t("snsCard.linkPlaces")}</Link>
        </Button>
        {href && (
          <Button asChild variant="outline" size="sm">
            <a href={href} target="_blank" rel="noopener noreferrer">
              {t("snsCard.viewSource")}
            </a>
          </Button>
        )}
        <DeleteLinkButton linkId={link.id} />
      </div>
    </div>
  );
}
