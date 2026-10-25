// S08 크리에이터 코스 상세 — 원문·크리에이터·순서 기준·검수일 → 일차별 장소(휴무·운영 미확인 경고) → 내 여행으로 복사.
// 영상 등장 순서뿐이면 실제 여행 순서로 표현하지 않는다. 원본과 개인 사본을 구분한다 (CRT-01~03).
import { Link, useParams } from "react-router";
import { paths } from "@/app/paths";
import { Notice } from "@/components/detail-parts";
import { ExternalLinkIcon, RouteIcon } from "@/components/icons";
import { PageTopBar, StickyActionBar } from "@/components/page-chrome";
import { Photo } from "@/components/photo";
import { Seo } from "@/components/Seo";
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContentNotFoundError,
  ORDER_BASIS_LABEL,
  PlaceRow,
  useCreatorCourse,
  usePlacesByIds,
} from "@/features/content";
import { safeHref } from "@/lib/url";
import { sigunName, type Place } from "@/shared/domain";
import { formatDateDot, tripLengthLabel } from "@/shared/lib/format";

function hoursWarning(p: Place): string | null {
  if (p.checks.hours.state === "conflict") return "영업시간 정보 상충";
  const all = Object.values(p.hours.weekly);
  if (all.every((r) => r === null)) return "영업시간 확인 필요";
  const closedDays = Object.entries(p.hours.weekly).filter(
    ([, r]) => Array.isArray(r) && r.length === 0,
  );
  if (closedDays.length > 0) {
    const DOW = ["일", "월", "화", "수", "목", "금", "토"];
    return `정기휴무 ${closedDays.map(([d]) => DOW[Number(d)] ?? "").join("·")}`;
  }
  return null;
}

export default function CreatorDetailPage() {
  const { courseId } = useParams();
  const q = useCreatorCourse(courseId);
  const ids = q.data?.days.flatMap((d) => d.items.map((i) => i.placeId)) ?? [];
  const places = usePlacesByIds(ids);

  if (q.isPending) {
    return (
      <>
        <PageTopBar fallback={paths.creators} />
        <DetailSkeleton />
      </>
    );
  }
  if (q.isError) {
    return (
      <>
        <PageTopBar fallback={paths.creators} />
        {q.error instanceof ContentNotFoundError ? (
          <EmptyState
            title="코스를 찾을 수 없어요"
            description="공개가 중지됐거나 주소가 바뀌었을 수 있어요."
            action={
              <Button asChild variant="outline" size="touch">
                <Link to={paths.creators}>코스 둘러보기</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        )}
      </>
    );
  }

  const c = q.data;
  const byId = new Map((places.data ?? []).map((p) => [p.id, p]));
  const cover = byId.get(c.days[0]?.items[0]?.placeId ?? "")?.photos[0];
  const source = safeHref(c.sourceUrl);
  const channel = safeHref(c.creator.channelUrl);

  return (
    <div className="flex flex-col pb-28 md:pb-10">
      <Seo
        title={c.title}
        description={c.summary ?? `${c.creator.name} · ${tripLengthLabel(c.days.length)}`}
      />
      <PageTopBar fallback={paths.creators} title={c.title} />
      <div className="mx-auto w-full max-w-screen-md md:px-4 md:pt-4">
        <Photo
          photo={cover}
          alt={c.title}
          credit="overlay"
          fallbackIcon={<RouteIcon size="lg" />}
          className="aspect-4/3 w-full md:aspect-video md:rounded-xl"
        />
      </div>
      <div className="mx-auto flex w-full max-w-screen-md flex-col gap-8 px-4 pt-5">
        <header className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">
            {[tripLengthLabel(c.days.length), c.siguns.map(sigunName).join("·")].join(" · ")}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-balance">{c.title}</h1>
          <p className="text-sm">
            {channel ? (
              <a
                href={channel}
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium underline-offset-2 hover:underline"
              >
                {c.creator.name}
              </a>
            ) : (
              <span className="font-medium">{c.creator.name}</span>
            )}
            {c.reviewedAt ? (
              <span className="text-muted-foreground">
                {" "}
                · 운영팀 확인 {formatDateDot(c.reviewedAt)}
              </span>
            ) : null}
          </p>
          {c.summary ? (
            <p className="text-muted-foreground leading-relaxed text-pretty">{c.summary}</p>
          ) : null}
          {c.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {c.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  #{t}
                </Badge>
              ))}
            </div>
          ) : null}
          {source ? (
            <Button asChild variant="outline" size="touch" className="self-start">
              <a href={source} target="_blank" rel="noreferrer noopener">
                <ExternalLinkIcon size="sm" />
                원문 보기
              </a>
            </Button>
          ) : null}
        </header>

        <Notice
          tone={c.orderBasis === "video_order" ? "warning" : "info"}
          title={`순서 기준 · ${ORDER_BASIS_LABEL[c.orderBasis]}`}
        >
          {c.orderBasis === "video_order"
            ? "영상에 나온 순서예요. 실제로 이 순서대로 다녀왔는지는 확인되지 않았어요."
            : c.orderBasis === "verified_trip"
              ? "크리에이터가 실제로 다닌 순서를 확인했어요."
              : "운영팀이 이동을 고려해 제안한 순서예요."}{" "}
          복사한 내 코스는 원본과 따로 저장되고, 원본은 바뀌지 않아요.
        </Notice>

        {c.days.map((d) => (
          <section key={d.day} className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">{d.day}일차</h2>
            <ol className="flex flex-col gap-4">
              {d.items.map((it, i) => {
                const p = byId.get(it.placeId);
                const warn = p ? hoursWarning(p) : null;
                return (
                  <li key={`${it.placeId}-${String(i)}`} className="flex items-start gap-3">
                    <span className="bg-primary text-primary-foreground mt-6 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      {p ? (
                        <PlaceRow
                          place={p}
                          note={[warn, it.note].filter(Boolean).join(" · ") || undefined}
                        />
                      ) : places.isPending ? (
                        <div className="text-muted-foreground py-6 text-sm">불러오는 중...</div>
                      ) : (
                        <div className="bg-background-subtle text-muted-foreground rounded-lg p-4 text-sm">
                          공개가 중지된 장소예요. 복사할 때 빠져요.
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      <StickyActionBar className="md:mx-auto md:mt-8 md:w-full md:max-w-screen-md md:px-4">
        <Button asChild size="xl" className="flex-1">
          <Link to={`${paths.tripNew}?creator=${c.id}`}>내 여행으로 복사하기</Link>
        </Button>
      </StickyActionBar>
    </div>
  );
}
