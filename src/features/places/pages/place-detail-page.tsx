// S05 장소 상세 — 사진·소개·영업시간·이용 정보·위치·출처와 "보관함에 저장"·"일정에 추가".
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { paths } from "@/app/paths";
import { ChevronLeftIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaceSaveAction } from "@/features/library";
import { CourseMap } from "@/features/map";
import type { Place } from "@/shared/domain";
import { PlaceNotFoundError } from "../api/places-api";
import { PlaceAddToTrip } from "../components/place-add-to-trip";
import { PlaceBasics, PlaceChecks, PlaceHours } from "../components/place-info";
import { usePlace } from "../hooks/use-places";
import { hoursUnknown } from "../lib/hours";
import { placeText } from "@/shared/lib/place-text";
import { subcategoryLabel } from "../lib/place-filter";

export default function PlaceDetailPage() {
  const { t } = useTranslation("places");
  const { placeId } = useParams();
  const query = usePlace(placeId);

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link to={paths.places}>
          <ChevronLeftIcon size="sm" />
          {t("detail.back")}
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
          notFound={query.error instanceof PlaceNotFoundError}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <PlaceDetail place={query.data} />
      )}
    </section>
  );
}

function LoadError({ notFound, onRetry }: { notFound: boolean; onRetry: () => void }) {
  const { t } = useTranslation("places");
  return (
    <div className="flex flex-col items-start gap-3">
      <Alert variant="destructive">
        <AlertTitle>{notFound ? t("detail.notFoundTitle") : t("detail.loadErrorTitle")}</AlertTitle>
        <AlertDescription>
          {notFound ? t("detail.notFoundBody") : t("error.network")}
        </AlertDescription>
      </Alert>
      {!notFound && <Button onClick={onRetry}>{t("retry", { ns: "common" })}</Button>}
    </div>
  );
}

function PlaceDetail({ place }: { place: Place }) {
  const { t, i18n } = useTranslation("places");
  const sigun = t(`sigun.${place.sigun}`, { ns: "common" });
  const category = t(`placeCategory.${place.category}`, { ns: "common" });
  const unverified = Object.values(place.checks).some((c) => c.state !== "verified");
  const noHours = hoursUnknown(place.hours);
  const { name, summary } = placeText(place, i18n.language);
  return (
    <>
      <Seo
        title={name}
        description={summary?.slice(0, 120) ?? t("detail.seoFallback", { sigun, category })}
        image={place.photos[0]}
      />
      <Photos place={place} name={name} />

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{category}</Badge>
          {place.subcategory && (
            <Badge variant="outline">{subcategoryLabel(place.subcategory, i18n.language)}</Badge>
          )}
          {unverified && <Badge variant="outline">{t("detail.unverified")}</Badge>}
        </div>
        <h1 className="text-xl font-semibold text-balance">{name}</h1>
        <p className="text-muted-foreground text-sm">
          {sigun}
          {place.area ? ` · ${place.area}` : ""}
        </p>
        <PlaceSaveAction placeId={place.id} />
      </header>

      {summary && <p className="leading-relaxed text-pretty whitespace-pre-line">{summary}</p>}

      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <PlaceAddToTrip places={[place]} />
        {noHours && <p className="text-muted-foreground text-sm">{t("detail.noHoursNote")}</p>}
        {!place.location && (
          <p className="text-muted-foreground text-sm">{t("detail.noLocationRoute")}</p>
        )}
      </div>

      <PlaceHours place={place} />
      <PlaceBasics place={place} />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">{t("detail.locationTitle")}</h2>
        {place.location ? (
          <CourseMap
            className="aspect-video w-full"
            points={[{ id: place.id, label: name, order: 1, location: place.location }]}
            paths={[]}
          />
        ) : (
          <p className="text-muted-foreground text-sm">{t("detail.noLocationMap")}</p>
        )}
      </section>

      <PlaceChecks place={place} />
    </>
  );
}

function Photos({ place, name }: { place: Place; name: string }) {
  const { t } = useTranslation("places");
  if (place.photos.length === 0) {
    return (
      <div className="bg-background-subtle text-muted-foreground flex aspect-video w-full items-center justify-center rounded-lg text-sm">
        {t("detail.noPhotos")}
      </div>
    );
  }
  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto">
      {place.photos.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={t("detail.photoAlt", { name, n: i + 1 })}
          loading={i === 0 ? "eager" : "lazy"}
          className="aspect-video w-full shrink-0 snap-start rounded-lg object-cover"
        />
      ))}
    </div>
  );
}
