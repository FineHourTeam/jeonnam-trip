// S05 장소 상세 — 분류·사진 → 오늘 영업 + 요일표 → 분위기·목적(주관적 태그) / 확인된 이용 조건(사실) 구분 →
// 위치·연락처 → 출처·항목별 확인일. 저장(보관함)과 일정에 추가를 나란히 두되 다른 동작으로 (S05, PLC-05~08).
import { useState } from "react";
import { Link, useParams } from "react-router";
import { paths } from "@/app/paths";
import { CategoryIcon, VerifyBadge } from "@/components/content-meta";
import { DetailSection, InfoRow, Notice, PhotoGallery } from "@/components/detail-parts";
import { EditIcon, ExternalLinkIcon, NoteIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { PageTopBar, StickyActionBar } from "@/components/page-chrome";
import { Seo } from "@/components/Seo";
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentNotFoundError, placeMetaLine, usePlace } from "@/features/content";
import { SaveButton, SavedPlaceEditSheet, savedIdFor, useSavedPlaces } from "@/features/library";
import { PlaceMap } from "@/features/map";
import { AddToTripSheet, visitFromPlace } from "@/features/trips";
import { safeHref } from "@/lib/url";
import { FACT_LABEL, type FactKey, type Place, type SourceLink } from "@/shared/domain";
import { HoursTable } from "../components/hours-table";

const SOURCE_LABEL: Record<SourceLink["platform"], string> = {
  official: "공식 안내",
  instagram: "인스타그램",
  youtube: "유튜브",
  blog: "블로그",
  other: "출처",
};

function FactsList({ place }: { place: Place }) {
  const known = (Object.keys(FACT_LABEL) as FactKey[]).filter((k) => place.facts[k] !== null);
  if (known.length === 0) {
    return <p className="text-muted-foreground text-sm">주차·예약·반려동물 정보는 아직 확인되지 않았어요.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {known.map((k) => (
        <li
          key={k}
          className={
            place.facts[k]
              ? "bg-success-soft text-success-soft-foreground rounded-lg px-3 py-1.5 text-sm font-medium"
              : "bg-muted text-muted-foreground rounded-lg px-3 py-1.5 text-sm"
          }
        >
          {FACT_LABEL[k]} {place.facts[k] ? "가능" : "불가"}
        </li>
      ))}
    </ul>
  );
}

function MyNote({ place }: { place: Place }) {
  const saved = useSavedPlaces();
  const [open, setOpen] = useState(false);
  const mine = saved.data?.find((s) => s.id === savedIdFor({ kind: "place", placeId: place.id }));
  if (!mine) return null;
  return (
    <DetailSection
      title="내 메모"
      aside={
        <Button variant="ghost" size="touch" onClick={() => { setOpen(true); }}>
          <EditIcon size="sm" />
          고치기
        </Button>
      }
    >
      <div className="bg-background-subtle flex flex-col gap-2 rounded-xl p-4 text-sm">
        {mine.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {mine.tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}
        <p className={mine.memo ? "leading-relaxed whitespace-pre-wrap" : "text-muted-foreground"}>
          {mine.memo || "아직 메모가 없어요. 나만 보는 메모를 남겨 보세요."}
        </p>
      </div>
      <SavedPlaceEditSheet saved={mine} placeName={place.name} open={open} onOpenChange={setOpen} />
    </DetailSection>
  );
}

export default function PlaceDetailPage() {
  const { placeId } = useParams();
  const q = usePlace(placeId);
  const [addOpen, setAddOpen] = useState(false);

  if (q.isPending) {
    return (
      <>
        <PageTopBar fallback={paths.places} />
        <DetailSkeleton />
      </>
    );
  }
  if (q.isError) {
    return (
      <>
        <PageTopBar fallback={paths.places} />
        {q.error instanceof ContentNotFoundError ? (
          <EmptyState
            title="장소를 찾을 수 없어요"
            description="공개가 중지됐거나 주소가 바뀌었을 수 있어요. 이미 담은 코스는 그대로예요."
            action={
              <Button asChild variant="outline" size="touch">
                <Link to={paths.places}>장소 둘러보기</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        )}
      </>
    );
  }

  const p = q.data;
  const sources = p.sources.flatMap((s) => {
    const href = safeHref(s.url);
    return href ? [{ ...s, href }] : [];
  });

  return (
    <div className="flex flex-col pb-28 md:pb-10">
      <Seo title={p.name} description={`${placeMetaLine(p)}${p.address ? ` · ${p.address}` : ""}`} />
      <PageTopBar fallback={paths.places} title={p.name} right={<SaveButton placeId={p.id} placeName={p.name} className="shadow-none" />} />
      <div className="mx-auto w-full max-w-screen-md md:px-4 md:pt-4">
        <PhotoGallery photos={p.photos} alt={p.name} fallbackIcon={<CategoryIcon category={p.category} size="lg" />} />
      </div>
      <div className="mx-auto flex w-full max-w-screen-md flex-col gap-8 px-4 pt-5">
        <header className="flex flex-col gap-2">
          <p className="text-muted-foreground flex items-center gap-1 text-sm">
            <CategoryIcon category={p.category} size="sm" />
            {placeMetaLine(p)}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-balance">{p.name}</h1>
          {p.moods.length + p.purposes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {[...p.moods, ...p.purposes].map((t) => (
                <Badge key={t} variant="secondary">
                  #{t}
                </Badge>
              ))}
              <span className="text-muted-foreground text-xs">운영팀 태그</span>
            </div>
          ) : null}
        </header>

        {p.checks.hours.state === "conflict" ? (
          <Notice tone="warning" title="영업시간 자료가 서로 달라요">
            {p.checks.hours.source ?? "자료를 다시 확인하고 있어요."} 일정의 자동 시간 배정에서는 빼고 수동 후보로 다뤄요.
          </Notice>
        ) : null}

        <DetailSection title="영업시간" aside={<VerifyBadge check={p.checks.hours} />}>
          <HoursTable place={p} />
          {p.checks.hours.source ? <p className="text-muted-foreground text-xs">출처 · {p.checks.hours.source}</p> : null}
        </DetailSection>

        <DetailSection title="이용 조건" aside={<VerifyBadge check={p.checks.info} />}>
          <FactsList place={p} />
        </DetailSection>

        <DetailSection title="위치" aside={<VerifyBadge check={p.checks.location} />}>
          <div className="divide-border divide-y">
            {p.address ? (
              <InfoRow icon={<PinIcon size="sm" />} label="주소">
                {p.address}
              </InfoRow>
            ) : null}
            {p.phone ? (
              <InfoRow icon={<PhoneIcon size="sm" />} label="전화">
                <a href={`tel:${p.phone}`} className="underline-offset-2 hover:underline">
                  {p.phone}
                </a>
              </InfoRow>
            ) : null}
          </div>
          {p.location ? (
            <PlaceMap location={p.location} label={p.name} className="aspect-video w-full" />
          ) : (
            <Notice tone="warning" title="위치가 확인되지 않았어요">
              일정에 담으면 경로 계산에서 빠져요.
            </Notice>
          )}
        </DetailSection>

        {sources.length > 0 ? (
          <DetailSection title="출처">
            <ul className="flex flex-col gap-2">
              {sources.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="border-border hover:bg-background-subtle flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
                  >
                    <NoteIcon size="sm" className="text-muted-foreground shrink-0" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">{s.label ?? SOURCE_LABEL[s.platform]}</span>
                      <span className="text-muted-foreground truncate text-xs">{new URL(s.href).hostname}</span>
                    </span>
                    <ExternalLinkIcon size="sm" className="text-muted-foreground shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </DetailSection>
        ) : null}

        <MyNote place={p} />
      </div>

      <StickyActionBar className="md:mx-auto md:mt-8 md:w-full md:max-w-screen-md md:px-4">
        <SaveButton placeId={p.id} placeName={p.name} variant="inline" size="xl" />
        <Button size="xl" className="flex-1" onClick={() => { setAddOpen(true); }}>
          일정에 추가
        </Button>
      </StickyActionBar>
      <AddToTripSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        items={[visitFromPlace(p)]}
        newTripHref={`${paths.tripNew}?places=${p.id}`}
      />
    </div>
  );
}
