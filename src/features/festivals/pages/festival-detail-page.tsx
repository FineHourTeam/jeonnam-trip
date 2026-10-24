// S03 축제 상세 — 상태·기간 → 날짜별 운영 → 프로그램 → 이용 정보·출처·확인일 → 지도 → 주변 장소(직선거리).
// 방문일·프로그램을 골라 "이 축제로 여행 만들기" 또는 "현재 일정에 추가". 취소된 축제는 볼 수 있지만 담을 수 없다 (FES-03~05).
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { paths } from "@/app/paths";
import { CategoryIcon, VerifyBadge } from "@/components/content-meta";
import { DetailSection, InfoRow, Notice, PhotoGallery } from "@/components/detail-parts";
import { GlobeIcon, LockIcon, ParkingIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { PageTopBar, StickyActionBar } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { DetailSkeleton, EmptyState, ErrorState, RowListSkeleton } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import {
  ContentNotFoundError,
  FestivalBadges,
  PlaceRow,
  useFestival,
  usePlaces,
} from "@/features/content";
import { SaveButton } from "@/features/library";
import { PlaceMap } from "@/features/map";
import { AddToTripSheet, visitFromFestival } from "@/features/trips";
import { safeHref } from "@/lib/url";
import { sigunName, type Festival, type VisitItem } from "@/shared/domain";
import { formatDateKo, formatPeriodKo, todayKst } from "@/shared/lib/date";
import { formatDistance, straightDistanceM } from "@/shared/lib/format";
import { dayHoursLabel, festivalVisitDates, VisitDateSheet } from "../components/visit-date-sheet";

function NearbyPlaces({ festival }: { festival: Festival }) {
  const q = usePlaces({ sigun: festival.sigun });
  const origin = festival.location;
  const list = (q.data?.pages.flatMap((p) => p.items) ?? [])
    .filter((p) => p.category !== "lodging")
    .map((p) => ({ p, d: origin && p.location ? straightDistanceM(origin, p.location) : null }))
    .sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity))
    .slice(0, 6);
  return (
    <DetailSection
      title="주변 장소"
      aside={
        <Link to={`${paths.places}?sigun=${festival.sigun}&near=${festival.id}`} className="text-muted-foreground text-sm">
          더 보기
        </Link>
      }
    >
      <p className="text-muted-foreground -mt-1 text-xs">거리는 축제 장소에서 잰 직선거리예요. 실제 이동시간은 코스에서 계산해요.</p>
      {q.isPending ? (
        <RowListSkeleton count={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} className="py-6" />
      ) : list.length === 0 ? (
        <p className="text-muted-foreground text-sm">{sigunName(festival.sigun)}에 등록된 장소가 아직 없어요.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map(({ p, d }) => (
            <PlaceRow
              key={p.id}
              place={p}
              note={d !== null ? `축제에서 직선 ${formatDistance(d)}` : "위치 확인 필요"}
              trailing={<SaveButton placeId={p.id} placeName={p.name} />}
            />
          ))}
        </div>
      )}
    </DetailSection>
  );
}

export default function FestivalDetailPage() {
  const { festivalId } = useParams();
  const navigate = useNavigate();
  const q = useFestival(festivalId);
  const [sheet, setSheet] = useState<null | "new" | "add">(null);
  const [addItems, setAddItems] = useState<{ items: VisitItem[]; date: string } | null>(null);

  if (q.isPending) {
    return (
      <>
        <PageTopBar fallback={paths.festivals} />
        <DetailSkeleton />
      </>
    );
  }
  if (q.isError) {
    return (
      <>
        <PageTopBar fallback={paths.festivals} />
        {q.error instanceof ContentNotFoundError ? (
          <EmptyState
            title="축제를 찾을 수 없어요"
            description="공개가 중지됐거나 주소가 바뀌었을 수 있어요."
            action={
              <Button asChild variant="outline" size="touch">
                <Link to={paths.festivals}>축제 목록 보기</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        )}
      </>
    );
  }

  const f = q.data;
  const today = todayKst();
  const visitDates = festivalVisitDates(f, today);
  const cancelled = f.state === "cancelled";
  const ended = visitDates.length === 0;
  const blockedReason = cancelled
    ? "취소된 축제라 일정에 담을 수 없어요."
    : ended
      ? "끝난 축제라 일정에 담을 수 없어요."
      : null;
  const programsByDate = [...new Set(f.programs.map((p) => p.date))].sort();
  const official = safeHref(f.officialUrl);

  return (
    <div className="flex flex-col pb-28 md:pb-10">
      <Seo title={f.name} description={f.summary ?? `${sigunName(f.sigun)} · ${formatPeriodKo(f.startDate, f.endDate)}`} />
      <PageTopBar fallback={paths.festivals} title={f.name} />
      <div className="mx-auto w-full max-w-screen-md md:px-4 md:pt-4">
        <PhotoGallery photos={f.photos} alt={f.name} fallbackIcon={<CategoryIcon category="festival" size="lg" />} />
      </div>
      <div className="mx-auto flex w-full max-w-screen-md flex-col gap-8 px-4 pt-5">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <FestivalBadges festival={f} />
            <span className="text-muted-foreground text-sm">{sigunName(f.sigun)}</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight text-balance ${cancelled ? "text-muted-foreground line-through" : ""}`}>
            {f.name}
          </h1>
          <p className="text-base font-medium">{formatPeriodKo(f.startDate, f.endDate)}</p>
          {f.summary ? <p className="text-muted-foreground leading-relaxed text-pretty">{f.summary}</p> : null}
        </header>

        {cancelled ? (
          <Notice tone="destructive" title="취소된 축제예요">
            {f.stateNote ? `${f.stateNote} ` : ""}정보는 볼 수 있지만 새 일정에는 담을 수 없어요. 이미 담은 코스는 열 때 안내해요.
          </Notice>
        ) : f.state === "changed" ? (
          <Notice tone="warning" title="일정이 바뀌었어요">
            {f.stateNote ?? "주최 측 안내를 확인해 주세요."}
          </Notice>
        ) : null}

        <DetailSection title="날짜별 운영" aside={<VerifyBadge check={f.checks.schedule} />}>
          <ul className="divide-border border-border divide-y rounded-xl border">
            {f.days.map((d) => (
              <li key={d.date} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className={d.date === today ? "font-semibold" : ""}>
                  {formatDateKo(d.date)}
                  {d.date === today ? " · 오늘" : ""}
                </span>
                <span className={d.ranges ? "text-foreground" : "text-warning-soft-foreground bg-warning-soft rounded-md px-1.5 py-0.5 text-xs"}>
                  {dayHoursLabel(f, d.date)}
                </span>
              </li>
            ))}
          </ul>
          {f.checks.schedule.source ? (
            <p className="text-muted-foreground text-xs">출처 · {f.checks.schedule.source}</p>
          ) : null}
        </DetailSection>

        {programsByDate.length > 0 ? (
          <DetailSection title="프로그램">
            <div className="flex flex-col gap-4">
              {programsByDate.map((date) => (
                <div key={date} className="flex flex-col gap-2">
                  <h3 className="text-muted-foreground text-sm font-semibold">{formatDateKo(date)}</h3>
                  <ul className="flex flex-col gap-2">
                    {f.programs
                      .filter((p) => p.date === date)
                      .sort((a, b) => a.start.localeCompare(b.start))
                      .map((p) => (
                        <li key={p.id} className="border-border flex items-center gap-3 rounded-xl border p-3">
                          <span className="bg-primary-soft text-primary-soft-foreground flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold tabular-nums">
                            <LockIcon size="sm" />
                            {p.start}~{p.end}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">{p.name}</span>
                            {p.place ? <span className="text-muted-foreground text-xs">{p.place}</span> : null}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </DetailSection>
        ) : null}

        <DetailSection title="이용 정보" aside={<VerifyBadge check={f.checks.info} />}>
          <div className="divide-border divide-y">
            {f.address ? (
              <InfoRow icon={<PinIcon size="sm" />} label="장소" aside={<VerifyBadge check={f.checks.location} />}>
                {f.address}
              </InfoRow>
            ) : null}
            {f.parking ? (
              <InfoRow icon={<ParkingIcon size="sm" />} label="주차">
                {f.parking}
              </InfoRow>
            ) : null}
            {f.contact ? (
              <InfoRow icon={<PhoneIcon size="sm" />} label="문의">
                {/^[\d-]+$/.test(f.contact.split(" ")[0] ?? "") ? (
                  <a href={`tel:${f.contact.split(" ")[0] ?? ""}`} className="underline-offset-2 hover:underline">
                    {f.contact}
                  </a>
                ) : (
                  f.contact
                )}
              </InfoRow>
            ) : null}
            {official ? (
              <InfoRow icon={<GlobeIcon size="sm" />} label="공식 안내">
                <a href={official} target="_blank" rel="noreferrer noopener" className="text-primary break-all underline-offset-2 hover:underline">
                  공식 홈페이지에서 보기
                </a>
              </InfoRow>
            ) : null}
          </div>
          {f.checks.info.source ? <p className="text-muted-foreground text-xs">출처 · {f.checks.info.source}</p> : null}
        </DetailSection>

        {f.location ? (
          <DetailSection title="위치">
            <PlaceMap location={f.location} label={f.name} className="aspect-video w-full" />
          </DetailSection>
        ) : (
          <Notice tone="warning" title="위치가 확인되지 않았어요">
            일정에 담으면 경로 계산에서 빠져요.
          </Notice>
        )}

        <NearbyPlaces festival={f} />
      </div>

      <StickyActionBar className="md:mx-auto md:mt-8 md:w-full md:max-w-screen-md md:px-4">
        {blockedReason ? (
          <p className="text-muted-foreground flex h-12 flex-1 items-center justify-center text-sm" role="status">
            {blockedReason}
          </p>
        ) : (
          <>
            <Button variant="outline" size="xl" className="flex-1" onClick={() => { setSheet("add"); }}>
              일정에 추가
            </Button>
            <Button size="xl" className="flex-[1.4]" onClick={() => { setSheet("new"); }}>
              이 축제로 여행 만들기
            </Button>
          </>
        )}
      </StickyActionBar>

      <VisitDateSheet
        festival={f}
        open={sheet !== null}
        onOpenChange={(v) => {
          if (!v) setSheet(null);
        }}
        confirmLabel={sheet === "new" ? "이 날짜로 여행 만들기" : "담을 일정 고르기"}
        onConfirm={(date, programId) => {
          if (sheet === "new") {
            const qs = new URLSearchParams({ festival: f.id, date });
            if (programId) qs.set("program", programId);
            void navigate(`${paths.tripNew}?${qs.toString()}`);
            return;
          }
          setSheet(null);
          setAddItems({ items: [visitFromFestival(f, date, programId)], date });
        }}
      />
      {addItems ? (
        <AddToTripSheet
          open
          onOpenChange={(v) => {
            if (!v) setAddItems(null);
          }}
          items={addItems.items}
          requiredDate={addItems.date}
          newTripHref={`${paths.tripNew}?festival=${f.id}&date=${addItems.date}`}
        />
      ) : null}
    </div>
  );
}
