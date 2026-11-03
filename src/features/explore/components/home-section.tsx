// S01 구역 틀 — 제목 · 전체 보기 링크 · 불러오는 중/실패/빈 결과/카드 목록을 구역마다 따로 보여 준다.
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ChevronRightIcon } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface HomeSectionProps {
  title: string;
  /** 목록 화면 (지금 조건을 쿼리로 붙인 주소) */
  moreTo: string;
  isPending: boolean;
  isError: boolean;
  errorTitle: string;
  onRetry: () => void;
  /** 결과가 없을 때 보여 줄 안내 — 결과가 있으면 null */
  empty: ReactNode;
  /** 카드 <li> 목록 */
  children: ReactNode;
}

export function HomeSection({
  title,
  moreTo,
  isPending,
  isError,
  errorTitle,
  onRetry,
  empty,
  children,
}: HomeSectionProps) {
  const { t } = useTranslation("explore");
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold text-balance">
          {title}
        </h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to={moreTo} aria-label={t("section.moreLabel", { title })}>
            {t("section.more")}
            <ChevronRightIcon size="sm" />
          </Link>
        </Button>
      </div>
      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-start gap-3">
          <Alert variant="destructive">
            <AlertTitle>{errorTitle}</AlertTitle>
            <AlertDescription>{t("section.errorBody")}</AlertDescription>
          </Alert>
          <Button onClick={onRetry}>{t("retry", { ns: "common" })}</Button>
        </div>
      ) : empty ? (
        <div className="bg-background-subtle text-foreground flex flex-col items-center gap-3 rounded-lg px-4 py-8 text-center">
          {empty}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">{children}</ul>
      )}
    </section>
  );
}
