// S01 구역 틀 — 제목 · 전체 보기 링크 · 불러오는 중/실패/빈 결과/가로로 넘기는 카드 목록을 구역마다 따로 보여 준다.
// 다음 카드가 살짝 잘려 보이게(모바일 약 1.3장 · 태블릿 2.3장 · 데스크톱 3.3장) 해서 넘길 수 있음을 알린다.
// 데스크톱(md 이상)은 제목 줄 오른쪽에 이전/다음 버튼을 둔다. 트랙패드 가로 스크롤도 한 장씩 넘긴다.
import { useEffect, useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ChevronRightIcon } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { HomeCardSkeleton } from "./home-card";

/** 카드 한 장 너비 — 75% ≈ 1.3장, 3/7 ≈ 2.3장, 3/10 ≈ 3.3장 */
const ITEM_BASIS = "basis-3/4 sm:basis-3/7 md:basis-3/10";

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
  /** <HomeSectionItem> 목록 */
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
  const [api, setApi] = useState<CarouselApi>();
  const showList = !isPending && !isError && !empty;
  useWheelSwipe(api);

  const header = (
    <div className="flex items-center justify-between gap-2">
      <h2 id={headingId} className="text-lg font-semibold text-balance">
        {title}
      </h2>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" asChild>
          <Link to={moreTo} aria-label={t("section.moreLabel", { title })}>
            {t("section.more")}
            <ChevronRightIcon size="sm" />
          </Link>
        </Button>
        {showList && (
          <div className="hidden gap-1 md:flex">
            <CarouselPrevious className="static my-0" />
            <CarouselNext className="static my-0" />
          </div>
        )}
      </div>
    </div>
  );

  if (showList) {
    return (
      <Carousel
        aria-labelledby={headingId}
        opts={{ align: "start", containScroll: "trimSnaps" }}
        setApi={setApi}
        className="flex flex-col gap-3"
      >
        {header}
        <CarouselContent>{children}</CarouselContent>
      </Carousel>
    );
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      {header}
      {isPending ? (
        <div className="-ml-4 flex overflow-hidden" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`shrink-0 pl-4 ${ITEM_BASIS}`}>
              <HomeCardSkeleton />
            </div>
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
      ) : (
        <div className="bg-background-subtle text-foreground flex flex-col items-center gap-3 rounded-lg px-4 py-8 text-center">
          {empty}
        </div>
      )}
    </section>
  );
}

export function HomeSectionItem({ children }: { children: ReactNode }) {
  return <CarouselItem className={ITEM_BASIS}>{children}</CarouselItem>;
}

/**
 * embla는 마우스 휠·트랙패드 가로 스크롤을 받지 않아, 가로로 민 만큼 한 장씩 넘긴다.
 * 세로 스크롤은 그대로 페이지로 보낸다.
 * ponytail: 한 번 밀면(관성 포함) 한 장만 넘긴다 — 손가락을 따라 붙는 연속 이동이 필요하면 embla-carousel-wheel-gestures 도입.
 */
function useWheelSwipe(api: CarouselApi) {
  useEffect(() => {
    if (!api) return;
    const root = api.rootNode();
    let sum = 0;
    let locked = false;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      // 가로 밀기가 브라우저 뒤로 가기로 넘어가지 않게 막는다
      e.preventDefault();
      clearTimeout(idle);
      idle = setTimeout(() => {
        sum = 0;
        locked = false;
      }, 150);
      if (locked) return;
      sum += e.deltaX;
      if (Math.abs(sum) < 30) return;
      if (sum > 0) api.scrollNext();
      else api.scrollPrev();
      locked = true;
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      clearTimeout(idle);
      root.removeEventListener("wheel", onWheel);
    };
  }, [api]);
}
