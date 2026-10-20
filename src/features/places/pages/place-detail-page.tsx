// S05 장소 상세 — 사진·소개·영업시간·이용 정보·위치·출처와 "일정에 추가".
import { Link, useParams } from "react-router";
import { paths } from "@/app/paths";
import { ChevronLeftIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseMap } from "@/features/map";
import { PLACE_CATEGORY_LABEL, sigunName, type Place } from "@/shared/domain";
import { PlaceNotFoundError } from "../api/places-api";
import { PlaceAddToTrip } from "../components/place-add-to-trip";
import { PlaceBasics, PlaceChecks, PlaceHours } from "../components/place-info";
import { usePlace } from "../hooks/use-places";
import { hoursUnknown } from "../lib/hours";

export default function PlaceDetailPage() {
  const { placeId } = useParams();
  const query = usePlace(placeId);

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link to={paths.places}>
          <ChevronLeftIcon size="sm" />
          장소 목록
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
  return (
    <div className="flex flex-col items-start gap-3">
      <Alert variant="destructive">
        <AlertTitle>
          {notFound ? "장소를 찾을 수 없어요" : "장소 정보를 불러오지 못했어요"}
        </AlertTitle>
        <AlertDescription>
          {notFound
            ? "공개가 끝났거나 주소가 잘못된 장소예요."
            : "네트워크 연결을 확인한 뒤 다시 시도해 주세요."}
        </AlertDescription>
      </Alert>
      {!notFound && <Button onClick={onRetry}>다시 시도</Button>}
    </div>
  );
}

function PlaceDetail({ place }: { place: Place }) {
  const unverified = Object.values(place.checks).some((c) => c.state !== "verified");
  const noHours = hoursUnknown(place.hours);
  return (
    <>
      <Seo
        title={place.name}
        description={
          place.summary?.slice(0, 120) ??
          `${sigunName(place.sigun)} ${PLACE_CATEGORY_LABEL[place.category]}`
        }
        image={place.photos[0]}
      />
      <Photos place={place} />

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{PLACE_CATEGORY_LABEL[place.category]}</Badge>
          {place.subcategory && <Badge variant="outline">{place.subcategory}</Badge>}
          {unverified && <Badge variant="outline">미확인 정보 포함</Badge>}
        </div>
        <h1 className="text-xl font-semibold text-balance">{place.name}</h1>
        <p className="text-muted-foreground text-sm">
          {sigunName(place.sigun)}
          {place.area ? ` · ${place.area}` : ""}
        </p>
      </header>

      {place.summary && (
        <p className="leading-relaxed text-pretty whitespace-pre-line">{place.summary}</p>
      )}

      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <PlaceAddToTrip places={[place]} />
        {noHours && (
          <p className="text-muted-foreground text-sm">
            영업시간이 확인되지 않아 코스에서 “영업시간 확인이 필요해요”로 표시돼요.
          </p>
        )}
        {!place.location && (
          <p className="text-muted-foreground text-sm">
            위치가 확인되지 않아 경로 계산에서는 빠져요.
          </p>
        )}
      </div>

      <PlaceHours place={place} />
      <PlaceBasics place={place} />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">위치</h2>
        {place.location ? (
          <CourseMap
            className="aspect-video w-full"
            points={[{ id: place.id, label: place.name, order: 1, location: place.location }]}
            paths={[]}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            위치가 확인되지 않아 지도에 표시하지 않아요.
          </p>
        )}
      </section>

      <PlaceChecks place={place} />
    </>
  );
}

function Photos({ place }: { place: Place }) {
  if (place.photos.length === 0) {
    return (
      <div className="bg-background-subtle text-muted-foreground flex aspect-video w-full items-center justify-center rounded-lg text-sm">
        등록된 사진이 없어요
      </div>
    );
  }
  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto">
      {place.photos.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`${place.name} 사진 ${String(i + 1)}`}
          loading={i === 0 ? "eager" : "lazy"}
          className="aspect-video w-full shrink-0 snap-start rounded-lg object-cover"
        />
      ))}
    </div>
  );
}
