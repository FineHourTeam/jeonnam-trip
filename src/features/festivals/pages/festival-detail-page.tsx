// S03 축제 상세 — 취소된 축제도 열람은 되지만 일정 추가는 막는다 (기능명세 §2).
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { paths } from "@/app/paths";
import { ChevronLeftIcon } from "@/components/icons";
import { PhotoCarousel } from "@/components/photo-carousel";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseMap } from "@/features/map";
import type { Festival } from "@/shared/domain";
import { todayKst } from "@/shared/lib/date";
import { placeText } from "@/shared/lib/content-text";
import { FestivalNotFoundError } from "../api/festivals-api";
import {
  FestivalBasics,
  FestivalChecks,
  FestivalHours,
  FestivalPrograms,
} from "../components/festival-info";
import { FestivalPlanActions } from "../components/festival-plan-actions";
import { FestivalStateBadge } from "../components/festival-state-badge";
import { useFestival } from "../hooks/use-festivals";
import { formatPeriod } from "../lib/format";

export default function FestivalDetailPage() {
  const { t } = useTranslation("festivals");
  const { festivalId } = useParams();
  const query = useFestival(festivalId);

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link to={paths.festivals}>
          <ChevronLeftIcon size="sm" />
          {t("detail.backToList")}
        </Link>
      </Button>
      {query.isPending ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : query.isError ? (
        <LoadError
          notFound={query.error instanceof FestivalNotFoundError}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FestivalDetail festival={query.data} />
      )}
    </section>
  );
}

function LoadError({ notFound, onRetry }: { notFound: boolean; onRetry: () => void }) {
  const { t } = useTranslation("festivals");
  return (
    <div className="flex flex-col items-start gap-3">
      <Alert variant="destructive">
        <AlertTitle>{notFound ? t("detail.notFoundTitle") : t("detail.errorTitle")}</AlertTitle>
        <AlertDescription>
          {notFound ? t("detail.notFoundBody") : t("detail.errorBody")}
        </AlertDescription>
      </Alert>
      {!notFound && <Button onClick={onRetry}>{t("retry", { ns: "common" })}</Button>}
    </div>
  );
}

function FestivalDetail({ festival }: { festival: Festival }) {
  const { t, i18n } = useTranslation("festivals");
  const sigun = t(`sigun.${festival.sigun}`, { ns: "common" });
  const today = todayKst();
  const unverified = festival.checks.schedule.state !== "verified";
  const { name, summary } = placeText(festival, i18n.language);
  return (
    <>
      <Seo
        title={name}
        description={summary ?? t("detail.seoDescription", { sigun })}
        image={festival.photos[0]}
      />
      <Photos festival={festival} name={name} />

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <FestivalStateBadge festival={festival} today={today} />
          {unverified && <Badge variant="outline">{t("detail.unverified")}</Badge>}
        </div>
        <h1 className="text-xl font-semibold text-balance">{name}</h1>
        <p className="text-muted-foreground text-sm">
          {sigun} · {formatPeriod(festival.startDate, festival.endDate, i18n.language)}
        </p>
      </header>

      {festival.state !== "scheduled" && (
        <Alert variant={festival.state === "cancelled" ? "destructive" : "default"}>
          <AlertTitle>
            {festival.state === "cancelled" ? t("detail.cancelledTitle") : t("detail.changedTitle")}
          </AlertTitle>
          <AlertDescription>
            {festival.stateNote ??
              (festival.state === "cancelled"
                ? t("detail.cancelledBody")
                : t("detail.changedBody"))}
          </AlertDescription>
        </Alert>
      )}

      {summary && <p className="leading-relaxed text-pretty">{summary}</p>}

      <FestivalPlanActions festival={festival} today={today} />
      <FestivalHours festival={festival} />
      <FestivalPrograms festival={festival} />
      <FestivalBasics festival={festival} />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">{t("detail.location")}</h2>
        {festival.location ? (
          <CourseMap
            className="aspect-video w-full"
            points={[{ id: festival.id, label: name, order: 1, location: festival.location }]}
            paths={[]}
          />
        ) : (
          <p className="text-muted-foreground text-sm">{t("detail.noLocation")}</p>
        )}
      </section>

      <FestivalChecks festival={festival} />
    </>
  );
}

function Photos({ festival, name }: { festival: Festival; name: string }) {
  const { t } = useTranslation("festivals");
  return (
    <PhotoCarousel
      photos={festival.photos}
      alt={(n) => t("detail.photoAlt", { name, n })}
      emptyLabel={t("detail.noPhotos")}
      credit={festival.photoCredit}
    />
  );
}
