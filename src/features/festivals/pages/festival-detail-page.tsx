// S03 축제 상세 — 취소된 축제도 열람은 되지만 일정 추가는 막는다 (기능명세 §2).
import { Link, useParams } from "react-router";
import { paths } from "@/app/paths";
import { ChevronLeftIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseMap } from "@/features/map";
import { sigunName, type Festival } from "@/shared/domain";
import { todayKst } from "@/shared/lib/date";
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
  const { festivalId } = useParams();
  const query = useFestival(festivalId);

  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-6 px-4 py-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link to={paths.festivals}>
          <ChevronLeftIcon size="sm" />
          축제 목록
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
  return (
    <div className="flex flex-col items-start gap-3">
      <Alert variant="destructive">
        <AlertTitle>
          {notFound ? "축제를 찾을 수 없어요" : "축제 정보를 불러오지 못했어요"}
        </AlertTitle>
        <AlertDescription>
          {notFound
            ? "공개가 끝났거나 주소가 잘못된 축제예요."
            : "네트워크 연결을 확인한 뒤 다시 시도해 주세요."}
        </AlertDescription>
      </Alert>
      {!notFound && <Button onClick={onRetry}>다시 시도</Button>}
    </div>
  );
}

function FestivalDetail({ festival }: { festival: Festival }) {
  const today = todayKst();
  const unverified = festival.checks.schedule.state !== "verified";
  return (
    <>
      <Seo
        title={festival.name}
        description={festival.summary ?? `${sigunName(festival.sigun)} 축제`}
        image={festival.photos[0]}
      />
      <Photos festival={festival} />

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <FestivalStateBadge festival={festival} today={today} />
          {unverified && <Badge variant="outline">미확인</Badge>}
        </div>
        <h1 className="text-xl font-semibold text-balance">{festival.name}</h1>
        <p className="text-muted-foreground text-sm">
          {sigunName(festival.sigun)} · {formatPeriod(festival.startDate, festival.endDate)}
        </p>
      </header>

      {festival.state !== "scheduled" && (
        <Alert variant={festival.state === "cancelled" ? "destructive" : "default"}>
          <AlertTitle>
            {festival.state === "cancelled" ? "취소된 축제예요" : "일정이 바뀐 축제예요"}
          </AlertTitle>
          <AlertDescription>
            {festival.stateNote ??
              (festival.state === "cancelled"
                ? "상세 정보는 볼 수 있지만 일정에 새로 담을 수 없어요."
                : "바뀐 기간과 운영시간을 확인한 뒤 일정에 담아 주세요.")}
          </AlertDescription>
        </Alert>
      )}

      {festival.summary && <p className="leading-relaxed text-pretty">{festival.summary}</p>}

      <FestivalPlanActions festival={festival} today={today} />
      <FestivalHours festival={festival} />
      <FestivalPrograms festival={festival} />
      <FestivalBasics festival={festival} />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">위치</h2>
        {festival.location ? (
          <CourseMap
            className="aspect-video w-full"
            points={[
              { id: festival.id, label: festival.name, order: 1, location: festival.location },
            ]}
            paths={[]}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            위치가 확인되지 않아 지도에 표시하지 않아요.
          </p>
        )}
      </section>

      <FestivalChecks festival={festival} />
    </>
  );
}

function Photos({ festival }: { festival: Festival }) {
  if (festival.photos.length === 0) {
    return (
      <div className="bg-background-subtle text-muted-foreground flex aspect-video w-full items-center justify-center rounded-lg text-sm">
        등록된 사진이 없어요
      </div>
    );
  }
  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto">
      {festival.photos.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`${festival.name} 사진 ${String(i + 1)}`}
          loading={i === 0 ? "eager" : "lazy"}
          className="aspect-video w-full shrink-0 snap-start rounded-lg object-cover"
        />
      ))}
    </div>
  );
}
